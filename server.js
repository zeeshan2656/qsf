require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { testConnection, query } = require('./config/db');

const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve External Media Directory (located outside project root)
function getMediaCandidates() {
  return [
    path.resolve(__dirname, '../../../qasreshabbir_media'),
    path.resolve(__dirname, '../../../../qasreshabbir_media'),
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
}

function resolveMediaDir() {
  const candidates = getMediaCandidates();

  // First priority: pick the directory that actually has files in it!
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      for (const sub of ['projects', 'uploads', 'branding', 'news', 'hero']) {
        const testP = path.join(c, sub);
        if (fs.existsSync(testP)) {
          try {
            const files = fs.readdirSync(testP);
            if (files.length > 0) {
              console.log(`[Storage] Selected active media directory with ${files.length} ${sub} files: ${c}`);
              return c;
            }
          } catch (e) {}
        }
      }
    }
  }

  // Second priority: first existing directory
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  return process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : path.resolve(__dirname, '../qasreshabbir_media');
}

const mediaDir = resolveMediaDir();

// Ensure media directory exists
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

console.log(`[Storage] External Media Directory mounted at: ${mediaDir}`);

// Auto-extract media zip if present on hostinger server
try {
  const { exec } = require('child_process');
  const zipCandidates = [
    '/home/u434697879/qasreshabbir_media.zip',
    '/home/u434697879/qasreshabbir_media/qasreshabbir_media.zip',
    path.join(mediaDir, 'qasreshabbir_media.zip')
  ];
  for (const z of zipCandidates) {
    if (fs.existsSync(z)) {
      console.log(`[Storage] Auto-extracting media archive: ${z} to ${mediaDir}`);
      exec(`unzip -o "${z}" -d "${mediaDir}"`, () => {
        const nested = path.join(mediaDir, 'qasreshabbir_media');
        if (fs.existsSync(nested)) {
          exec(`cp -rn "${nested}"/* "${mediaDir}"/ 2>/dev/null || true`);
        }
      });
      break;
    }
  }
} catch (e) {}

// Security Headers & HSTS (Strict Performance & Best Practices Configuration)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true
    }
  })
);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Production HTTP compression with threshold and optimal ratio
app.use(
  compression({
    threshold: 1024,
    level: 6,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  })
);

// High-efficiency logging: minimal logging for static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(
    morgan('combined', {
      skip: (req) =>
        req.url.startsWith('/media') ||
        req.url.startsWith('/css') ||
        req.url.startsWith('/js') ||
        req.url.startsWith('/dist') ||
        req.url.startsWith('/images')
    })
  );
} else {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'qasreshabbir_fallback_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  })
);

// Serve lightweight browser favicon with caching
app.get('/favicon.ico', (req, res, next) => {
  const iconCandidates = [
    path.join(mediaDir, 'branding', 'favicon-32.png'),
    path.join(__dirname, 'public/images/branding', 'favicon-32.png'),
    path.join(mediaDir, 'branding', 'favicon-64.webp')
  ];
  for (const c of iconCandidates) {
    if (fs.existsSync(c)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.sendFile(c);
    }
  }
  next();
});

// Optimized Header Branding Endpoints with 1-Year Immutable Caching
app.get('/media/branding/logo_header_58.webp', (req, res, next) => {
  for (const c of [
    path.join(__dirname, 'public/media/branding', 'logo_header_58.webp'),
    path.join(__dirname, 'public/images/branding', 'logo_header_58.webp'),
    path.join(mediaDir, 'branding', 'logo_header_58.webp'),
    path.join(mediaDir, 'uploads', 'logo_header_58.webp')
  ]) {
    if (fs.existsSync(c)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(c, { maxAge: 31536000000, immutable: true });
    }
  }
  next();
});

// Dedicated Fast Hero Background Endpoints (LCP Optimization)
app.get('/media/uploads/hero_bg_mobile.webp', (req, res, next) => {
  for (const c of [
    path.join(__dirname, 'public/media/uploads', 'hero_bg_mobile.webp'),
    path.join(mediaDir, 'uploads', 'hero_bg_mobile.webp'),
    path.join(mediaDir, 'branding', 'hero_bg_mobile.webp')
  ]) {
    if (fs.existsSync(c)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(c, { maxAge: 31536000000, immutable: true });
    }
  }
  next();
});

app.get('/media/uploads/Smiling_School_Group_with_Foun_1792082807587_458986.webp', (req, res, next) => {
  for (const c of [
    path.join(__dirname, 'public/media/uploads', 'Smiling_School_Group_with_Foun_1792082807587_458986.webp'),
    path.join(__dirname, 'public/media/uploads', 'hero_bg_desktop.webp'),
    path.join(mediaDir, 'uploads', 'Smiling_School_Group_with_Foun_1792082807587_458986.webp'),
    path.join(mediaDir, 'branding', 'Smiling_School_Group_with_Foun_1792082807587_458986.webp')
  ]) {
    if (fs.existsSync(c)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(c, { maxAge: 31536000000, immutable: true });
    }
  }
  next();
});

