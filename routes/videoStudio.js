const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const multer = require('multer');
const db = require('../config/db');
const { videoUpload, audioUpload, sfxUpload, mediaRoot } = require('../middleware/upload');
const { getSttCapabilities, transcribeAudioChunk, translateSubtitles } = require('../services/sttService');

const sttChunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const BUILTIN_SFX_CATALOG = [
  { id: 'sfx_breaking_alert', name: 'Breaking News Alert', category: 'News', duration: 1.6, url: '/audio/sfx/breaking_news_alert.wav' },
  { id: 'sfx_news_intro', name: 'News Intro', category: 'News', duration: 2.4, url: '/audio/sfx/news_intro.wav' },
  { id: 'sfx_news_transition', name: 'News Transition', category: 'Transition', duration: 0.9, url: '/audio/sfx/news_transition.wav' },
  { id: 'sfx_notification', name: 'Notification Alert', category: 'UI / Alert', duration: 0.75, url: '/audio/sfx/notification_alert.wav' },
  { id: 'sfx_short_beep', name: 'Short Beep', category: 'UI / Alert', duration: 0.28, url: '/audio/sfx/short_beep.wav' },
  { id: 'sfx_whoosh', name: 'Whoosh', category: 'Transition', duration: 0.8, url: '/audio/sfx/whoosh.wav' },
  { id: 'sfx_impact', name: 'Impact', category: 'Cinematic', duration: 1.1, url: '/audio/sfx/impact.wav' },
  { id: 'sfx_camera_shutter', name: 'Camera Shutter', category: 'Effects', duration: 0.32, url: '/audio/sfx/camera_shutter.wav' },
  { id: 'sfx_crowd_ambience', name: 'Crowd Ambience', category: 'Ambience', duration: 3.0, url: '/audio/sfx/crowd_ambience.wav' },
  { id: 'sfx_applause', name: 'Applause', category: 'Ambience', duration: 2.4, url: '/audio/sfx/applause.wav' },
  { id: 'sfx_drum_roll', name: 'Drum Roll', category: 'Cinematic', duration: 2.0, url: '/audio/sfx/drum_roll.wav' },
  { id: 'sfx_cinematic_rise', name: 'Cinematic Rise', category: 'Cinematic', duration: 2.2, url: '/audio/sfx/cinematic_rise.wav' },
  { id: 'sfx_dramatic_hit', name: 'Dramatic Hit', category: 'Cinematic', duration: 1.4, url: '/audio/sfx/dramatic_hit.wav' },
  { id: 'sfx_soft_transition', name: 'Soft Transition', category: 'Transition', duration: 1.1, url: '/audio/sfx/soft_transition.wav' },
  { id: 'sfx_success', name: 'Success Notification', category: 'UI / Alert', duration: 0.95, url: '/audio/sfx/success_notification.wav' }
];

function cleanupTemporaryRenders() {
  try {
    const tmpDir = path.join(mediaRoot, 'tmp_renders');
    if (!fs.existsSync(tmpDir)) return;
    const cutoff = Date.now() - 3600 * 1000;
    for (const f of fs.readdirSync(tmpDir)) {
      const full = path.join(tmpDir, f);
      try {
        const st = fs.statSync(full);
        if (st.isFile() && st.mtimeMs < cutoff) fs.unlinkSync(full);
      } catch (_) {}
    }
  } catch (_) {}
}
cleanupTemporaryRenders();

let schemaReady = false;
let schemaInitPromise = null;

