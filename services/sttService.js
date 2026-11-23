/**
 * QSF Video Studio – Secure Server-Side Speech-to-Text & Subtitle Translation Engine
 * Supports:
 *  - Cloud AI (when server .env keys are set): GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY
 *  - Local Offline AI Whisper (zero API key required): @huggingface/transformers (Urdu + English)
 *  - Separate Urdu <-> English Subtitle Translation (never runs automatically on transcription)
 */
const path = require('path');
const fs = require('fs');

const URDU_ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const DEVANAGARI_RE = /[\u0900-\u097F]/;

let localWhisperPromise = null;
let localWhisperModelName = process.env.LOCAL_WHISPER_MODEL || 'onnx-community/whisper-base';

function getSttCapabilities() {
  const providers = [];
  if (process.env.GROQ_API_KEY) providers.push('groq_whisper');
  if (process.env.OPENAI_API_KEY) providers.push('openai_whisper');
  if (process.env.GEMINI_API_KEY) providers.push('gemini_audio');
  let localAvailable = false;
  try {
    require.resolve('@huggingface/transformers');
    localAvailable = true;
    providers.push('local_whisper');
  } catch (_) {}

  const activeEngine = providers[0] || 'unavailable';
  const labels = {
    groq_whisper: 'Groq Whisper Large v3 (Cloud)',
    openai_whisper: 'OpenAI Whisper-1 (Cloud)',
    gemini_audio: 'Google Gemini Audio AI (Cloud)',
    local_whisper: `Local Offline Whisper AI (${localWhisperModelName})`,
    unavailable: 'No STT engine configured'
  };

  return {
    available: providers.length > 0,
    activeEngine,
    activeEngineLabel: labels[activeEngine] || activeEngine,
    providers,
    localWhisperInstalled: localAvailable,
    supportedLanguages: [
      { code: 'auto', label: 'Auto Detect (Urdu / English)' },
      { code: 'ur', label: 'Urdu (اردو)' },
      { code: 'en', label: 'English' }
    ]
  };
}

/**
 * Parse a 16-bit PCM or 32-bit IEEE Float WAV buffer into mono 16kHz Float32Array.
 */