app.get('/media/branding/flag_header_58.webp', (req, res, next) => {
  for (const c of [
    path.join(__dirname, 'public/media/branding', 'flag_header_58.webp'),
    path.join(mediaDir, 'branding', 'flag_header_58.webp'),
    path.join(mediaDir, 'uploads', 'flag_header_58.webp')
  ]) {
    if (fs.existsSync(c)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(c, { maxAge: 31536000000, immutable: true });
    }
  }
  next();
});

// Lightweight Logo & Flag Serving
app.get('/media/branding/logo.svg', (req, res, next) => {
  for (const c of [
    path.join(__dirname, 'public/media/branding', 'logo.svg'),
    path.join(__dirname, 'public/images/branding', 'logo.svg'),
    path.join(mediaDir, 'branding', 'logo.svg')
  ]) {
    if (fs.existsSync(c)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.sendFile(c, { maxAge: 31536000000, immutable: true });
    }
  }
  next();
});

app.get('/media/branding/flag.svg', (req, res, next) => {
  for (const c of [
    path.join(__dirname, 'public/images/branding', 'flag.svg'),
    path.join(mediaDir, 'branding', 'flag.svg')
  ]) {
    if (fs.existsSync(c)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.sendFile(c, { maxAge: 31536000000, immutable: true });
    }
  }
  next();
});

// Serve Local Bundled Media Directory with 1-Year Immutable Caching
app.use(
  '/media',
  express.static(path.join(__dirname, 'public/media'), {
    maxAge: '365d',
    immutable: true,
    etag: true,
    lastModified: true
  })
);

// Serve External Media Repository outside project directory with optimal 1-year caching
app.use(
  '/media',
  express.static(mediaDir, {
    maxAge: '365d',
    immutable: true,
    etag: true,
    lastModified: true
  })
);

// Media Fallback: If a media file was stored in a different subfolder (e.g. /branding vs /uploads)
app.use('/media', (req, res, next) => {
  const reqPath = req.path;
  const filename = path.basename(reqPath);
  const possibleSubfolders = ['branding', 'uploads', 'hero', 'projects', 'news', 'categories'];

  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  // 1. Standard subfolders
  for (const sub of possibleSubfolders) {
    const candidatePath = path.join(mediaDir, sub, filename);
    if (fs.existsSync(candidatePath)) {
      return res.sendFile(candidatePath, { maxAge: 31536000000, immutable: true });
    }
  }

  // 2. Nested qasreshabbir_media directory
  for (const sub of possibleSubfolders) {
    const candidatePath = path.join(mediaDir, 'qasreshabbir_media', sub, filename);
    if (fs.existsSync(candidatePath)) {
      return res.sendFile(candidatePath, { maxAge: 31536000000, immutable: true });
    }
  }

  // 3. Flat filenames with backslash created by Windows zip on Linux
  for (const sub of possibleSubfolders) {
    const candidatePath = path.join(mediaDir, `${sub}\\${filename}`);
    if (fs.existsSync(candidatePath)) {
      return res.sendFile(candidatePath, { maxAge: 31536000000, immutable: true });
    }
    const nestedCandidatePath = path.join(mediaDir, 'qasreshabbir_media', `${sub}\\${filename}`);
    if (fs.existsSync(nestedCandidatePath)) {
      return res.sendFile(nestedCandidatePath, { maxAge: 31536000000, immutable: true });
    }
  }

  // 4. Search across all candidate root directories
  const allCandidates = getMediaCandidates();
  for (const root of allCandidates) {
    if (root !== mediaDir && fs.existsSync(root)) {
      for (const sub of possibleSubfolders) {
        const candidatePath = path.join(root, sub, filename);
        if (fs.existsSync(candidatePath)) {
          return res.sendFile(candidatePath, { maxAge: 31536000000, immutable: true });
        }
      }
    }
  }

  // Graceful fallback for logo and flag branding images
  if (reqPath.toLowerCase().includes('logo')) {
    const fallbacks = [
      path.join(__dirname, 'public/media/branding', 'logo_header_58.webp'),
      path.join(__dirname, 'public/images/branding', 'logo.svg'),
      path.join(mediaDir, 'branding', 'logo_header_58.webp'),
      path.join(mediaDir, 'branding', 'logo.svg'),
      path.join(mediaDir, 'qasreshabbir_media', 'branding', 'logo.svg'),
      path.join(mediaDir, 'qasreshabbir_media', 'branding\\logo.svg'),
      path.join(mediaDir, 'branding\\logo.svg')
    ];
    for (const fb of fallbacks) {
      if (fs.existsSync(fb)) return res.sendFile(fb, { maxAge: 31536000000, immutable: true });
    }
  }
  if (reqPath.toLowerCase().includes('flag')) {
    const fallbacks = [
      path.join(__dirname, 'public/media/branding', 'flag_header_58.webp'),
      path.join(__dirname, 'public/images/branding', 'flag.svg'),
      path.join(mediaDir, 'branding', 'flag_header_58.webp'),
      path.join(mediaDir, 'branding', 'flag.svg'),
      path.join(mediaDir, 'qasreshabbir_media', 'branding', 'flag.svg'),
      path.join(mediaDir, 'qasreshabbir_media', 'branding\\flag.svg'),
      path.join(mediaDir, 'branding\\flag.svg')
    ];
    for (const fb of fallbacks) {
      if (fs.existsSync(fb)) return res.sendFile(fb, { maxAge: 31536000000, immutable: true });
    }
  }

  next();
});

