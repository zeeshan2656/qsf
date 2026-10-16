const multer = require('multer');
const path = require('path');
const fs = require('fs');

function resolveMediaRoot() {
  const candidates = [
    path.resolve(__dirname, '../../../../qasreshabbir_media'),
    path.resolve(__dirname, '../../../../../qasreshabbir_media'),
    path.resolve(process.cwd(), '../../../qasreshabbir_media'),
    path.resolve(process.cwd(), '../../qasreshabbir_media'),
    '/home/u434697879/domains/freehub.live/qasreshabbir_media',
    process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : null,
    '/home/u434697879/qasreshabbir_media',
    path.resolve(__dirname, '../../qasreshabbir_media'),
    path.resolve(__dirname, '../qasreshabbir_media'),
    path.resolve(process.cwd(), '../qasreshabbir_media'),
    path.resolve(process.cwd(), 'qasreshabbir_media')
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      for (const sub of ['projects', 'uploads', 'branding', 'news', 'hero']) {
        const testP = path.join(c, sub);
        if (fs.existsSync(testP)) {
          try {
            const files = fs.readdirSync(testP);
            if (files.length > 0) {
              return c;
            }
          } catch (e) {}
        }
      }
    }
  }

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : path.resolve(__dirname, '../../qasreshabbir_media');
}

const mediaRoot = resolveMediaRoot();

// Ensure destination base directories exist
['branding', 'hero', 'projects', 'news', 'uploads'].forEach(sub => {
  const d = path.join(mediaRoot, sub);
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = 'uploads';
    if (file.fieldname === 'logo' || file.fieldname === 'flag') {
      subfolder = 'branding';
    } else if (req.query && req.query.folder) {
      subfolder = req.query.folder;
    } else {
      const fullUrl = `${req.originalUrl || ''} ${req.baseUrl || ''} ${req.url || ''}`.toLowerCase();
      if (fullUrl.includes('branding')) subfolder = 'branding';
      else if (fullUrl.includes('project')) subfolder = 'projects';
      else if (fullUrl.includes('article') || fullUrl.includes('news')) subfolder = 'news';
    }

    const targetDir = path.join(mediaRoot, subfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    file.subfolder = subfolder;
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    const finalFilename = `${baseName}_${uniqueSuffix}${ext}`;
    
    // Store public URL directly on file object
    const subfolder = file.subfolder || 'uploads';
    file.publicUrl = `/media/${subfolder}/${finalFilename}`;
    
    cb(null, finalFilename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (.jpg, .jpeg, .png, .webp, .svg, .gif) are permitted'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter
});

const sharp = require('sharp');

/**
 * Validates and converts an uploaded profile photo to WebP format.
 * Saves into the existing media/uploads directory and returns public URL (/media/uploads/filename.webp).
 * Removes temporary upload file if needed.
 */
async function processProfilePhoto(file, prefix = 'photo') {
  if (!file) throw new Error('No image file provided.');

  const uploadsDir = path.join(mediaRoot, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Validate that file is a valid image using sharp metadata
  let metadata;
  try {
    metadata = await sharp(file.path).metadata();
  } catch (err) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new Error('The uploaded file is not a valid image format.');
  }

  if (!metadata || !metadata.format) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw new Error('Unsupported image content.');
  }

  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  const webpFilename = `${safePrefix}_${Date.now()}_${Math.round(Math.random() * 1e6)}.webp`;
  const targetPath = path.join(uploadsDir, webpFilename);

  // Resize to max 1000x1000 maintaining aspect ratio, auto-rotate based on EXIF, convert to WebP
  await sharp(file.path)
    .rotate()
    .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85, effort: 4 })
    .toFile(targetPath);

  // Remove temporary initial file if different from target
  if (file.path && file.path !== targetPath && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
    } catch (e) {}
  }

  return `/media/uploads/${webpFilename}`;
}

/**
 * Automatically optimizes any uploaded image (PNG/JPG/SVG/WEBP) to WebP format.
 * Preserves transparency for branding, stamps, and signatures.
 * Updates file.path, file.filename, and file.publicUrl so downstream routes
 * seamlessly receive the optimized WebP asset!
 */
async function optimizeUploadedImage(file, options = {}) {
  if (!file || !file.path) return file;
  const ext = path.extname(file.path).toLowerCase();
  
  // If SVG, keep as vector
  if (ext === '.svg') return file;

  try {
    const metadata = await sharp(file.path).metadata();
    if (!metadata || !metadata.format) return file;

    const dir = path.dirname(file.path);
    const baseName = path.basename(file.path, ext);
    const webpFilename = `${baseName}.webp`;
    const targetPath = path.join(dir, webpFilename);

    const isTransparent = metadata.hasAlpha || metadata.channels === 4;
    const isBranding = (file.subfolder === 'branding') || file.fieldname === 'logo' || file.fieldname === 'stamp' || file.fieldname === 'signature' || file.fieldname === 'flag';

    let pipeline = sharp(file.path).rotate();
    const maxDim = options.maxWidth || (isBranding ? 1600 : 1400);
    if (metadata.width > maxDim || metadata.height > maxDim) {
      pipeline = pipeline.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
    }

    if (isTransparent || isBranding) {
      pipeline = pipeline.webp({ quality: 90, nearLossless: true, effort: 5 });
    } else {
      pipeline = pipeline.webp({ quality: 84, effort: 5 });
    }

    await pipeline.toFile(targetPath);

    // If destination is different, safely remove unoptimized original
    if (file.path !== targetPath && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }

    file.path = targetPath;
    file.filename = webpFilename;
    const subfolder = file.subfolder || 'uploads';
    file.publicUrl = `/media/${subfolder}/${webpFilename}`;

    // Generate thumbnail if project or news
    if (subfolder === 'projects' || subfolder === 'news') {
      try {
        const thumbPath = path.join(dir, `${baseName}-thumb.webp`);
        await sharp(targetPath)
          .resize(480, 320, { fit: 'cover', position: 'center' })
          .webp({ quality: 80 })
          .toFile(thumbPath);
        file.thumbnailUrl = `/media/${subfolder}/${baseName}-thumb.webp`;
      } catch (e) {}
    }
  } catch (err) {
    console.warn('[Upload Optimization Warning]', err.message);
  }

  return file;
}

module.exports = {
  upload,
  mediaRoot,
  processProfilePhoto,
  optimizeUploadedImage
};