function parseWavToMono16k(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44) {
    throw new Error('Invalid WAV audio chunk.');
  }
  const riff = buffer.toString('ascii', 0, 4);
  const wave = buffer.toString('ascii', 8, 12);
  if (riff !== 'RIFF' || wave !== 'WAVE') {
    throw new Error('Uploaded audio chunk must be a valid WAV file.');
  }

  let offset = 12;
  let audioFormat = 1;
  let numChannels = 1;
  let sampleRate = 16000;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const bodyStart = offset + 8;
    if (chunkId === 'fmt ' && bodyStart + 16 <= buffer.length) {
      audioFormat = buffer.readUInt16LE(bodyStart);
      numChannels = buffer.readUInt16LE(bodyStart + 2);
      sampleRate = buffer.readUInt32LE(bodyStart + 4);
      bitsPerSample = buffer.readUInt16LE(bodyStart + 14);
    } else if (chunkId === 'data') {
      dataOffset = bodyStart;
      dataSize = Math.min(chunkSize, buffer.length - bodyStart);
      break;
    }
    offset = bodyStart + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0 || dataSize <= 0) {
    throw new Error('WAV chunk contains no audio data.');
  }

  const bytesPerSample = Math.max(1, bitsPerSample / 8);
  const frameSize = bytesPerSample * numChannels;
  const totalFrames = Math.floor(dataSize / frameSize);
  const mono = new Float32Array(totalFrames);

  for (let i = 0; i < totalFrames; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const pos = dataOffset + i * frameSize + ch * bytesPerSample;
      let sample = 0;
      if (audioFormat === 3 && bitsPerSample === 32) {
        sample = buffer.readFloatLE(pos);
      } else if (bitsPerSample === 16) {
        sample = buffer.readInt16LE(pos) / 32768;
      } else if (bitsPerSample === 8) {
        sample = (buffer.readUInt8(pos) - 128) / 128;
      } else if (bitsPerSample === 24) {
        let v = buffer.readUInt8(pos) | (buffer.readUInt8(pos + 1) << 8) | (buffer.readInt8(pos + 2) << 16);
        sample = v / 8388608;
      }
      sum += sample;
    }
    mono[i] = sum / numChannels;
  }

  if (sampleRate === 16000) return { samples: mono, sampleRate: 16000, duration: totalFrames / 16000 };

  // Linear resample to 16000 Hz
  const ratio = sampleRate / 16000;
  const outLen = Math.max(1, Math.floor(totalFrames / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcIdx = i * ratio;
    const i0 = Math.floor(srcIdx);
    const i1 = Math.min(totalFrames - 1, i0 + 1);
    const frac = srcIdx - i0;
    out[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
  }
  return { samples: out, sampleRate: 16000, duration: outLen / 16000 };
}

function detectLanguageFromText(text, fallback = 'en') {
  const s = String(text || '');
  if (!s.trim()) return fallback;
  const urduChars = (s.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (s.match(/[A-Za-z]/g) || []).length;
  if (urduChars >= 2 && urduChars >= latinChars * 0.4) return 'ur';
  if (latinChars >= 2) return 'en';
  return fallback;
}

function normalizeSegments(rawSegments, chunkOffsetSec, chunkDurSec, langCode) {
  const list = [];
  for (const seg of (rawSegments || [])) {
    const text = String(seg.text || '').trim();
    if (!text) continue;
    // Skip common Whisper silent hallucinations like "[Music]" or "..."
    if (/^(\[.*?\]|\(.*?\)|\.+)$/.test(text) && text.length < 18) continue;
    const rawStart = Math.max(0, Number(seg.start) || 0);
    const rawEnd = Math.max(rawStart + 0.35, Number(seg.end) || Math.min(chunkDurSec, rawStart + 3.0));
    list.push({
      start: Number((chunkOffsetSec + rawStart).toFixed(2)),
      end: Number((chunkOffsetSec + Math.min(chunkDurSec + 0.5, rawEnd)).toFixed(2)),
      text,
      language: langCode === 'ur' || URDU_ARABIC_RE.test(text) ? 'ur' : 'en'
    });
  }
  return list;
}

async function getLocalWhisperPipeline() {
  if (localWhisperPromise) return localWhisperPromise;
  localWhisperPromise = (async () => {
    const transformers = await import('@huggingface/transformers');
    const cacheDir = path.join(__dirname, '..', 'models_cache');
    fs.mkdirSync(cacheDir, { recursive: true });
    if (transformers.env) {
      transformers.env.cacheDir = cacheDir;
      transformers.env.allowLocalModels = true;
    }
    const asr = await transformers.pipeline('automatic-speech-recognition', localWhisperModelName, {
      dtype: {
        encoder_model: 'fp32',
        decoder_model_merged: 'q8'
      },
      device: 'cpu'
    });
    return asr;
  })().catch(err => {
    localWhisperPromise = null;
    throw err;
  });
  return localWhisperPromise;
}

async function transcribeWithOpenAICompatible(apiUrl, apiKey, model, wavBuffer, language, chunkOffsetSec, chunkDurSec) {
  const form = new FormData();
  form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'chunk.wav');
  form.append('model', model);
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  if (language === 'ur' || language === 'en') {
    form.append('language', language);
  }
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Whisper API error (${resp.status}): ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  let detected = (data.language || '').toLowerCase();
  if (detected.startsWith('ur') || detected === 'urdu') detected = 'ur';
  else if (detected.startsWith('en') || detected === 'english') detected = 'en';
  else detected = detectLanguageFromText(data.text, language === 'ur' ? 'ur' : 'en');

  const rawSegs = Array.isArray(data.segments) && data.segments.length
    ? data.segments.map(s => ({ start: s.start, end: s.end, text: s.text }))
    : (data.text ? [{ start: 0, end: chunkDurSec, text: data.text }] : []);

  return {
    detectedLanguage: detected,
    segments: normalizeSegments(rawSegs, chunkOffsetSec, chunkDurSec, detected)
  };
}

async function transcribeWithGemini(apiKey, wavBuffer, language, chunkOffsetSec, chunkDurSec) {
  const langRule = language === 'ur'
    ? 'The audio is in Urdu. Transcribe ONLY in authentic Urdu Arabic/Nastaliq script. Do NOT translate to English.'
    : (language === 'en'
      ? 'The audio is in English. Transcribe ONLY in English. Do NOT translate.'
      : 'Detect whether the speaker is speaking Urdu or English. Transcribe in the EXACT spoken language (authentic Urdu Nastaliq script for Urdu, English for English). Do NOT translate.');

  const prompt = `${langRule}
Return strict JSON with this exact shape:
{"detectedLanguage":"ur"|"en","segments":[{"start":0.0,"end":3.2,"text":"..."}]}
Timestamps must be in seconds within [0, ${chunkDurSec.toFixed(2)}]. Break into concise subtitle lines (1-2 lines per segment, max 4 seconds each). If there is no speech, return {"detectedLanguage":"en","segments":[]}.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'audio/wav', data: wavBuffer.toString('base64') } }
        ]
      }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 }
    })
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini STT error (${resp.status}): ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  const rawTxt = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const parsed = JSON.parse(rawTxt);
  const det = parsed.detectedLanguage === 'ur' ? 'ur' : detectLanguageFromText((parsed.segments || []).map(s => s.text).join(' '), language === 'ur' ? 'ur' : 'en');
  return {
    detectedLanguage: det,
    segments: normalizeSegments(parsed.segments || [], chunkOffsetSec, chunkDurSec, det)
  };
}

async function detectWhisperLanguageLocal(asr, samples) {
  try {
    const transformers = await import('@huggingface/transformers');
    // Take first 15s (or full clip if shorter) for fast neural language ID
    const probe = samples.length > 16000 * 15 ? samples.subarray(0, 16000 * 15) : samples;
    const inputs = await asr.processor(probe);
    const startId = asr.model.config.decoder_start_token_id;
    const decIds = new transformers.Tensor('int64', BigInt64Array.from([BigInt(startId)]), [1, 1]);
    const out = await asr.model.forward({ input_features: inputs.input_features, decoder_input_ids: decIds });
    const logits = out.logits.data;
    const enId = asr.tokenizer.convert_tokens_to_ids('<|en|>');
    const urId = asr.tokenizer.convert_tokens_to_ids('<|ur|>');
    const hiId = asr.tokenizer.convert_tokens_to_ids('<|hi|>');
    const enScore = logits[enId] ?? -999;
    const urScore = Math.max(logits[urId] ?? -999, logits[hiId] ?? -999);
    return urScore > enScore ? 'ur' : 'en';
  } catch (_) {
    return 'en';
  }
}

async function transcribeWithLocalWhisper(wavBuffer, language, chunkOffsetSec) {
  const { samples, duration } = parseWavToMono16k(wavBuffer);

  // Skip completely silent chunks cleanly (RMS check)
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i];
  const rms = Math.sqrt(sumSq / Math.max(1, samples.length));
  if (rms < 0.0025) {
    return { detectedLanguage: language === 'ur' ? 'ur' : 'en', segments: [] };
  }

  const asr = await getLocalWhisperPipeline();

  let targetLang = language;
  if (language === 'auto') {
    targetLang = await detectWhisperLanguageLocal(asr, samples);
  }

  const runPass = async (forcedLang) => {
    const opts = {
      task: 'transcribe',
      language: forcedLang === 'ur' ? 'urdu' : 'english',
      return_timestamps: true,
      chunk_length_s: 25,
      stride_length_s: 4
    };
    return asr(samples, opts);
  };

  let out = await runPass(targetLang);
  let fullText = String(out && out.text || '').trim();

  // Safety guard: if Devanagari ever appeared, re-run strictly in Urdu script
  if (DEVANAGARI_RE.test(fullText) && !URDU_ARABIC_RE.test(fullText)) {
    targetLang = 'ur';
    out = await runPass('ur');
    fullText = String(out && out.text || '').trim();
  }

  const detected = targetLang === 'ur' ? 'ur' : detectLanguageFromText(fullText, 'en');

  const chunks = Array.isArray(out && out.chunks) && out.chunks.length
    ? out.chunks.map(c => ({
        start: (Array.isArray(c.timestamp) && c.timestamp[0] != null) ? c.timestamp[0] : 0,
        end: (Array.isArray(c.timestamp) && c.timestamp[1] != null) ? c.timestamp[1] : duration,
        text: c.text || ''
      }))
    : (fullText ? [{ start: 0, end: duration, text: fullText }] : []);

  return {
    detectedLanguage: detected,
    segments: normalizeSegments(chunks, chunkOffsetSec, duration, detected)
  };
}

/**
 * Transcribe a WAV audio chunk strictly in the spoken language (no automatic translation).
 */
async function transcribeAudioChunk({ wavBuffer, language = 'auto', chunkOffsetSec = 0 }) {
  const { duration } = parseWavToMono16k(wavBuffer);
  const lang = ['auto', 'ur', 'en'].includes(language) ? language : 'auto';

  if (process.env.GROQ_API_KEY) {
    const res = await transcribeWithOpenAICompatible(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      process.env.GROQ_API_KEY,
      'whisper-large-v3',
      wavBuffer,
      lang,
      chunkOffsetSec,
      duration
    );
    return { ...res, engine: 'groq_whisper' };
  }

  if (process.env.OPENAI_API_KEY) {
    const res = await transcribeWithOpenAICompatible(
      'https://api.openai.com/v1/audio/transcriptions',
      process.env.OPENAI_API_KEY,
      'whisper-1',
      wavBuffer,
      lang,
      chunkOffsetSec,
      duration
    );
    return { ...res, engine: 'openai_whisper' };
  }

  if (process.env.GEMINI_API_KEY) {
    const res = await transcribeWithGemini(
      process.env.GEMINI_API_KEY,
      wavBuffer,
      lang,
      chunkOffsetSec,
      duration
    );
    return { ...res, engine: 'gemini_audio' };
  }

  const res = await transcribeWithLocalWhisper(wavBuffer, lang, chunkOffsetSec);
  return { ...res, engine: 'local_whisper' };
}

/**
 * Separate translation operation: Urdu <-> English ONLY when explicitly requested by user.
 */
async function translateSubtitles({ segments, sourceLanguage = 'auto', targetLanguage = 'en' }) {
  if (!Array.isArray(segments) || !segments.length) return [];
  const target = targetLanguage === 'ur' ? 'ur' : 'en';
  const source = ['ur', 'en'].includes(sourceLanguage) ? sourceLanguage : 'auto';

  // Cloud LLM translation if key is configured
  if (process.env.GEMINI_API_KEY) {
    const targetName = target === 'ur' ? 'natural Urdu (Arabic/Nastaliq script)' : 'clear natural English';
    const prompt = `Translate each subtitle text into ${targetName}. Preserve the exact array order and return strict JSON array of translated strings only.\nInput:\n${JSON.stringify(segments.map(s => s.text))}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      const arr = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '[]');
      if (Array.isArray(arr) && arr.length === segments.length) {
        return segments.map((s, idx) => ({ ...s, text: String(arr[idx] || s.text).trim(), language: target }));
      }
    }
  }

  // Server-side public translation API (GTX) with MyMemory fallback
  const translated = [];
  for (const seg of segments) {
    const txt = String(seg.text || '').trim();
    if (!txt) {
      translated.push({ ...seg, language: target });
      continue;
    }
    const srcCode = source === 'auto' ? detectLanguageFromText(txt, target === 'ur' ? 'en' : 'ur') : source;
    if (srcCode === target) {
      translated.push({ ...seg, language: target });
      continue;
    }

    let outText = null;
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(srcCode)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(txt)}`;
      const r = await fetch(gUrl, { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j) && Array.isArray(j[0])) {
          outText = j[0].map(part => part[0] || '').join('').trim();
        }
      }
    } catch (_) {}

    if (!outText) {
      try {
        const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(txt)}&langpair=${encodeURIComponent(srcCode)}|${encodeURIComponent(target)}`;
        const r = await fetch(mUrl, { signal: AbortSignal.timeout(8000) });
        if (r.ok) {
          const j = await r.json();
          if (j?.responseData?.translatedText) outText = String(j.responseData.translatedText).trim();
        }
      } catch (_) {}
    }

    translated.push({ ...seg, text: outText || txt, language: target });
  }
  return translated;
}

module.exports = {
  getSttCapabilities,
  transcribeAudioChunk,
  translateSubtitles,
  parseWavToMono16k
};
