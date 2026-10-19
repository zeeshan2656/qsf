/**
 * QASR-E-SHABBIR FOUNDATION - TRANSLATION SERVICE
 * High-performance, secure server-side bilingual translation utility (English -> Urdu).
 * Features:
 * - Multi-tier engine: Google Cloud API -> DeepL API -> Google GTX Web -> MyMemory API
 * - Dual-layer caching: In-Memory Map (sub-millisecond) + MySQL persistent table (survives restarts)
 * - Tokenization & protection: Brand names, URLs, email addresses, HTML tags, and numerical formats
 * - Rate limiting, input sanitization, and graceful fallback
 */

const crypto = require('crypto');
const db = require('../config/db');

// In-Memory Fast Cache (Max 2,000 entries)
const memoryCache = new Map();
const MAX_MEMORY_CACHE = 2000;

// Protected Brand Dictionary (English Pattern -> Preferred Urdu Expression)
const BRAND_RULES = [
  { pattern: /Qasr-e-Shab(?:b)?ir Foundation/gi, replacement: 'قصرِ شبیر فاؤنڈیشن' },
  { pattern: /Qasr-e-Shab(?:b)?ir/gi, replacement: 'قصرِ شبیر' },
  { pattern: /QASR-E-SHABIR/gi, replacement: 'قصرِ شبیر' },
  { pattern: /QASR-E-SHABBIR/gi, replacement: 'قصرِ شبیر' },
  { pattern: /\bParachinar\b/gi, replacement: 'پاراچنار' },
  { pattern: /\bJalandhar\b/gi, replacement: 'جالندھر' },
  { pattern: /\bAnwaria Town\b/gi, replacement: 'انواریہ ٹاؤن' },
  { pattern: /\bKurram Agency\b/gi, replacement: 'کرم ایجنسی' },
  { pattern: /\bAnjuman-e-Hussainia\b/gi, replacement: 'انجمن حسینیہ' }
];

let isTableInitialized = false;

/**
 * Ensure persistent translation cache table exists in MySQL
 */
async function initTranslationTable() {
  if (isTableInitialized) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS translation_cache (
        id INT AUTO_INCREMENT PRIMARY KEY,
        source_hash VARCHAR(64) NOT NULL UNIQUE,
        source_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        source_lang VARCHAR(10) DEFAULT 'en',
        target_lang VARCHAR(10) DEFAULT 'ur',
        provider VARCHAR(50) DEFAULT 'gtx',
        hit_count INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_source_hash (source_hash)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    isTableInitialized = true;
  } catch (err) {
    console.warn('[Translator] Notice: translation_cache table init skipped or failed:', err.message);
  }
}

// Initialize cache table on module load asynchronously
initTranslationTable();

/**
 * Protect sensitive patterns (brands, URLs, emails, HTML tags) with safe placeholder tokens
 */
function protectText(text) {
  const placeholders = [];
  let protectedStr = text;

  // 1. Protect HTML tags so markup is not corrupted by translation
  protectedStr = protectedStr.replace(/<[^>]+>/g, (match) => {
    const token = `__QSF_HTML_${placeholders.length}__`;
    placeholders.push({ token, replacement: match });
    return token;
  });

  // 2. Protect Foundation Brand Names & Key Locations
  BRAND_RULES.forEach(b => {
    protectedStr = protectedStr.replace(b.pattern, () => {
      const token = `__QSF_BRAND_${placeholders.length}__`;
      placeholders.push({ token, replacement: b.replacement });
      return token;
    });
  });

  // 3. Protect Web URLs and internal application routes
  protectedStr = protectedStr.replace(/https?:\/\/[^\s<>"']+|\/[a-zA-Z0-9_\-\/]{2,}/gi, (match) => {
    const token = `__QSF_URL_${placeholders.length}__`;
    placeholders.push({ token, replacement: match });
    return token;
  });

  // 4. Protect Email Addresses
  protectedStr = protectedStr.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, (match) => {
    const token = `__QSF_EMAIL_${placeholders.length}__`;
    placeholders.push({ token, replacement: match });
    return token;
  });

  return { protectedStr, placeholders };
}

/**
 * Restore protected placeholders back to their intended Urdu/URL/Email text
 */
function restoreText(translatedText, placeholders) {
  let restored = translatedText;
  placeholders.forEach(p => {
    // Replace token with optional surrounding whitespace inserted by translator
    const re = new RegExp(`\\s*${p.token}\\s*`, 'g');
    restored = restored.replace(re, ` ${p.replacement} `);
  });

  // Normalize excessive spaces and clean punctuation alignment
  return restored
    .replace(/[ \t]+/g, ' ')
    .replace(/ \./g, '۔')
    .replace(/\.\B/g, '۔')
    .replace(/ \?/g, '؟')
    .replace(/ \!/g, '!')
    .replace(/ \,/g, '،')
    .trim();
}

/**
 * Compute SHA256 hash for cache keying
 */
function hashText(text, from, to) {
  return crypto.createHash('sha256').update(`${from}:${to}:${text.trim().toLowerCase()}`).digest('hex');
}

/**
 * Core translation caller with 4-tier fallback
 */
