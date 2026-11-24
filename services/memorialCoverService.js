/**
 * QSF Memorial Cover & Poster Generation Service
 *
 * Generates automated high-resolution memorial banners from authentic uploaded portraits:
 *  1. Background removal using @imgly/background-removal-node (transparent cutout PNG)
 *     + smooth bottom gradient feathering so the torso blends organically into the memorial artwork.
 *  2. 6 distinct memorial templates inspired by the visual references:
 *     - splatter_mountain (Ref 1: Light marble parchment, crimson paint splatter burst, Parachinar mountain ridge, black-gold filigree cartouche, candle & red rose)
 *     - halo_dove         (Ref 2A: Deep ruby crimson glowing halo ring, ascending white dove, comrades silhouette)
 *     - islamic_arch      (Ref 2C: Ornate golden Islamic Mihrab arch, twin hanging lanterns, deep velvet crimson, roses)
 *     - fallen_memorial   (Ref 2D: Dramatic crimson twilight sky, battlefield memorial cross silhouette, glowing candle & rose)
 *     - maroon_ribbon     (Ref 2E: Deep royal maroon satin, folded red memorial ribbon, ascending white doves, double gold border)
 *     - arabesque_plate   (Ref 2F: Deep crimson Islamic arabesque geometric lattice, ornate dark-gold cartouche, tribute silhouette)
 *  3. Generates wide memorial cover banners (1280x520 WebP) in both English (LTR) and Urdu (RTL).
 *  4. Preserves the authentic original photograph permanently untouched.
 *  5. Embeds official QSF Foundation emblem/logo and authentic database fields.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const sharp = require('sharp');

function getBufferShortHash(buf) {
  return crypto.createHash('md5').update(buf).digest('hex').slice(0, 10);
}

function getTemplateBackdropPath(template) {
  const map = {
    splatter_mountain: 'memorial_bg_splatter.webp',
    fallen_memorial: 'memorial_bg_splatter.webp',
    halo_dove: 'memorial_bg_halo.webp',
    maroon_ribbon: 'memorial_bg_halo.webp',
    islamic_arch: 'memorial_bg_velvet.webp',
    arabesque_plate: 'memorial_bg_velvet.webp'
  };
  const file = map[template] || 'memorial_bg_splatter.webp';
  const p1 = path.join(publicMediaDir, 'martyrs', 'backgrounds', file);
  if (fs.existsSync(p1)) return p1;
  const p2 = path.join(mediaDir, 'martyrs', 'backgrounds', file);
  if (fs.existsSync(p2)) return p2;
  return null;
}

function runCutoutWorker(inputAbsPath, tempOutputAbsPath) {
  return new Promise((resolve, reject) => {
    const workerScript = path.resolve(__dirname, 'cutoutWorker.js');
    execFile(
      process.execPath,
      [workerScript, inputAbsPath, tempOutputAbsPath],
      { timeout: 60000, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(stderr || err.message || 'Cutout worker failed'));
        }
        resolve(stdout);
      }
    );
  });
}

const MEMORIAL_TEMPLATES = [
  {
    id: 'splatter_mountain',
    name_en: 'Crimson Splatter & Parachinar Ridge',
    name_ur: 'سرخ رنگ و کوہِ سفید پاراچنار',
    description_en: 'Light marble parchment with dramatic crimson splatter, Parachinar mountain silhouette, black-gold cartouche, candle & red roses.',
    description_ur: 'مرمر پس منظر، سرخ رنگ کی دھار، پاراچنار کے پہاڑ، سنہری نام تختی، شمع اور سرخ گلاب',
    accent: '#B91C1C',
    theme: 'light'
  },
  {
    id: 'halo_dove',
    name_en: 'Crimson Halo & Peace Dove',
    name_ur: 'سرخ ہالہ اور سفید کبوتر',
    description_en: 'Deep ruby gradient with glowing circular halo behind the portrait, ascending white dove, and solemn silhouette.',
    description_ur: 'گہرا سرخ پس منظر، چمکتا ہوا ہالہ، اڑتا ہوا سفید کبوتر اور یادگاری خاکہ',
    accent: '#DC2626',
    theme: 'dark'
  },
  {
    id: 'islamic_arch',
    name_en: 'Islamic Arch & Golden Lanterns',
    name_ur: 'اسلامی محراب اور سنہری قندیلیں',
    description_en: 'Velvet crimson backdrop with ornate golden mihrab arch, twin hanging lanterns, and red memorial roses.',
    description_ur: 'مخملی سرخ پس منظر، سنہری محراب، روشن قندیلیں اور سرخ گلاب',
    accent: '#991B1B',
    theme: 'dark'
  },
  {
    id: 'fallen_memorial',
    name_en: 'Twilight Tribute & Candlelight',
    name_ur: 'شفقِ شہادت اور یادگاری شمع',
    description_en: 'Dramatic crimson twilight sky with memorial tribute silhouette, ascending birds, and glowing candle.',
    description_ur: 'سرخ شفق، یادگاری خاکہ، پرواز کرتے پرندے اور روشن شمع',
    accent: '#7F1D1D',
    theme: 'dark'
  },
  {
    id: 'maroon_ribbon',
    name_en: 'Royal Maroon & Memorial Ribbon',
    name_ur: 'شاہی عنابی اور یادگاری ربن',
    description_en: 'Deep royal maroon satin framed in double gold filigree with folded satin ribbon and ascending doves.',
    description_ur: 'گہرا عنابی پس منظر، سنہری حاشیہ، سرخ ربن اور سفید کبوتر',
    accent: '#6B0F1A',
    theme: 'dark'
  },
  {
    id: 'arabesque_plate',
    name_en: 'Ornate Arabesque & Gold Plate',
    name_ur: 'اسلامی نقوش اور سنہری تختی',
    description_en: 'Intricate crimson Islamic geometric arabesque lattice with ornate dark-gold filigree name plate.',
    description_ur: 'سرخ اسلامی جیومیٹرک نقوش اور نفیس سنہری نام تختی',
    accent: '#881337',
    theme: 'dark'
  }
];

const VALID_TEMPLATE_IDS = new Set(MEMORIAL_TEMPLATES.map(t => t.id));

// Background removal runs in isolated services/cutoutWorker.js child process

// Media root resolution matching middleware/upload.js
function resolveMediaDir() {
  const candidates = [
    path.resolve(__dirname, '../../../../qasreshabbir_media'),
    path.resolve(__dirname, '../../../qasreshabbir_media'),
    path.resolve(process.cwd(), '../../../qasreshabbir_media'),
    path.resolve(process.cwd(), '../../qasreshabbir_media'),
    '/home/u434697879/domains/freehub.live/qasreshabbir_media',
    process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : null,
    path.resolve(__dirname, '../qasreshabbir_media'),
    path.resolve(process.cwd(), '../qasreshabbir_media'),
    path.resolve(process.cwd(), 'qasreshabbir_media'),
    path.resolve(__dirname, '../public/media')
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return path.resolve(process.cwd(), 'public/media');
}

const mediaDir = resolveMediaDir();
const publicMediaDir = path.resolve(process.cwd(), 'public/media');

function ensureDirs() {
  const targets = [
    path.join(mediaDir, 'martyrs', 'cutouts'),
    path.join(mediaDir, 'martyrs', 'covers'),
    path.join(publicMediaDir, 'martyrs', 'cutouts'),
    path.join(publicMediaDir, 'martyrs', 'covers')
  ];
  for (const t of targets) {
    if (!fs.existsSync(t)) {
      try { fs.mkdirSync(t, { recursive: true }); } catch (_) {}
    }
  }
}
ensureDirs();

function dualWriteFileSync(relPath, buffer) {
  const p1 = path.join(mediaDir, relPath);
  const p2 = path.join(publicMediaDir, relPath);
  try {
    fs.mkdirSync(path.dirname(p1), { recursive: true });
    fs.writeFileSync(p1, buffer);
  } catch (e) {
    console.error(`[Memorial] Failed write to ${p1}:`, e.message);
  }
  if (p1 !== p2) {
    try {
      fs.mkdirSync(path.dirname(p2), { recursive: true });
      fs.writeFileSync(p2, buffer);
    } catch (e) {
      console.error(`[Memorial] Failed write to ${p2}:`, e.message);
    }
  }
}

function resolveLocalPathFromUrl(mediaUrl) {
  if (!mediaUrl) return null;
  const raw = String(mediaUrl).trim();
  const isMediaWebUrl = /^\/?media\//i.test(raw);
  if (!isMediaWebUrl && path.isAbsolute(raw) && fs.existsSync(raw)) return raw;
  const clean = raw.replace(/^\/+media\//i, '').replace(/^media\//i, '');
  const c1 = path.join(mediaDir, clean);
  if (fs.existsSync(c1)) return c1;
  const c2 = path.join(publicMediaDir, clean);
  if (fs.existsSync(c2)) return c2;
  const c3 = path.join(mediaDir, 'uploads', path.basename(raw));
  if (fs.existsSync(c3)) return c3;
  const c4 = path.join(mediaDir, 'martyrs', path.basename(raw));
  if (fs.existsSync(c4)) return c4;
  return null;
}

const URDU_MONTHS = [
  'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
  'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
];
const URDU_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toUrduDigits(numStr) {
  return String(numStr).replace(/\d/g, d => URDU_DIGITS[parseInt(d, 10)]);
}

function formatDateUrdu(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = toUrduDigits(d.getDate());
  const month = URDU_MONTHS[d.getMonth()];
  const year = toUrduDigits(d.getFullYear());
  return `\u200F${day} ${month} ${year}`;
}

function formatDateEnglish(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(text, maxLen) {
  if (!text) return '';
  const s = String(text).trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1).trim() + '…';
}

/**
 * 1. Background Removal / Transparent Portrait Cutout Generation
 *    - Normalizes EXIF rotation and scales oversized photos cleanly before segmentation
 *    - Caches cutouts by content hash so existing valid cutouts are reused automatically
 */
