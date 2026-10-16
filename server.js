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
function resolveMediaDir() {
  if (process.env.MEDIA_DIR && fs.existsSync(path.resolve(process.env.MEDIA_DIR))) {
    return path.resolve(process.env.MEDIA_DIR);
  }
  const candidates = [
    process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : null,
    '/home/u434697879/qasreshabbir_media',
    path.resolve(__dirname, '../../qasreshabbir_media'),
    path.resolve(__dirname, '../qasreshabbir_media'),
    path.resolve(process.cwd(), '../qasreshabbir_media'),
    path.resolve(process.cwd(), 'qasreshabbir_media')
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
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

// Security Headers (Configured for local assets & fonts)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Serve site logo as browser icon / favicon
app.get('/favicon.ico', async (req, res, next) => {
  try {
    const [rows] = await query("SELECT setting_val FROM site_settings WHERE setting_key = 'site_logo_url'");
    if (rows.length && rows[0].setting_val) {
      const filename = path.basename(rows[0].setting_val);
      for (const sub of ['branding', 'uploads']) {
        const candidate = path.join(mediaDir, sub, filename);
        if (fs.existsSync(candidate)) return res.sendFile(candidate);
      }
    }
  } catch (e) {}
  next();
});

// Smart Logo & Flag Serving: Always serve uploaded branding assets from DB
app.get('/media/branding/logo.svg', async (req, res, next) => {
  try {
    const [rows] = await query("SELECT setting_val FROM site_settings WHERE setting_key = 'site_logo_url'");
    if (rows.length && rows[0].setting_val) {
      const filename = path.basename(rows[0].setting_val);
      for (const sub of ['branding', 'uploads']) {
        const candidate = path.join(mediaDir, sub, filename);
        if (fs.existsSync(candidate)) return res.sendFile(candidate);
      }
    }
  } catch (e) {}
  next();
});

app.get('/media/branding/flag.svg', async (req, res, next) => {
  try {
    const [rows] = await query("SELECT setting_val FROM site_settings WHERE setting_key = 'site_flag_url'");
    if (rows.length && rows[0].setting_val) {
      const filename = path.basename(rows[0].setting_val);
      for (const sub of ['branding', 'uploads']) {
        const candidate = path.join(mediaDir, sub, filename);
        if (fs.existsSync(candidate)) return res.sendFile(candidate);
      }
    }
  } catch (e) {}
  next();
});

// Serve External Media Repository outside project directory
app.use('/media', express.static(mediaDir, { maxAge: '7d' }));

// Media Fallback: If a media file was stored in a different subfolder (e.g. /branding vs /uploads)
app.use('/media', (req, res, next) => {
  const reqPath = req.path;
  const filename = path.basename(reqPath);
  const possibleSubfolders = ['branding', 'uploads', 'hero', 'projects', 'news', 'categories'];

  // 1. Standard subfolders
  for (const sub of possibleSubfolders) {
    const candidatePath = path.join(mediaDir, sub, filename);
    if (fs.existsSync(candidatePath)) {
      return res.sendFile(candidatePath);
    }
  }

  // 2. Nested qasreshabbir_media directory
  for (const sub of possibleSubfolders) {
    const candidatePath = path.join(mediaDir, 'qasreshabbir_media', sub, filename);
    if (fs.existsSync(candidatePath)) {
      return res.sendFile(candidatePath);
    }
  }

  // 3. Flat filenames with backslash created by Windows zip on Linux
  for (const sub of possibleSubfolders) {
    const candidatePath = path.join(mediaDir, `${sub}\\${filename}`);
    if (fs.existsSync(candidatePath)) {
      return res.sendFile(candidatePath);
    }
    const nestedCandidatePath = path.join(mediaDir, 'qasreshabbir_media', `${sub}\\${filename}`);
    if (fs.existsSync(nestedCandidatePath)) {
      return res.sendFile(nestedCandidatePath);
    }
  }

  // Graceful fallback for logo and flag branding images
  if (reqPath.toLowerCase().includes('logo')) {
    const fallbacks = [
      path.join(mediaDir, 'branding', 'logo.svg'),
      path.join(mediaDir, 'qasreshabbir_media', 'branding', 'logo.svg'),
      path.join(mediaDir, 'qasreshabbir_media', 'branding\\logo.svg'),
      path.join(mediaDir, 'branding\\logo.svg')
    ];
    for (const fb of fallbacks) {
      if (fs.existsSync(fb)) return res.sendFile(fb);
    }
  }
  if (reqPath.toLowerCase().includes('flag')) {
    const fallbacks = [
      path.join(mediaDir, 'branding', 'flag.svg'),
      path.join(mediaDir, 'qasreshabbir_media', 'branding', 'flag.svg'),
      path.join(mediaDir, 'qasreshabbir_media', 'branding\\flag.svg'),
      path.join(mediaDir, 'branding\\flag.svg')
    ];
    for (const fb of fallbacks) {
      if (fs.existsSync(fb)) return res.sendFile(fb);
    }
  }

  next();
});

// Serve Public Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

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

app.get('/admin', (req, res) => {
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

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🕌 QASR-E-SHABBIR FOUNDATION PLATFORM IS RUNNING`);
    console.log(`🔗 Public Portal:     http://localhost:${PORT}`);
    console.log(`🔐 Admin Dashboard:   http://localhost:${PORT}/admin`);
    console.log(`📁 External Media:    ${mediaDir}`);
    console.log(`=======================================================`);
  });
}

startServer();