// Smart Asset Optimizer: Automatically serve production minified CSS/JS with aggressive cache
const minifiedAssetMap = {
  '/css/style.css': path.join(__dirname, 'public/dist/css/style.min.css'),
  '/css/rtl.css': path.join(__dirname, 'public/dist/css/rtl.min.css'),
  '/css/admin.css': path.join(__dirname, 'public/dist/css/admin.min.css'),
  '/js/translations.js': path.join(__dirname, 'public/dist/js/translations.min.js'),
  '/js/main.js': path.join(__dirname, 'public/dist/js/main.min.js'),
  '/js/admin.js': path.join(__dirname, 'public/dist/js/admin.min.js')
};

app.use((req, res, next) => {
  const minPath = minifiedAssetMap[req.path];
  if (minPath && fs.existsSync(minPath)) {
    const isCss = req.path.endsWith('.css');
    res.setHeader('Content-Type', isCss ? 'text/css; charset=UTF-8' : 'application/javascript; charset=UTF-8');
    // Ensure browsers always revalidate non-hashed css/js assets
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    return res.sendFile(minPath);
  }
  next();
});

// Serve Pre-minified Dist Assets with 1-year immutable caching
app.use(
  '/dist',
  express.static(path.join(__dirname, 'public/dist'), {
    maxAge: '365d',
    immutable: true,
    etag: true,
    lastModified: true
  })
);

// Serve Public Static Assets with smart caching headers (instant update for JS/CSS, long cache for media)
app.use(
  express.static(path.join(__dirname, 'public'), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  })
);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

// Secure Auto-Translate API endpoint
const { requireAuth } = require('./middleware/auth');
const { translateText } = require('./services/translator');
const rateLimit = require('express-rate-limit');

const translateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 translation requests per minute
  message: { success: false, message: 'Translation rate limit exceeded. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/api/translate', requireAuth, translateLimiter, async (req, res) => {
  try {
    const { text, from = 'en', to = 'ur', skipCache = false } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.json({ success: true, original: '', translated: '', cached: true });
    }
    const cleanText = text.trim();
    if (cleanText.length > 5000) {
      return res.status(400).json({ success: false, message: 'Text exceeds maximum limit of 5,000 characters.' });
    }
    const result = await translateText(cleanText, { from, to, skipCache: !!skipCache });
    return res.json(result);
  } catch (err) {
    console.error('[API Translate Error]', err.message);
    return res.status(200).json({
      success: false,
      message: err.message || 'Translation unavailable. You can enter Urdu manually.',
      canManual: true
    });
  }
});

// Clean Page Route Handlers
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/projects', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'projects.html'));
});

app.get('/project/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'project-detail.html'));
});

app.get('/news', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'news.html'));
});

app.get('/news/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'news-detail.html'));
});

app.get('/donate', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'donate.html'));
});

app.get('/apply', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'apply.html'));
});

app.get('/volunteer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'volunteer.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/page/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'page.html'));
});

app.get('/admin', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
async function startServer() {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.warn('[Warning] Running server without confirmed MySQL connection. Verify .env settings.');
  }

  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🕌 QASR-E-SHABBIR FOUNDATION PLATFORM IS RUNNING`);
    console.log(`🔗 Public Portal:     http://localhost:${PORT}`);
    console.log(`🔐 Admin Dashboard:   http://localhost:${PORT}/admin`);
    console.log(`📁 External Media:    ${mediaDir}`);
    console.log(`=======================================================`);
  });

  // Graceful Shutdown Handler
  let isShuttingDown = false;
  function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[Server] HTTP connections closed.');
      const { pool } = require('./config/db');
      pool.end().then(() => {
        console.log('[Database] MySQL connection pool closed.');
        process.exit(0);
      }).catch(() => process.exit(0));
    });
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    console.error('[Server Uncaught Exception]', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[Server Unhandled Rejection]', reason);
  });
}

startServer();