async function generateCutout(photoUrlOrPath, martyrId, forceRegenerate = false) {
  ensureDirs();
  const localSourcePath = resolveLocalPathFromUrl(photoUrlOrPath);

  if (!localSourcePath || !fs.existsSync(localSourcePath)) {
    throw new Error(`Original photo file not found: ${photoUrlOrPath}`);
  }

  const rawSourceBuf = fs.readFileSync(localSourcePath);
  const sourceHash = getBufferShortHash(rawSourceBuf);
  const cutoutFileName = `cutout_${martyrId || 'preview'}_${sourceHash}.png`;
  const relPath = path.join('martyrs', 'cutouts', cutoutFileName);
  const existingPath = path.join(mediaDir, relPath);

  if (!forceRegenerate && fs.existsSync(existingPath)) {
    return {
      cutoutUrl: `/media/martyrs/cutouts/${cutoutFileName}`,
      cutoutPath: existingPath,
      sourceHash
    };
  }

  const tempNormInput = path.join(mediaDir, 'martyrs', 'cutouts', `_norm_${Date.now()}_${martyrId || 'p'}.png`);
  const tempRawCutout = path.join(mediaDir, 'martyrs', 'cutouts', `_raw_${Date.now()}_${martyrId || 'p'}.png`);

  try {
    console.log(`[Memorial] Running isolated background removal worker for martyr ${martyrId}: ${localSourcePath}`);

    // Normalize EXIF orientation & bound dimensions cleanly before segmentation
    await sharp(rawSourceBuf)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .png()
      .toFile(tempNormInput);

    await runCutoutWorker(tempNormInput, tempRawCutout);

    const buffer = fs.readFileSync(tempRawCutout);

    // Trim excess transparent whitespace so portrait sizing & framing remain accurate
    const trimmed = await sharp(buffer)
      .ensureAlpha()
      .trim({ threshold: 12 })
      .png({ compressionLevel: 8 })
      .toBuffer();

    dualWriteFileSync(relPath, trimmed);

    return {
      cutoutUrl: `/media/martyrs/cutouts/${cutoutFileName}`,
      cutoutPath: path.join(mediaDir, relPath),
      sourceHash
    };
  } catch (err) {
    console.error(`[Memorial] Background removal fallback triggered:`, err.message);
    const orientedBuf = await sharp(rawSourceBuf)
      .rotate()
      .resize({ width: 1000, height: 1200, fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .png()
      .toBuffer({ resolveWithObject: true });

    const w = orientedBuf.info.width || 600;
    const h = orientedBuf.info.height || 750;
    const maskSvg = `
      <svg width="${w}" height="${h}">
        <defs>
          <radialGradient id="feather" cx="50%" cy="44%" r="48%">
            <stop offset="68%" stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <ellipse cx="${w / 2}" cy="${h * 0.44}" rx="${w * 0.44}" ry="${h * 0.45}" fill="url(#feather)"/>
      </svg>
    `;
    const mask = await sharp(Buffer.from(maskSvg)).png().toBuffer();
    const fallbackBuffer = await sharp(orientedBuf.data)
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toBuffer();

    dualWriteFileSync(relPath, fallbackBuffer);

    return {
      cutoutUrl: `/media/martyrs/cutouts/${cutoutFileName}`,
      cutoutPath: path.join(mediaDir, relPath),
      sourceHash,
      fallbackUsed: true
    };
  } finally {
    try { if (fs.existsSync(tempNormInput)) fs.unlinkSync(tempNormInput); } catch (_) {}
    try { if (fs.existsSync(tempRawCutout)) fs.unlinkSync(tempRawCutout); } catch (_) {}
  }
}

/**
 * Generate clean studio-composited portrait Memorial Card image (640x704 WebP, 4:4.4 aspect ratio)
 * Combines painterly dark-crimson backdrop + proportional uncropped cutout portrait + subtle mist fade
 */
async function generateMemorialCard(cutoutPath, martyrId, template = 'splatter_mountain', sourceHash = 'v1', forceRegenerate = false) {
  if (!cutoutPath || !fs.existsSync(cutoutPath)) return null;
  ensureDirs();

  const tpl = VALID_TEMPLATE_IDS.has(template) ? template : 'splatter_mountain';
  const cardFileName = `martyr_${martyrId || 'preview'}_card_${tpl}_${sourceHash}.webp`;
  const relPath = path.join('martyrs', 'covers', cardFileName);
  const existingPath = path.join(mediaDir, relPath);

  if (!forceRegenerate && fs.existsSync(existingPath)) {
    return `/media/martyrs/covers/${cardFileName}`;
  }

  const cardW = 640;
  const cardH = 704;
  const bgPath = getTemplateBackdropPath(tpl);

  // Proportional portrait framing: ensure head & shoulders fill ~74-78% of card height
  // with ~22-26% headroom above hair, safely handling both tall (3:4) and wide (4:3) headshots.
  const cutoutMeta = await sharp(cutoutPath).metadata();
  const srcW = cutoutMeta.width || 500;
  const srcH = cutoutMeta.height || 500;
  const aspect = srcW / srcH;

  let resizedBuf = await sharp(cutoutPath)
    .ensureAlpha()
    .resize(
      aspect > 1.05
        ? { height: Math.round(cardH * 0.76), withoutEnlargement: false }
        : { width: cardW - 44, height: Math.round(cardH * 0.80), fit: 'inside', withoutEnlargement: false }
    )
    .png()
    .toBuffer();

  let rMeta = await sharp(resizedBuf).metadata();
  if (rMeta.width > cardW) {
    const cropLeft = Math.floor((rMeta.width - cardW) / 2);
    resizedBuf = await sharp(resizedBuf)
      .extract({ left: cropLeft, top: 0, width: cardW, height: rMeta.height })
      .png()
      .toBuffer();
    rMeta = await sharp(resizedBuf).metadata();
  }
  if (rMeta.height > cardH - 80) {
    resizedBuf = await sharp(resizedBuf)
      .resize({ width: cardW, height: cardH - 80, fit: 'inside' })
      .png()
      .toBuffer();
    rMeta = await sharp(resizedBuf).metadata();
  }

  // Apply gentle bottom mist fade (last 18% fades out cleanly)
  const pW = rMeta.width || cardW;
  const pH = rMeta.height || Math.round(cardH * 0.76);
  const fadeMaskSvg = `
    <svg width="${pW}" height="${pH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardPortraitFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
          <stop offset="80%" stop-color="#ffffff" stop-opacity="1"/>
          <stop offset="94%" stop-color="#ffffff" stop-opacity="0.38"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${pW}" height="${pH}" fill="url(#cardPortraitFade)"/>
    </svg>
  `;
  const fadeMaskBuf = await sharp(Buffer.from(fadeMaskSvg)).png().toBuffer();
  const featheredPortraitBuf = await sharp(resizedBuf)
    .composite([{ input: fadeMaskBuf, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const leftPos = Math.max(0, Math.round((cardW - pW) / 2));
  const topPos = Math.max(48, cardH - pH);

  // Soft bottom mist overlay that blends shoulders gently without touching the face
  const mistOverlaySvg = `
    <svg width="${cardW}" height="${cardH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardMist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0A0204" stop-opacity="0.16"/>
          <stop offset="22%" stop-color="#0A0204" stop-opacity="0"/>
          <stop offset="78%" stop-color="#0A0204" stop-opacity="0"/>
          <stop offset="100%" stop-color="#0A0204" stop-opacity="0.58"/>
        </linearGradient>
      </defs>
      <rect width="${cardW}" height="${cardH}" fill="url(#cardMist)"/>
    </svg>
  `;

  let basePipeline = bgPath
    ? sharp(bgPath).resize(cardW, cardH, { fit: 'cover', position: 'center' })
    : sharp({ create: { width: cardW, height: cardH, channels: 4, background: { r: 24, g: 4, b: 8, alpha: 1 } } });

  const cardBuf = await basePipeline
    .composite([
      { input: featheredPortraitBuf, left: leftPos, top: topPos },
      { input: Buffer.from(mistOverlaySvg), left: 0, top: 0 }
    ])
    .webp({ quality: 90 })
    .toBuffer();

  dualWriteFileSync(relPath, cardBuf);
  return `/media/martyrs/covers/${cardFileName}`;
}

/**
 * Feather the bottom edge of a portrait cutout so the torso melts naturally into the banner
 */
async function preparePortraitLayer(cutoutPath, targetHeight = 460, maxWidth = 420) {
  const resizedBuf = await sharp(cutoutPath)
    .ensureAlpha()
    .resize({ width: maxWidth, height: targetHeight, fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  const meta = await sharp(resizedBuf).metadata();
  const w = meta.width || 340;
  const h = meta.height || targetHeight;

  // Apply gentle bottom gradient fade (last 18% fades out cleanly)
  const fadeMaskSvg = `
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
          <stop offset="78%" stop-color="#ffffff" stop-opacity="1"/>
          <stop offset="94%" stop-color="#ffffff" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#bottomFade)"/>
    </svg>
  `;
  const fadeMaskBuf = await sharp(Buffer.from(fadeMaskSvg)).png().toBuffer();

  const featheredBuf = await sharp(resizedBuf)
    .composite([{ input: fadeMaskBuf, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return { buffer: featheredBuf, width: w, height: h };
}

/**
 * 2. Rich SVG Artwork & Vector Elements
 */
const SVG_ASSETS = {
  getLogoBase64() {
    const candidates = [
      path.join(publicMediaDir, 'branding', 'Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.png'),
      path.join(mediaDir, 'branding', 'Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.png'),
      path.join(publicMediaDir, 'branding', 'logo.webp'),
      path.join(mediaDir, 'branding', 'logo.webp')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        const mime = c.endsWith('.png') ? 'image/png' : 'image/webp';
        return `data:${mime};base64,${fs.readFileSync(c).toString('base64')}`;
      }
    }
    return null;
  },

  mountainRidge(w, h, color = '#64748B', opacity = 0.22) {
    return `
      <g fill="${color}" fill-opacity="${opacity}">
        <path d="M0,${h} L0,${h - 115} L90,${h - 155} L175,${h - 120} L260,${h - 190} L350,${h - 140} L460,${h - 215} L570,${h - 150} L670,${h - 195} L780,${h - 130} L900,${h - 205} L1020,${h - 145} L1150,${h - 210} L${w},${h - 165} L${w},${h} Z"/>
        <path d="M0,${h} L0,${h - 75} L120,${h - 115} L240,${h - 85} L380,${h - 145} L510,${h - 95} L650,${h - 135} L800,${h - 80} L960,${h - 145} L1120,${h - 95} L${w},${h - 125} L${w},${h} Z" fill-opacity="${opacity * 1.35}"/>
      </g>
    `;
  },

  // Organic multi-layered crimson paint splatter burst (Reference 1)
  crimsonSplatter(cx, cy) {
    return `
      <g transform="translate(${cx}, ${cy})">
        <!-- Soft radial crimson aura -->
        <circle cx="0" cy="0" r="240" fill="url(#splatterRadial)"/>
        <!-- Organic jagged paint splash silhouette -->
        <path d="M-15,-165 C15,-150 38,-185 62,-158 C88,-132 125,-160 142,-120 C165,-85 215,-98 195,-50 C228,-18 205,28 175,45 C210,82 170,128 130,115 C115,155 68,140 38,162 C5,180 -35,148 -72,165 C-112,175 -132,130 -168,120 C-205,105 -182,55 -215,28 C-235,-5 -188,-35 -195,-72 C-200,-118 -148,-112 -128,-148 C-98,-178 -55,-145 -15,-165 Z" fill="#B91C1C" fill-opacity="0.92"/>
        <path d="M-5,-125 C28,-115 52,-142 78,-112 C110,-90 148,-105 152,-62 C180,-30 165,18 135,38 C160,75 115,105 78,92 C48,125 5,110 -32,128 C-78,132 -95,95 -132,82 C-168,62 -148,12 -170,-22 C-178,-62 -130,-75 -112,-108 C-82,-135 -42,-108 -5,-125 Z" fill="#991B1B" fill-opacity="0.95"/>
        <!-- Dynamic directional streaks -->
        <path d="M125,-95 L235,-165 L220,-145 L145,-75 Z" fill="#DC2626"/>
        <path d="M155,15 L265,38 L245,48 L150,35 Z" fill="#B91C1C"/>
        <path d="M-135,-85 L-245,-145 L-225,-125 L-145,-62 Z" fill="#DC2626"/>
        <path d="M-160,35 L-260,82 L-240,92 L-148,55 Z" fill="#991B1B"/>
        <path d="M60,-145 L115,-225 L105,-205 L75,-135 Z" fill="#B91C1C"/>
        <path d="M-75,-135 L-135,-215 L-118,-198 L-60,-125 Z" fill="#DC2626"/>
        <!-- Fine artistic ink droplets -->
        <circle cx="-225" cy="-70" r="9" fill="#B91C1C"/>
        <circle cx="-250" cy="-35" r="5" fill="#DC2626"/>
        <circle cx="-205" cy="-155" r="7" fill="#991B1B"/>
        <circle cx="-175" cy="145" r="8" fill="#B91C1C"/>
        <circle cx="-235" cy="110" r="4.5" fill="#DC2626"/>
        <circle cx="220" cy="-95" r="10" fill="#B91C1C"/>
        <circle cx="255" cy="-50" r="5.5" fill="#DC2626"/>
        <circle cx="205" cy="-165" r="6" fill="#991B1B"/>
        <circle cx="235" cy="85" r="8" fill="#B91C1C"/>
        <circle cx="185" cy="150" r="6.5" fill="#DC2626"/>
        <circle cx="35" cy="-205" r="7" fill="#B91C1C"/>
        <circle cx="-45" cy="-215" r="5" fill="#DC2626"/>
        <circle cx="150" cy="-195" r="4" fill="#991B1B"/>
        <circle cx="-155" cy="-185" r="4.5" fill="#B91C1C"/>
        <circle cx="275" cy="10" r="4" fill="#DC2626"/>
        <circle cx="-275" cy="25" r="4.5" fill="#991B1B"/>
      </g>
    `;
  },

  // Halo + Dove (Reference 2A)
  haloDove(cx, cy, r = 195) {
    return `
      <g>
        <circle cx="${cx}" cy="${cy}" r="${r + 22}" fill="#DC2626" fill-opacity="0.22" filter="url(#blurStrong)"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#EF4444" stroke-width="5" stroke-opacity="0.85" filter="url(#glow)"/>
        <circle cx="${cx}" cy="${cy}" r="${r - 12}" fill="none" stroke="#FBBF24" stroke-width="2" stroke-opacity="0.7"/>
        <!-- White Peace Dove -->
        <g transform="translate(${cx + r * 0.55}, ${cy - r * 0.85}) scale(0.75)" filter="url(#doveGlow)">
          <path d="M44,28 C33,11 16,5 0,0 C11,13 17,24 20,38 C11,42 2,46 0,55 C13,52 26,48 35,44 C38,53 44,64 55,72 C53,60 51,50 48,42 C60,40 75,33 82,22 C68,24 55,26 44,28 Z" fill="#FFFFFF"/>
          <path d="M44,28 C52,20 62,13 74,10 C67,18 59,24 48,32 Z" fill="#F1F5F9"/>
          <circle cx="75" cy="20" r="1.8" fill="#F59E0B"/>
        </g>
      </g>
    `;
  },

  // Islamic Arch + Hanging Lanterns (Reference 2C)
  islamicArchFrame(cx, h, gold = '#FBBF24') {
    const left = cx - 210;
    const right = cx + 210;
    return `
      <g>
        <path d="M${left},${h} L${left},190 Q${left},90 ${cx - 85},55 Q${cx - 35},38 ${cx},14 Q${cx + 35},38 ${cx + 85},55 Q${right},90 ${right},190 L${right},${h}" fill="none" stroke="${gold}" stroke-width="4" stroke-opacity="0.9" filter="url(#goldGlow)"/>
        <path d="M${left + 12},${h} L${left + 12},192 Q${left + 12},100 ${cx - 78},67 Q${cx - 30},50 ${cx},28 Q${cx + 30},50 ${cx + 78},67 Q${right - 12},100 ${right - 12},192 L${right - 12},${h}" fill="none" stroke="${gold}" stroke-width="1.4" stroke-opacity="0.55" stroke-dasharray="6,4"/>
      </g>
    `;
  },

  hangingLantern(x, y, scale = 0.85, gold = '#FBBF24') {
    return `
      <g transform="translate(${x}, ${y}) scale(${scale})" filter="url(#goldGlow)">
        <line x1="22" y1="0" x2="22" y2="48" stroke="${gold}" stroke-width="2"/>
        <path d="M10,48 Q22,34 34,48 Z" fill="${gold}"/>
        <circle cx="22" cy="34" r="3" fill="${gold}"/>
        <polygon points="10,48 34,48 40,86 4,86" fill="#FEF08A" fill-opacity="0.38" stroke="${gold}" stroke-width="2"/>
        <line x1="22" y1="48" x2="22" y2="86" stroke="${gold}" stroke-width="1.5"/>
        <circle cx="22" cy="68" r="10" fill="#F59E0B" filter="url(#glow)"/>
        <circle cx="22" cy="68" r="4.5" fill="#FFFFFF"/>
        <polygon points="4,86 40,86 32,96 12,96" fill="${gold}"/>
        <polygon points="19,96 25,96 22,112" fill="${gold}"/>
      </g>
    `;
  },

  // Memorial Candle & Deep Red Roses
  candleAndRoses(x, y, scale = 0.9) {
    return `
      <g transform="translate(${x}, ${y}) scale(${scale})">
        <circle cx="35" cy="20" r="34" fill="#F59E0B" fill-opacity="0.35" filter="url(#candleGlow)"/>
        <circle cx="35" cy="20" r="15" fill="#FEF08A" fill-opacity="0.7" filter="url(#blurSmall)"/>
        <path d="M35,3 Q41,17 35,27 Q29,17 35,3 Z" fill="#FFF7ED"/>
        <path d="M35,10 Q38,18 35,24 Q32,18 35,10 Z" fill="#F59E0B"/>
        <line x1="35" y1="26" x2="35" y2="33" stroke="#1E293B" stroke-width="2"/>
        <rect x="20" y="33" width="30" height="92" rx="3" fill="url(#candleWax)" stroke="#FDE68A" stroke-width="1"/>
        <!-- Rose 1 -->
        <g transform="translate(-14, 72) scale(0.95)">
          <path d="M10,64 Q0,52 8,36 Q24,44 18,64 Z" fill="#15803D"/>
          <path d="M68,70 Q84,64 82,48 Q66,54 62,70 Z" fill="#166534"/>
          <circle cx="44" cy="46" r="27" fill="#7F1D1D"/>
          <path d="M28,36 Q44,18 60,36 Q70,52 54,66 Q32,70 24,50 Z" fill="#991B1B"/>
          <path d="M35,40 Q44,28 53,40 Q60,50 48,59 Q38,61 33,48 Z" fill="#DC2626"/>
          <path d="M40,43 Q44,36 48,43 Q51,48 44,52 Z" fill="#EF4444"/>
        </g>
        <!-- Rose 2 -->
        <g transform="translate(26, 90) scale(0.68)">
          <circle cx="44" cy="46" r="25" fill="#7F1D1D"/>
          <path d="M30,36 Q44,22 58,36 Q66,48 54,62 Q36,66 28,48 Z" fill="#B91C1C"/>
          <path d="M39,41 Q44,33 49,41 Q54,48 46,54 Z" fill="#DC2626"/>
        </g>
      </g>
    `;
  },

  // Soldier Memorial Cross Silhouette (Reference 2D)
  soldierCross(x, y, scale = 0.95, color = '#120204') {
    return `
      <g transform="translate(${x}, ${y}) scale(${scale})" fill="${color}">
        <path d="M22,182 L45,182 L48,170 L34,158 L22,158 Z"/>
        <path d="M51,182 L74,182 L77,170 L63,158 L51,158 Z"/>
        <rect x="45" y="42" width="6" height="122" rx="2"/>
        <polygon points="39,78 57,78 55,108 41,108"/>
        <polygon points="37,124 59,124 57,150 39,150"/>
        <path d="M28,44 Q48,18 68,44 Q68,52 28,52 Z"/>
        <ellipse cx="48" cy="48" rx="22" ry="5"/>
        <!-- Ascending birds -->
        <path d="M84,22 Q94,10 104,18 Q95,15 91,25 Z" fill-opacity="0.8"/>
        <path d="M102,38 Q110,30 118,36 Q111,34 108,40 Z" fill-opacity="0.7"/>
        <path d="M116,12 Q123,5 130,11 Q124,9 122,15 Z" fill-opacity="0.6"/>
      </g>
    `;
  },

  // Ornate Filigree Cartouche Name Plate (Reference 1 & 2F)
  cartouchePlate(x, y, w, h, gold = '#FBBF24') {
    return `
      <g transform="translate(${x}, ${y})" filter="url(#goldShadow)">
        <path d="M24,0 L${w - 24},0 Q${w},0 ${w},24 L${w},${h - 24} Q${w},${h} ${w - 24},${h} L24,${h} Q0,${h} 0,${h - 24} L0,24 Q0,0 24,0 Z" fill="#0B0305" stroke="url(#goldGradient)" stroke-width="3.5"/>
        <path d="M28,5 L${w - 28},5 Q${w - 5},5 ${w - 5},28 L${w - 5},${h - 28} Q${w - 5},${h - 5} ${w - 28},${h - 5} L28,${h - 5} Q5,${h - 5} 5,${h - 28} L5,28 Q5,5 28,5 Z" fill="#140407" stroke="${gold}" stroke-width="1.1" stroke-opacity="0.65"/>
        <path d="M10,20 Q20,20 20,10" fill="none" stroke="${gold}" stroke-width="2"/>
        <path d="M${w - 10},20 Q${w - 20},20 ${w - 20},10" fill="none" stroke="${gold}" stroke-width="2"/>
        <path d="M10,${h - 20} Q20,${h - 20} 20,${h - 10}" fill="none" stroke="${gold}" stroke-width="2"/>
        <path d="M${w - 10},${h - 20} Q${w - 20},${h - 20} ${w - 20},${h - 10}" fill="none" stroke="${gold}" stroke-width="2"/>
        <polygon points="${w / 2 - 18},0 ${w / 2},-7 ${w / 2 + 18},0" fill="url(#goldGradient)"/>
        <polygon points="${w / 2 - 18},${h} ${w / 2},${h + 7} ${w / 2 + 18},${h}" fill="url(#goldGradient)"/>
      </g>
    `;
  },

  arabesquePattern(w, h, color = '#F87171', opacity = 0.2) {
    return `
      <pattern id="arabesqueGrid" x="0" y="0" width="76" height="76" patternUnits="userSpaceOnUse">
        <g stroke="${color}" stroke-width="1.2" fill="none" stroke-opacity="${opacity}">
          <rect x="23" y="23" width="30" height="30"/>
          <rect x="23" y="23" width="30" height="30" transform="rotate(45 38 38)"/>
          <circle cx="38" cy="38" r="10"/>
          <path d="M0,0 L23,23 M76,0 L53,23 M0,76 L23,53 M76,76 L53,53"/>
          <circle cx="0" cy="0" r="11"/>
          <circle cx="76" cy="0" r="11"/>
          <circle cx="0" cy="76" r="11"/>
          <circle cx="76" cy="76" r="11"/>
        </g>
      </pattern>
      <rect width="${w}" height="${h}" fill="url(#arabesqueGrid)"/>
    `;
  },

  maroonRibbon(x, y, scale = 0.95) {
    return `
      <g transform="translate(${x}, ${y}) scale(${scale})" filter="url(#ribbonShadow)">
        <path d="M0,0 L52,0 L52,84 L26,68 L0,84 Z" fill="#B91C1C" stroke="#FBBF24" stroke-width="1.5"/>
        <path d="M6,0 L46,0 L46,71 L26,57 L6,71 Z" fill="#7F1D1D"/>
        <circle cx="26" cy="22" r="9" fill="#FBBF24" stroke="#B45309" stroke-width="1"/>
        <polygon points="26,15 28,20 33,20.5 29,24 30,29 26,26.5 22,29 23,24 19,20.5 24,20" fill="#991B1B"/>
      </g>
    `;
  }
};

function getSvgDefs() {
  return `
    <defs>
      <filter id="glow" x="-25%" y="-25%" width="150%" height="150%">
        <feGaussianBlur stdDeviation="9" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#F59E0B" flood-opacity="0.55"/>
      </filter>
      <filter id="goldShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#000000" flood-opacity="0.65"/>
      </filter>
      <filter id="candleGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="14"/>
      </filter>
      <filter id="doveGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="#FFFFFF" flood-opacity="0.6"/>
      </filter>
      <filter id="blurStrong"><feGaussianBlur stdDeviation="32"/></filter>
      <filter id="blurSmall"><feGaussianBlur stdDeviation="4"/></filter>
      <filter id="ribbonShadow">
        <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.65"/>
      </filter>
      <radialGradient id="splatterRadial" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#DC2626" stop-opacity="0.45"/>
        <stop offset="55%" stop-color="#991B1B" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#991B1B" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="vignetteDark" cx="50%" cy="50%" r="72%">
        <stop offset="48%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.72"/>
      </radialGradient>
      <radialGradient id="vignetteLight" cx="50%" cy="50%" r="75%">
        <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#450A0A" stop-opacity="0.22"/>
      </radialGradient>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FEF08A"/>
        <stop offset="50%" stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#B45309"/>
      </linearGradient>
      <linearGradient id="candleWax" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FDE68A"/>
        <stop offset="50%" stop-color="#FFFBEB"/>
        <stop offset="100%" stop-color="#FCD34D"/>
      </linearGradient>
      <linearGradient id="redRibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#991B1B" stop-opacity="0"/>
        <stop offset="12%" stop-color="#B91C1C" stop-opacity="1"/>
        <stop offset="88%" stop-color="#B91C1C" stop-opacity="1"/>
        <stop offset="100%" stop-color="#991B1B" stop-opacity="0"/>
      </linearGradient>
    </defs>
  `;
}

/**
 * Compute portrait center X and text box bounds consistently for both SVG and Sharp composite
 */
function computeLayoutGeometry(width, height, lang, portraitPos) {
  const isUr = lang === 'ur';
  // Default: portrait on LEFT for Urdu (so RTL text sits naturally on the right),
  // and portrait on RIGHT for English (so LTR text sits naturally on the left).
  let side = portraitPos;
  if (!['left', 'right'].includes(side)) {
    side = isUr ? 'left' : 'right';
  }

  if (side === 'left') {
    return {
      portraitSide: 'left',
      portraitCx: Math.round(width * 0.25),
      portraitCy: Math.round(height * 0.54),
      textLeft: Math.round(width * 0.45),
      textRight: width - 55,
      textWidth: Math.round(width * 0.50)
    };
  }
  return {
    portraitSide: 'right',
    portraitCx: Math.round(width * 0.75),
    portraitCy: Math.round(height * 0.54),
    textLeft: 55,
    textRight: Math.round(width * 0.55),
    textWidth: Math.round(width * 0.50)
  };
}

/**
 * 3. Build Background + Typography SVG Layer
 */
function buildCoverSvg({
  width = 1280,
  height = 520,
  template = 'splatter_mountain',
  lang = 'ur',
  portraitPos = 'center',
  martyr,
  logoBase64 = null
}) {
  const isUr = lang === 'ur';
  const tplId = VALID_TEMPLATE_IDS.has(template) ? template : 'splatter_mountain';
  const isLight = false;
  const geom = computeLayoutGeometry(width, height, lang, portraitPos);

  const fullName = truncateText(isUr ? (martyr.full_name_ur || martyr.full_name) : martyr.full_name, 42);
  const fatherName = truncateText(isUr ? (martyr.father_name_ur || martyr.father_name) : martyr.father_name, 38);
  const dateStr = isUr ? formatDateUrdu(martyr.date_of_martyrdom) : formatDateEnglish(martyr.date_of_martyrdom);
  const placeStr = truncateText(isUr ? (martyr.place_of_martyrdom_ur || martyr.place_of_martyrdom) : martyr.place_of_martyrdom, 36);
  const warStr = truncateText(isUr ? (martyr.war_name_ur || martyr.war_name) : martyr.war_name, 54);

  // High-contrast light typography over painterly dark-crimson memorial textures
  const titleColor = '#FBBF24';
  const orgColor = '#E2E8F0';
  const verseColor = '#F8FAFC';
  const labelColor = '#CBD5E1';
  const valueColor = '#FFFFFF';
  const warColor = '#FDE047';

  let bgFill = '';
  let decorElements = '';

  switch (tplId) {
    case 'halo_dove':
      bgFill = `
        <rect width="${width}" height="${height}" fill="#170306" fill-opacity="0.32"/>
      `;
      decorElements = `
        ${SVG_ASSETS.haloDove(geom.portraitCx, geom.portraitCy - 18, 198)}
        ${SVG_ASSETS.mountainRidge(width, height, '#0E0204', 0.55)}
      `;
      break;

    case 'islamic_arch':
      bgFill = `<rect width="${width}" height="${height}" fill="#140204" fill-opacity="0.32"/>`;
      decorElements = `
        ${SVG_ASSETS.islamicArchFrame(geom.portraitCx, height, '#FBBF24')}
        ${SVG_ASSETS.hangingLantern(geom.portraitCx - 235, 16, 0.78)}
        ${SVG_ASSETS.hangingLantern(geom.portraitCx + 195, 16, 0.78)}
        ${SVG_ASSETS.candleAndRoses(geom.portraitSide === 'left' ? width - 115 : 28, height - 165, 0.85)}
      `;
      break;

    case 'fallen_memorial':
      bgFill = `<rect width="${width}" height="${height}" fill="#1C0508" fill-opacity="0.32"/>`;
      decorElements = `
        ${SVG_ASSETS.soldierCross(geom.portraitSide === 'left' ? width - 155 : 22, height - 200, 0.92, '#100204')}
        ${SVG_ASSETS.candleAndRoses(geom.portraitSide === 'left' ? 20 : width - 125, height - 158, 0.86)}
        ${SVG_ASSETS.mountainRidge(width, height, '#0D0204', 0.65)}
      `;
      break;

    case 'maroon_ribbon':
      bgFill = `<rect width="${width}" height="${height}" fill="#1C0407" fill-opacity="0.32"/>`;
      decorElements = `
        ${SVG_ASSETS.maroonRibbon(geom.portraitSide === 'left' ? 28 : width - 80, 18, 0.92)}
        <rect x="16" y="16" width="${width - 32}" height="${height - 32}" fill="none" stroke="#F59E0B" stroke-width="1.6" stroke-opacity="0.65"/>
        <rect x="22" y="22" width="${width - 44}" height="${height - 44}" fill="none" stroke="#F59E0B" stroke-width="0.9" stroke-opacity="0.4"/>
      `;
      break;

    case 'arabesque_plate':
      bgFill = `<rect width="${width}" height="${height}" fill="#180306" fill-opacity="0.32"/>`;
      decorElements = `
        ${SVG_ASSETS.arabesquePattern(width, height, '#F87171', 0.22)}
        ${SVG_ASSETS.mountainRidge(width, height, '#100204', 0.55)}
      `;
      break;

    case 'splatter_mountain':
    default:
      // Painterly deep crimson/obsidian splatter + subtle Parachinar mountain ridge + candle & roses
      bgFill = `
        <rect width="${width}" height="${height}" fill="#140305" fill-opacity="0.35"/>
      `;
      decorElements = `
        ${SVG_ASSETS.mountainRidge(width, height, '#090103', 0.45)}
        <circle cx="${geom.portraitCx}" cy="${geom.portraitCy - 18}" r="215" fill="url(#splatterRadial)"/>
        ${SVG_ASSETS.candleAndRoses(geom.portraitSide === 'left' ? 18 : width - 122, height - 160, 0.92)}
      `;
      break;
  }

  // Official QSF Logo placement + Header Branding
  const textBoxCenterX = Math.round((geom.textLeft + geom.textRight) / 2);
  const logoSize = 62;
  const logoX = isUr ? (geom.textRight - logoSize) : geom.textLeft;
  const logoY = 30;
  const logoImageTag = logoBase64
    ? `<image href="${logoBase64}" x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}"/>`
    : '';

  const headerTitle = isUr ? 'شہداءِ ملت' : 'MARTYRS OF THE NATION';
  const orgSub = isUr ? 'قصرِ شبیر فاؤنڈیشن' : 'QASR-E-SHABBIR FOUNDATION';

  const headerBlock = isUr
    ? `
      <g transform="translate(${geom.textRight - logoSize - 16}, 42)" text-anchor="start">
        <text x="0" y="24" fill="${titleColor}" font-size="30" font-weight="bold" direction="rtl" font-family="'Segoe UI', Tahoma, Arial, serif">${headerTitle}</text>
        <text x="0" y="48" fill="${orgColor}" font-size="14" direction="rtl" font-family="'Segoe UI', Tahoma, Arial, sans-serif">${orgSub}</text>
      </g>
    `
    : `
      <g transform="translate(${geom.textLeft + logoSize + 14}, 42)" text-anchor="start">
        <text x="0" y="24" fill="${titleColor}" font-size="25" font-weight="bold" font-family="Georgia, 'Times New Roman', serif" letter-spacing="1.4">${headerTitle}</text>
        <text x="0" y="46" fill="${orgColor}" font-size="12" font-weight="bold" font-family="'Segoe UI', Arial, sans-serif" letter-spacing="2">${orgSub}</text>
      </g>
    `;

  // Calligraphic Verse
  const verseBlock = isUr
    ? `
      <g transform="translate(${geom.textRight}, 116)" text-anchor="start">
        <text x="0" y="0" fill="${verseColor}" font-size="18" font-weight="bold" direction="rtl" font-family="'Segoe UI', Tahoma, Arial, serif">\u200Fان کے لہو سے روشن ہے وطن کی تاریخ</text>
        <line x1="-290" y1="10" x2="0" y2="10" stroke="#DC2626" stroke-width="2"/>
      </g>
    `
    : `
      <g transform="translate(${geom.textLeft}, 118)" text-anchor="start">
        <text x="0" y="0" fill="${verseColor}" font-size="15.5" font-style="italic" font-family="Georgia, serif">"Their sacrifice illuminates the history of our homeland"</text>
        <line x1="0" y1="10" x2="340" y2="10" stroke="#DC2626" stroke-width="2"/>
      </g>
    `;

  // Martyr Name Cartouche Plate
  const cartoucheW = Math.min(geom.textWidth, 580);
  const cartoucheX = isUr ? (geom.textRight - cartoucheW) : geom.textLeft;
  const cartoucheY = 142;
  const cartoucheH = fatherName ? 104 : 84;

  const namePlateSvg = `
    ${SVG_ASSETS.cartouchePlate(cartoucheX, cartoucheY, cartoucheW, cartoucheH, '#FBBF24')}
    <g transform="translate(${cartoucheX + cartoucheW / 2}, ${cartoucheY + (fatherName ? 48 : 50)})" text-anchor="middle">
      <text x="0" y="0" fill="#FFFFFF" font-size="${isUr ? 32 : 28}" font-weight="bold" ${isUr ? 'direction="rtl"' : ''} font-family="${isUr ? "'Segoe UI', Tahoma, Arial, serif" : "Georgia, 'Times New Roman', serif"}" filter="url(#goldShadow)">${escapeXml(isUr ? `\u200F${fullName}` : fullName)}</text>
      ${fatherName ? `<text x="0" y="34" fill="#FBBF24" font-size="${isUr ? 16 : 14.5}" ${isUr ? 'direction="rtl"' : 'font-style="italic"'} font-family="${isUr ? "'Segoe UI', Tahoma, Arial, sans-serif" : 'Georgia, serif'}">${escapeXml(isUr ? `\u200Fولد: ${fatherName}` : `Son of: ${fatherName}`)}</text>` : ''}
    </g>
  `;

  // Details Grid (Date, Place, Associated Conflict)
  const detailsY = cartoucheY + cartoucheH + 30;
  const halfW = Math.round(cartoucheW / 2);

  const detailsBlock = isUr
    ? `
      <g transform="translate(0, ${detailsY})">
        <!-- Date (Right column for RTL) -->
        <g transform="translate(${cartoucheX + cartoucheW}, 0)" text-anchor="start">
          <rect x="-24" y="0" width="22" height="22" rx="3" fill="none" stroke="${titleColor}" stroke-width="2"/>
          <line x1="-24" y1="7" x2="-2" y2="7" stroke="${titleColor}" stroke-width="2"/>
          <circle cx="-18" cy="14" r="1.5" fill="#DC2626"/>
          <circle cx="-13" cy="14" r="1.5" fill="#DC2626"/>
          <circle cx="-8" cy="14" r="1.5" fill="#DC2626"/>
          <text x="-34" y="10" fill="${labelColor}" font-size="13" font-weight="bold" direction="rtl" font-family="'Segoe UI', Tahoma, sans-serif">\u200Fتاریخِ شہادت</text>
          <text x="-34" y="32" fill="${valueColor}" font-size="17.5" font-weight="bold" direction="rtl" font-family="'Segoe UI', Tahoma, serif">${escapeXml(dateStr || '\u200Fتاریخی ریکارڈ')}</text>
        </g>
        <!-- Place (Left column for RTL) -->
        <g transform="translate(${cartoucheX + halfW - 10}, 0)" text-anchor="start">
          <path d="M-12,0 C-17.5,0 -22,4.5 -22,10 C-22,17.5 -12,24 -12,24 C-12,24 -2,17.5 -2,10 C-2,4.5 -6.5,0 -12,0 Z" fill="#DC2626"/>
          <circle cx="-12" cy="9" r="3.8" fill="#FFFFFF"/>
          <text x="-32" y="10" fill="${labelColor}" font-size="13" font-weight="bold" direction="rtl" font-family="'Segoe UI', Tahoma, sans-serif">\u200Fمقامِ شہادت</text>
          <text x="-32" y="32" fill="${valueColor}" font-size="17" font-weight="bold" direction="rtl" font-family="'Segoe UI', Tahoma, serif">${escapeXml(placeStr ? `\u200F${placeStr}` : '\u200Fضلع کرم')}</text>
        </g>
        ${warStr ? `
          <g transform="translate(${cartoucheX + cartoucheW}, 60)" text-anchor="start">
            <text x="0" y="10" fill="${labelColor}" font-size="12.5" font-weight="bold" direction="rtl" font-family="'Segoe UI', Tahoma, sans-serif">\u200Fسانحہ / معرکہ</text>
            <text x="0" y="32" fill="${warColor}" font-size="16" font-weight="bold" direction="rtl" font-family="'Segoe UI', Tahoma, serif">${escapeXml(`\u200F${warStr}`)}</text>
          </g>
        ` : ''}
      </g>
    `
    : `
      <g transform="translate(0, ${detailsY})" text-anchor="start">
        <!-- Date -->
        <g transform="translate(${cartoucheX + 6}, 0)">
          <rect x="0" y="0" width="21" height="21" rx="3" fill="none" stroke="${titleColor}" stroke-width="2"/>
          <line x1="0" y1="7" x2="21" y2="7" stroke="${titleColor}" stroke-width="2"/>
          <circle cx="5.5" cy="13.5" r="1.5" fill="#DC2626"/>
          <circle cx="10.5" cy="13.5" r="1.5" fill="#DC2626"/>
          <circle cx="15.5" cy="13.5" r="1.5" fill="#DC2626"/>
          <text x="30" y="9" fill="${labelColor}" font-size="12" font-weight="bold" font-family="'Segoe UI', Arial, sans-serif">Date of Martyrdom</text>
          <text x="30" y="29" fill="${valueColor}" font-size="16.5" font-weight="bold" font-family="'Segoe UI', Arial, sans-serif">${escapeXml(dateStr || 'Historical Record')}</text>
        </g>
        <!-- Place -->
        <g transform="translate(${cartoucheX + halfW + 10}, 0)">
          <path d="M9,0 C4,0 0,4 0,9 C0,15.5 9,22 9,22 C9,22 18,15.5 18,9 C18,4 14,0 9,0 Z" fill="#DC2626"/>
          <circle cx="9" cy="8" r="3.5" fill="#FFFFFF"/>
          <text x="27" y="9" fill="${labelColor}" font-size="12" font-weight="bold" font-family="'Segoe UI', Arial, sans-serif">Place of Martyrdom</text>
          <text x="27" y="29" fill="${valueColor}" font-size="16" font-weight="bold" font-family="'Segoe UI', Arial, sans-serif">${escapeXml(placeStr || 'Kurram District')}</text>
        </g>
        ${warStr ? `
          <g transform="translate(${cartoucheX + 6}, 58)">
            <text x="0" y="9" fill="${labelColor}" font-size="12" font-weight="bold" font-family="'Segoe UI', Arial, sans-serif">Associated Conflict</text>
            <text x="0" y="29" fill="${warColor}" font-size="15" font-weight="bold" font-family="'Segoe UI', Arial, sans-serif">${escapeXml(warStr)}</text>
          </g>
        ` : ''}
      </g>
    `;

  // Bottom Salute Ribbon
  const saluteText = isUr ? '\u200Fسلام اس بہادر بیٹے کو' : 'Salute to the Brave Son';
  const saluteW = 360;
  const saluteX = Math.round(cartoucheX + (cartoucheW - saluteW) / 2);
  const saluteY = height - 58;

  const saluteBlock = `
    <g transform="translate(${saluteX}, ${saluteY})">
      <rect x="0" y="0" width="${saluteW}" height="38" rx="6" fill="url(#redRibbonGrad)"/>
      <line x1="28" y1="0" x2="${saluteW - 28}" y2="0" stroke="#FBBF24" stroke-width="1.5"/>
      <line x1="28" y1="38" x2="${saluteW - 28}" y2="38" stroke="#FBBF24" stroke-width="1.5"/>
      <text x="${saluteW / 2}" y="25" fill="#FFFFFF" font-size="${isUr ? 19 : 15}" font-weight="bold" text-anchor="middle" ${isUr ? 'direction="rtl"' : ''} font-family="${isUr ? "'Segoe UI', Tahoma, serif" : "Georgia, serif"}" letter-spacing="${isUr ? 0 : 1}">${escapeXml(saluteText)}</text>
    </g>
  `;

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      ${getSvgDefs()}
      ${bgFill}
      ${decorElements}
      ${logoImageTag}
      ${headerBlock}
      ${verseBlock}
      ${namePlateSvg}
      ${detailsBlock}
      ${saluteBlock}
      <rect width="${width}" height="${height}" fill="url(#${isLight ? 'vignetteLight' : 'vignetteDark'})" pointer-events="none"/>
      <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="${isLight ? '#991B1B' : '#7F1D1D'}" stroke-width="1.6" stroke-opacity="0.7"/>
    </svg>
  `;
}

/**
 * 4. Composite Cutout Portrait with SVG Canvas into Final English & Urdu Cover Banners
 */
async function generateMemorialCover(martyr, options = {}) {
  ensureDirs();
  const martyrId = martyr.id || 'preview';
  const template = VALID_TEMPLATE_IDS.has(options.template || martyr.cover_template)
    ? (options.template || martyr.cover_template)
    : 'splatter_mountain';
  const portraitPos = ['left', 'center', 'right'].includes(options.portraitPos || martyr.cover_portrait_pos)
    ? (options.portraitPos || martyr.cover_portrait_pos)
    : 'center';
  const forceRegenerate = !!options.forceRegenerate;
  const suffix = options.isPreview ? `_preview_${Date.now()}` : `_${template}_${Date.now()}`;

  // 1. Resolve or generate transparent portrait cutout + studio memorial card portrait
  let cutoutPath = null;
  let cutoutUrl = martyr.cutout_photo_url || null;
  let sourceHash = 'v1';

  if (cutoutUrl && !forceRegenerate) {
    cutoutPath = resolveLocalPathFromUrl(cutoutUrl);
    if (cutoutPath && fs.existsSync(cutoutPath)) {
      sourceHash = getBufferShortHash(fs.readFileSync(cutoutPath));
    }
  }
  if (!cutoutPath && martyr.profile_photo_url) {
    try {
      const res = await generateCutout(martyr.profile_photo_url, martyrId, forceRegenerate);
      cutoutPath = res.cutoutPath;
      cutoutUrl = res.cutoutUrl;
      sourceHash = res.sourceHash || sourceHash;
    } catch (e) {
      console.warn(`[Memorial] Could not generate cutout for martyr ${martyrId}:`, e.message);
    }
  }

  let cardUrl = null;
  if (cutoutPath && fs.existsSync(cutoutPath)) {
    try {
      cardUrl = await generateMemorialCard(cutoutPath, martyrId, template, sourceHash, forceRegenerate);
    } catch (cardErr) {
      console.warn(`[Memorial] Could not generate memorial card for martyr ${martyrId}:`, cardErr.message);
    }
  }

  const width = 1280;
  const height = 520;
  const logoBase64 = SVG_ASSETS.getLogoBase64();
  const bgTexturePath = getTemplateBackdropPath(template);

  // Prepare feathered portrait layer once
  let portraitLayer = null;
  if (cutoutPath && fs.existsSync(cutoutPath)) {
    try {
      portraitLayer = await preparePortraitLayer(cutoutPath, 465, 430);
    } catch (e) {
      console.warn(`[Memorial] Could not prepare portrait layer:`, e.message);
    }
  }

  async function renderVariant(lang) {
    const geom = computeLayoutGeometry(width, height, lang, portraitPos);
    const svgStr = buildCoverSvg({
      width,
      height,
      template,
      lang,
      portraitPos,
      martyr,
      logoBase64
    });

    const layers = [{ input: Buffer.from(svgStr), top: 0, left: 0 }];

    if (portraitLayer) {
      const leftPos = Math.max(0, Math.min(width - portraitLayer.width, Math.round(geom.portraitCx - portraitLayer.width / 2)));
      const topPos = Math.max(18, height - portraitLayer.height);
      layers.push({
        input: portraitLayer.buffer,
        left: leftPos,
        top: topPos
      });
    }

    const baseBg = { r: 20, g: 3, b: 6, alpha: 1 };
    const canvasPipeline = bgTexturePath
      ? sharp(bgTexturePath).resize(width, height, { fit: 'cover', position: 'center' })
      : sharp({ create: { width, height, channels: 4, background: baseBg } });

    const outBuf = await canvasPipeline
      .composite(layers)
      .webp({ quality: 90 })
      .toBuffer();

    const fileName = `martyr_${martyrId}_cover_${lang}${suffix}.webp`;
    const relPath = path.join('martyrs', 'covers', fileName);
    dualWriteFileSync(relPath, outBuf);
    return `/media/martyrs/covers/${fileName}`;
  }

  const [coverUrlUr, coverUrlEn] = await Promise.all([
    renderVariant('ur'),
    renderVariant('en')
  ]);

  return {
    success: true,
    cardUrl,
    coverUrlEn,
    coverUrlUr,
    cutoutUrl,
    template,
    portraitPos
  };
}

module.exports = {
  MEMORIAL_TEMPLATES,
  VALID_TEMPLATE_IDS,
  generateCutout,
  generateMemorialCard,
  generateMemorialCover,
  buildCoverSvg,
  SVG_ASSETS,
  resolveLocalPathFromUrl,
  formatDateUrdu,
  formatDateEnglish
};