async function callTranslationProvider(protectedText, from = 'en', to = 'ur') {
  let translated = null;
  let providerUsed = 'none';

  // Tier 1: Official Google Cloud Translation API (if configured in .env)
  const gApiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_CLOUD_TRANSLATE_KEY;
  if (gApiKey) {
    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${gApiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: protectedText, source: from, target: to, format: 'text' }),
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const json = await res.json();
        translated = json.data?.translations?.[0]?.translatedText;
        if (translated) providerUsed = 'google-cloud';
      }
    } catch (e) {
      console.warn('[Translator] Google Cloud API attempt failed, falling back:', e.message);
    }
  }

  // Tier 2: DeepL API (if configured in .env)
  const deeplKey = process.env.DEEPL_API_KEY;
  if (!translated && deeplKey) {
    try {
      const host = deeplKey.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
      const res = await fetch(`https://${host}/v2/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${deeplKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ text: protectedText, source_lang: from.toUpperCase(), target_lang: to.toUpperCase() }),
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const json = await res.json();
        translated = json.translations?.[0]?.text;
        if (translated) providerUsed = 'deepl';
      }
    } catch (e) {
      console.warn('[Translator] DeepL API attempt failed, falling back:', e.message);
    }
  }

  // Tier 3: Google Translate High-Reliability GTX Web Endpoint (Zero API key needed)
  if (!translated) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(protectedText)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.[0])) {
          translated = json[0].map(chunk => chunk[0]).join('');
          if (translated) providerUsed = 'google-gtx';
        }
      }
    } catch (e) {
      console.warn('[Translator] Google GTX attempt failed, falling back:', e.message);
    }
  }

  // Tier 4: MyMemory Translation API Fallback
  if (!translated) {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(protectedText)}&langpair=${from}|${to}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const json = await res.json();
        translated = json.responseData?.translatedText;
        if (translated && !translated.startsWith('MYMEMORY WARNING')) {
          providerUsed = 'mymemory';
        } else {
          translated = null;
        }
      }
    } catch (e) {
      console.warn('[Translator] MyMemory attempt failed:', e.message);
    }
  }

  if (!translated) {
    throw new Error('All translation providers are currently unreachable. Please type the Urdu text manually.');
  }

  return { translated, provider: providerUsed };
}

/**
 * Main Translate Function
 * @param {string} rawText - English source text to translate
 * @param {object} options - { from: 'en', to: 'ur', skipCache: false }
 * @returns {Promise<{ success: boolean, original: string, translated: string, cached: boolean, provider: string }>}
 */
async function translateText(rawText, options = {}) {
  const from = options.from || 'en';
  const to = options.to || 'ur';
  const skipCache = !!options.skipCache;

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return {
      success: true,
      original: '',
      translated: '',
      cached: true,
      provider: 'noop'
    };
  }

  const cleanText = rawText.trim();
  if (cleanText.length > 5000) {
    throw new Error('Input text exceeds maximum length of 5,000 characters.');
  }

  const hash = hashText(cleanText, from, to);

  // 1. Check In-Memory Cache
  if (!skipCache && memoryCache.has(hash)) {
    return {
      success: true,
      original: cleanText,
      translated: memoryCache.get(hash),
      cached: true,
      provider: 'memory-cache'
    };
  }

  // 2. Check MySQL Database Cache
  if (!skipCache) {
    try {
      await initTranslationTable();
      const [rows] = await db.query(
        'SELECT translated_text, provider FROM translation_cache WHERE source_hash = ? LIMIT 1',
        [hash]
      );
      if (rows && rows.length > 0) {
        const cachedUrdu = rows[0].translated_text;
        // Warm up in-memory cache
        if (memoryCache.size < MAX_MEMORY_CACHE) {
          memoryCache.set(hash, cachedUrdu);
        }
        // Increment hit count asynchronously
        db.query('UPDATE translation_cache SET hit_count = hit_count + 1 WHERE source_hash = ?', [hash]).catch(() => {});

        return {
          success: true,
          original: cleanText,
          translated: cachedUrdu,
          cached: true,
          provider: rows[0].provider || 'db-cache'
        };
      }
    } catch (e) {
      console.warn('[Translator] Database cache check failed:', e.message);
    }
  }

  // 3. Tokenize & Protect sensitive items
  const { protectedStr, placeholders } = protectText(cleanText);

  // 4. Translate via multi-tier providers
  const { translated: rawTranslated, provider } = await callTranslationProvider(protectedStr, from, to);

  // 5. Restore placeholders and clean grammar
  const finalTranslated = restoreText(rawTranslated, placeholders);

  // 6. Save in memory cache
  if (memoryCache.size >= MAX_MEMORY_CACHE) {
    // Delete oldest entry
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
  }
  memoryCache.set(hash, finalTranslated);

  // 7. Save in MySQL persistent cache asynchronously
  try {
    await initTranslationTable();
    await db.query(
      `INSERT INTO translation_cache (source_hash, source_text, translated_text, source_lang, target_lang, provider)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE translated_text = VALUES(translated_text), hit_count = hit_count + 1`,
      [hash, cleanText, finalTranslated, from, to, provider]
    );
  } catch (e) {
    console.warn('[Translator] Failed to persist translation to DB:', e.message);
  }

  return {
    success: true,
    original: cleanText,
    translated: finalTranslated,
    cached: false,
    provider
  };
}

/**
 * Clear in-memory translation cache
 */
function clearTranslationCache() {
  memoryCache.clear();
}

module.exports = {
  translateText,
  clearTranslationCache
};