async function ensureVideoStudioSchema() {
  if (schemaReady) return;
  if (schemaInitPromise) return schemaInitPromise;

  schemaInitPromise = (async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS social_video_projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        template_id VARCHAR(64) NOT NULL DEFAULT 'breaking_news',
        output_format VARCHAR(32) NOT NULL DEFAULT 'portrait_9_16',
        output_width INT NOT NULL DEFAULT 1080,
        output_height INT NOT NULL DEFAULT 1920,
        video_url VARCHAR(512) NULL,
        video_meta_json LONGTEXT NULL,
        thumbnail_data_url MEDIUMTEXT NULL,
        project_state_json LONGTEXT NOT NULL,
        is_custom_template TINYINT(1) NOT NULL DEFAULT 0,
        status ENUM('draft', 'exported', 'template') NOT NULL DEFAULT 'draft',
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vs_status (status),
        INDEX idx_vs_custom_tpl (is_custom_template),
        INDEX idx_vs_updated (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    schemaReady = true;
  })().catch(err => {
    schemaInitPromise = null;
    throw err;
  });

  return schemaInitPromise;
}

function detectServerFfmpeg() {
  return new Promise(resolve => {
    const cmd = process.platform === 'win32' ? 'where.exe' : 'which';
    execFile(cmd, ['ffmpeg'], { timeout: 2000 }, (err, stdout) => {
      if (!err && stdout && stdout.trim()) {
        return resolve({ available: true, path: stdout.trim().split(/\r?\n/)[0] });
      }
      resolve({ available: false, path: null });
    });
  });
}

function safeJsonParse(raw, fallback = null) {
  if (!raw) return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

// GET /api/admin/video-studio/capabilities
router.get('/capabilities', async (req, res) => {
  try {
    await ensureVideoStudioSchema();
    const ffmpeg = await detectServerFfmpeg();
    return res.json({
      success: true,
      serverFfmpegAvailable: ffmpeg.available,
      maxUploadBytes: 250 * 1024 * 1024,
      recommendedEngine: 'webcodecs_mp4',
      stt: getSttCapabilities(),
      hostingNote: ffmpeg.available
        ? 'Client WebCodecs MP4 + Server FFmpeg detected'
        : 'Client WebCodecs H.264/AAC MP4 & MediaRecorder fallback active (Hostinger shared-safe zero-CPU overhead)'
    });
  } catch (err) {
    console.error('[VideoStudio Capabilities Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to inspect video studio capabilities.' });
  }
});

// POST /api/admin/video-studio/upload-media
router.post('/upload-media', (req, res) => {
  videoUpload.single('video')(req, res, err => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded video exceeds the 250 MB limit.'
        : (err.message || 'Invalid video file.');
      return res.status(status).json({ success: false, message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file was provided.' });
    }
    return res.json({
      success: true,
      url: req.file.publicUrl || `/media/videos/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

// POST /api/admin/video-studio/upload-audio
router.post('/upload-audio', (req, res) => {
  audioUpload.single('audio')(req, res, err => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded audio exceeds the 50 MB limit.'
        : (err.message || 'Invalid audio file.');
      return res.status(status).json({ success: false, message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No audio file was provided.' });
    }
    return res.json({
      success: true,
      url: req.file.publicUrl || `/media/audio/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

function scanMediaFolder(subfolders, allowedExts, mediaType) {
  const items = [];
  for (const sub of subfolders) {
    const dir = path.join(mediaRoot, sub);
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = fs.readdirSync(dir);
      for (const name of entries) {
        if (name.endsWith('.bak') || name.includes('-thumb.')) continue;
        const ext = path.extname(name).toLowerCase();
        if (!allowedExts.includes(ext)) continue;
        try {
          const stat = fs.statSync(path.join(dir, name));
          if (!stat.isFile()) continue;
          items.push({
            filename: name,
            folder: sub,
            type: mediaType,
            url: `/media/${sub}/${name}`,
            size: stat.size,
            sizeFormatted: stat.size >= 1048576
              ? `${(stat.size / 1048576).toFixed(1)} MB`
              : `${(stat.size / 1024).toFixed(1)} KB`,
            mtime: stat.mtimeMs
          });
        } catch (_) {}
      }
    } catch (_) {}
  }
  items.sort((a, b) => b.mtime - a.mtime);
  return items;
}

// POST /api/admin/video-studio/upload-sfx
router.post('/upload-sfx', (req, res) => {
  sfxUpload.single('sfx')(req, res, err => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded sound effect exceeds the 15 MB limit.'
        : (err.message || 'Invalid audio file.');
      return res.status(status).json({ success: false, message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No sound effect file was provided.' });
    }
    return res.json({
      success: true,
      url: req.file.publicUrl || `/media/sfx/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

// GET /api/admin/video-studio/sfx-library
router.get('/sfx-library', async (req, res) => {
  try {
    const customSfx = scanMediaFolder(['sfx'], ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm'], 'sfx').map(item => ({
      id: `custom_${item.filename}`,
      name: item.filename.replace(/_\d+_\d+\.[^.]+$/, '').replace(/_/g, ' '),
      category: 'Custom',
      duration: null,
      url: item.url,
      sizeFormatted: item.sizeFormatted,
      isCustom: true
    }));
    return res.json({
      success: true,
      builtin: BUILTIN_SFX_CATALOG,
      custom: customSfx
    });
  } catch (err) {
    console.error('[VideoStudio SFX Library Error]', err);
    return res.status(500).json({ success: false, message: 'Could not load sound effects library.' });
  }
});

// GET /api/admin/video-studio/media-library
router.get('/media-library', async (req, res) => {
  try {
    cleanupTemporaryRenders();
    const videos = scanMediaFolder(['videos'], ['.mp4', '.webm', '.mov', '.m4v'], 'video');
    const images = scanMediaFolder(['uploads', 'news', 'projects', 'hero'], ['.webp', '.png', '.jpg', '.jpeg', '.gif'], 'image');
    const branding = scanMediaFolder(['branding'], ['.webp', '.png', '.jpg', '.jpeg', '.svg'], 'branding');
    const audio = scanMediaFolder(['audio'], ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm'], 'audio');
    const customSfx = scanMediaFolder(['sfx'], ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm'], 'sfx');
    return res.json({ success: true, videos, images, branding, audio, sfx: [...BUILTIN_SFX_CATALOG, ...customSfx] });
  } catch (err) {
    console.error('[VideoStudio Media Library Error]', err);
    return res.status(500).json({ success: false, message: 'Could not load video studio media library.' });
  }
});

// GET /api/admin/video-studio/media-videos
router.get('/media-videos', async (req, res) => {
  try {
    const items = scanMediaFolder(['videos'], ['.mp4', '.webm', '.mov', '.m4v'], 'video');
    return res.json({ success: true, videos: items });
  } catch (err) {
    console.error('[VideoStudio Media Videos Error]', err);
    return res.status(500).json({ success: false, message: 'Could not list uploaded videos.' });
  }
});

// GET /api/admin/video-studio/projects
router.get('/projects', async (req, res) => {
  try {
    await ensureVideoStudioSchema();
    const filter = req.query.type || 'all';
    let whereSql = '';
    const params = [];
    if (filter === 'template') {
      whereSql = 'WHERE is_custom_template = 1';
    } else if (filter === 'draft') {
      whereSql = "WHERE is_custom_template = 0 AND status = 'draft'";
    }

    const [rows] = await db.query(`
      SELECT id, title, template_id, output_format, output_width, output_height,
             video_url, video_meta_json, thumbnail_data_url, is_custom_template,
             status, created_by, created_at, updated_at
      FROM social_video_projects
      ${whereSql}
      ORDER BY updated_at DESC, id DESC
      LIMIT 100
    `, params);

    const projects = rows.map(r => ({
      ...r,
      is_custom_template: Boolean(r.is_custom_template),
      video_meta: safeJsonParse(r.video_meta_json, null)
    }));

    return res.json({ success: true, projects });
  } catch (err) {
    console.error('[VideoStudio Projects GET Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load saved video projects.' });
  }
});

// GET /api/admin/video-studio/projects/:id
router.get('/projects/:id', async (req, res) => {
  try {
    await ensureVideoStudioSchema();
    const [rows] = await db.query('SELECT * FROM social_video_projects WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Video project not found.' });
    }
    const row = rows[0];
    return res.json({
      success: true,
      project: {
        ...row,
        is_custom_template: Boolean(row.is_custom_template),
        video_meta: safeJsonParse(row.video_meta_json, null),
        project_state: safeJsonParse(row.project_state_json, {})
      }
    });
  } catch (err) {
    console.error('[VideoStudio Project GET Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load video project details.' });
  }
});

// POST /api/admin/video-studio/projects
router.post('/projects', async (req, res) => {
  try {
    await ensureVideoStudioSchema();
    const {
      title,
      template_id = 'breaking_news',
      output_format = 'portrait_9_16',
      output_width = 1080,
      output_height = 1920,
      video_url = null,
      video_meta = null,
      thumbnail_data_url = null,
      project_state = {},
      is_custom_template = false,
      status = 'draft'
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Project title is required.' });
    }

    const safeStatus = is_custom_template
      ? 'template'
      : (['draft', 'exported', 'template'].includes(status) ? status : 'draft');

    const [result] = await db.query(`
      INSERT INTO social_video_projects (
        title, template_id, output_format, output_width, output_height,
        video_url, video_meta_json, thumbnail_data_url, project_state_json,
        is_custom_template, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      String(title).trim().substring(0, 255),
      String(template_id).substring(0, 64),
      String(output_format).substring(0, 32),
      parseInt(output_width, 10) || 1080,
      parseInt(output_height, 10) || 1920,
      video_url ? String(video_url).substring(0, 512) : null,
      video_meta ? JSON.stringify(video_meta) : null,
      thumbnail_data_url && String(thumbnail_data_url).startsWith('data:image/') ? String(thumbnail_data_url).substring(0, 500000) : null,
      JSON.stringify(project_state || {}),
      is_custom_template ? 1 : 0,
      safeStatus,
      req.session && req.session.user ? req.session.user.id : null
    ]);

    return res.json({
      success: true,
      id: result.insertId,
      message: is_custom_template ? 'Custom video template saved.' : 'Video project draft saved.'
    });
  } catch (err) {
    console.error('[VideoStudio Project POST Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to save video project.' });
  }
});

// PUT /api/admin/video-studio/projects/:id
router.put('/projects/:id', async (req, res) => {
  try {
    await ensureVideoStudioSchema();
    const projectId = req.params.id;
    const [existing] = await db.query('SELECT id FROM social_video_projects WHERE id = ?', [projectId]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Video project not found.' });
    }

    const {
      title,
      template_id = 'breaking_news',
      output_format = 'portrait_9_16',
      output_width = 1080,
      output_height = 1920,
      video_url = null,
      video_meta = null,
      thumbnail_data_url = null,
      project_state = {},
      is_custom_template = false,
      status = 'draft'
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Project title is required.' });
    }

    const safeStatus = is_custom_template
      ? 'template'
      : (['draft', 'exported', 'template'].includes(status) ? status : 'draft');

    await db.query(`
      UPDATE social_video_projects SET
        title = ?,
        template_id = ?,
        output_format = ?,
        output_width = ?,
        output_height = ?,
        video_url = ?,
        video_meta_json = ?,
        thumbnail_data_url = COALESCE(?, thumbnail_data_url),
        project_state_json = ?,
        is_custom_template = ?,
        status = ?
      WHERE id = ?
    `, [
      String(title).trim().substring(0, 255),
      String(template_id).substring(0, 64),
      String(output_format).substring(0, 32),
      parseInt(output_width, 10) || 1080,
      parseInt(output_height, 10) || 1920,
      video_url ? String(video_url).substring(0, 512) : null,
      video_meta ? JSON.stringify(video_meta) : null,
      thumbnail_data_url && String(thumbnail_data_url).startsWith('data:image/') ? String(thumbnail_data_url).substring(0, 500000) : null,
      JSON.stringify(project_state || {}),
      is_custom_template ? 1 : 0,
      safeStatus,
      projectId
    ]);

    return res.json({ success: true, id: Number(projectId), message: 'Video project updated successfully.' });
  } catch (err) {
    console.error('[VideoStudio Project PUT Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update video project.' });
  }
});

// POST /api/admin/video-studio/projects/:id/duplicate
router.post('/projects/:id/duplicate', async (req, res) => {
  try {
    await ensureVideoStudioSchema();
    const [rows] = await db.query('SELECT * FROM social_video_projects WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Original project not found.' });
    }
    const orig = rows[0];
    const copyTitle = `${orig.title} (Copy)`.substring(0, 255);
    const [result] = await db.query(`
      INSERT INTO social_video_projects (
        title, template_id, output_format, output_width, output_height,
        video_url, video_meta_json, thumbnail_data_url, project_state_json,
        is_custom_template, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
    `, [
      copyTitle,
      orig.template_id,
      orig.output_format,
      orig.output_width,
      orig.output_height,
      orig.video_url,
      orig.video_meta_json,
      orig.thumbnail_data_url,
      orig.project_state_json,
      orig.is_custom_template,
      req.session && req.session.user ? req.session.user.id : null
    ]);

    return res.json({ success: true, id: result.insertId, title: copyTitle, message: 'Project duplicated cleanly.' });
  } catch (err) {
    console.error('[VideoStudio Project Duplicate Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to duplicate video project.' });
  }
});

// DELETE /api/admin/video-studio/projects/:id
router.delete('/projects/:id', async (req, res) => {
  try {
    await ensureVideoStudioSchema();
    await db.query('DELETE FROM social_video_projects WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Video project deleted.' });
  } catch (err) {
    console.error('[VideoStudio Project DELETE Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete video project.' });
  }
});

// POST /api/admin/video-studio/transcribe-chunk
router.post('/transcribe-chunk', (req, res) => {
  sttChunkUpload.single('audio')(req, res, async err => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ success: false, message: err.message || 'Invalid audio chunk.' });
    }
    if (!req.file || !req.file.buffer || req.file.buffer.length < 44) {
      return res.status(400).json({ success: false, message: 'No WAV audio chunk provided for transcription.' });
    }
    try {
      const language = String(req.body.language || 'auto').toLowerCase();
      const chunkOffsetSec = Math.max(0, Number(req.body.chunkOffsetSec) || 0);
      const result = await transcribeAudioChunk({
        wavBuffer: req.file.buffer,
        language,
        chunkOffsetSec
      });
      return res.json({
        success: true,
        engine: result.engine,
        detectedLanguage: result.detectedLanguage,
        segments: result.segments
      });
    } catch (sttErr) {
      console.error('[VideoStudio STT Error]', sttErr);
      return res.status(500).json({
        success: false,
        message: sttErr.message || 'Speech-to-text transcription failed.'
      });
    }
  });
});

// POST /api/admin/video-studio/translate-subtitles
router.post('/translate-subtitles', async (req, res) => {
  try {
    const { segments, sourceLanguage = 'auto', targetLanguage = 'en' } = req.body || {};
    if (!Array.isArray(segments) || !segments.length) {
      return res.status(400).json({ success: false, message: 'No subtitle segments provided for translation.' });
    }
    const translated = await translateSubtitles({
      segments: segments.slice(0, 500),
      sourceLanguage,
      targetLanguage
    });
    return res.json({
      success: true,
      targetLanguage: targetLanguage === 'ur' ? 'ur' : 'en',
      segments: translated
    });
  } catch (trErr) {
    console.error('[VideoStudio Subtitle Translate Error]', trErr);
    return res.status(500).json({ success: false, message: trErr.message || 'Subtitle translation failed.' });
  }
});

module.exports = router;
