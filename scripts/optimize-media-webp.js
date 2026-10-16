const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const db = require('../config/db');

// Locate media directory
function getMediaDir() {
  const candidates = [
    process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : null,
    'C:/Users/Basharat/Desktop/qasreshabbir_media',
    'C:\\Users\\Basharat\\Desktop\\qasreshabbir_media',
    '/home/u434697879/domains/freehub.live/qasreshabbir_media',
    '/home/u434697879/qasreshabbir_media',
    path.resolve(__dirname, '../../qasreshabbir_media'),
    path.resolve(__dirname, '../qasreshabbir_media')
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      const p = path.join(c, 'projects');
      if (fs.existsSync(p) && fs.readdirSync(p).length > 0) return c;
    }
  }
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.resolve(__dirname, '../../qasreshabbir_media');
}

async function convertImageToWebP(srcPath, options = {}) {
  const ext = path.extname(srcPath).toLowerCase();
  const originalStats = fs.statSync(srcPath);
  const metadata = await sharp(srcPath).metadata();
  const isTransparent = metadata.hasAlpha || metadata.channels === 4;
  const isBranding = srcPath.includes('branding') || srcPath.includes('sig_') || srcPath.includes('stamp');

  if (ext === '.webp') {
    if (originalStats.size > 120 * 1024) {
      const maxDim = isBranding ? 800 : 1400;
      const tmpPath = srcPath + '.tmp.webp';
      let p = sharp(srcPath).rotate();
      if (metadata.width > maxDim || metadata.height > maxDim) {
        p = p.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
      }
      await p.webp({ quality: isTransparent ? 88 : 80, effort: 5 }).toFile(tmpPath);
      const tmpStats = fs.statSync(tmpPath);
      if (tmpStats.size < originalStats.size) {
        if (!fs.existsSync(srcPath + '.bak')) fs.copyFileSync(srcPath, srcPath + '.bak');
        fs.copyFileSync(tmpPath, srcPath);
        fs.unlinkSync(tmpPath);
        return {
          original: srcPath,
          converted: srcPath,
          oldSize: originalStats.size,
          newSize: tmpStats.size,
          savedBytes: originalStats.size - tmpStats.size,
          savingsPct: Math.round(((originalStats.size - tmpStats.size) / originalStats.size) * 100)
        };
      } else {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      }
    }
    return { skipped: true, path: srcPath };
  }
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return { skipped: true, path: srcPath };

  const dir = path.dirname(srcPath);
  const baseName = path.basename(srcPath, ext);
  const destPath = path.join(dir, `${baseName}.webp`);

  let pipeline = sharp(srcPath).rotate(); // auto-orient

  // Max dimension constraints without enlargement
  const maxDim = options.maxWidth || (isBranding ? 1600 : 1400);
  if (metadata.width > maxDim || metadata.height > maxDim) {
    pipeline = pipeline.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
  }

  if (isTransparent || isBranding) {
    // High-quality WebP preserving alpha transparency
    pipeline = pipeline.webp({ quality: 90, nearLossless: true, effort: 6 });
  } else {
    // Optimized photographic WebP
    pipeline = pipeline.webp({ quality: 82, effort: 6 });
  }

  await pipeline.toFile(destPath);
  const newStats = fs.statSync(destPath);

  // Generate thumbnail for card listings if in projects or news
  let thumbPath = null;
  if (srcPath.includes('projects') || srcPath.includes('news')) {
    thumbPath = path.join(dir, `${baseName}-thumb.webp`);
    await sharp(srcPath)
      .rotate()
      .resize(480, 320, { fit: 'cover', position: 'center' })
      .webp({ quality: 80, effort: 5 })
      .toFile(thumbPath);
  }

  // Backup original
  const backupPath = path.join(dir, `${baseName}${ext}.bak`);
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(srcPath, backupPath);
  }

  return {
    original: srcPath,
    converted: destPath,
    thumbnail: thumbPath,
    oldSize: originalStats.size,
    newSize: newStats.size,
    savedBytes: originalStats.size - newStats.size,
    savingsPct: Math.round(((originalStats.size - newStats.size) / originalStats.size) * 100)
  };
}

async function convertSvgLogosToWebP(mediaDir) {
  // SVG Logo is 2.3MB. Generate crisp, lightweight WebP alternatives
  const logoSvg = path.join(mediaDir, 'branding', 'logo.svg');
  if (fs.existsSync(logoSvg)) {
    try {
      const webpFavicon = path.join(mediaDir, 'branding', 'favicon-64.webp');
      const pngFavicon = path.join(mediaDir, 'branding', 'favicon-32.png');
      const webpLogo = path.join(mediaDir, 'branding', 'logo-brand.webp');

      await sharp(logoSvg).resize(64, 64).webp({ quality: 95 }).toFile(webpFavicon);
      await sharp(logoSvg).resize(32, 32).png().toFile(pngFavicon);
      await sharp(logoSvg).resize(512, 512, { fit: 'inside' }).webp({ quality: 90, nearLossless: true }).toFile(webpLogo);
      console.log('✓ Generated lightweight WebP brand logos and favicons from logo.svg');
    } catch (e) {
      console.warn('Could not generate raster logos from SVG:', e.message);
    }
  }
}

async function runOptimization() {
  console.log('====================================================');
  console.log('🚀 BATCH IMAGE WEBP OPTIMIZATION');
  console.log('====================================================');

  const mediaDir = getMediaDir();
  console.log(`[Storage] Scanning target media directory: ${mediaDir}`);

  if (!fs.existsSync(mediaDir)) {
    console.error(`Media directory does not exist: ${mediaDir}`);
    process.exit(1);
  }

  const subfolders = ['branding', 'hero', 'projects', 'news', 'uploads'];
  const conversionMap = new Map(); // oldUrl -> newUrl
  let totalOld = 0;
  let totalNew = 0;
  let convertedCount = 0;

  for (const sub of subfolders) {
    const subPath = path.join(mediaDir, sub);
    if (!fs.existsSync(subPath)) continue;

    const files = fs.readdirSync(subPath);
    for (const file of files) {
      if (file.endsWith('.bak') || file.includes('-thumb.')) continue;
      const fullPath = path.join(subPath, file);
      if (!fs.statSync(fullPath).isFile()) continue;

      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        try {
          const res = await convertImageToWebP(fullPath);
          if (!res.skipped) {
            convertedCount++;
            totalOld += res.oldSize;
            totalNew += res.newSize;

            const oldUrl = `/media/${sub}/${file}`;
            const newUrl = `/media/${sub}/${path.basename(res.converted)}`;
            conversionMap.set(oldUrl, newUrl);

            console.log(`✓ [${sub}] ${file} -> ${path.basename(res.converted)}: ${(res.oldSize / 1024).toFixed(1)} KB -> ${(res.newSize / 1024).toFixed(1)} KB (${res.savingsPct}% saved)`);
          }
        } catch (err) {
          console.error(`✗ Error converting ${file}:`, err.message);
        }
      }
    }
  }

  await convertSvgLogosToWebP(mediaDir);

  const totalSavedBytes = totalOld - totalNew;
  const overallPct = totalOld > 0 ? Math.round((totalSavedBytes / totalOld) * 100) : 0;
  console.log('\n----------------------------------------------------');
  console.log(`Converted Images: ${convertedCount}`);
  console.log(`Initial Size:     ${(totalOld / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Optimized Size:   ${(totalNew / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Space Saved:      ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB (${overallPct}% reduction!)`);
  console.log('----------------------------------------------------\n');

  // Safely update database records
  console.log('[Database] Updating media references to WebP in database...');
  let dbUpdates = 0;

  try {
    // 1. Projects
    const [projects] = await db.query('SELECT id, image_url FROM projects WHERE image_url IS NOT NULL');
    for (const p of projects) {
      if (conversionMap.has(p.image_url)) {
        const nextUrl = conversionMap.get(p.image_url);
        await db.query('UPDATE projects SET image_url = ? WHERE id = ?', [nextUrl, p.id]);
        dbUpdates++;
      }
    }

    // 2. Articles
    const [articles] = await db.query('SELECT id, image_url FROM articles WHERE image_url IS NOT NULL');
    for (const a of articles) {
      if (conversionMap.has(a.image_url)) {
        const nextUrl = conversionMap.get(a.image_url);
        await db.query('UPDATE articles SET image_url = ? WHERE id = ?', [nextUrl, a.id]);
        dbUpdates++;
      }
    }

    // 3. Site Settings
    const [settings] = await db.query('SELECT id, setting_key, setting_val FROM site_settings WHERE setting_val IS NOT NULL');
    for (const s of settings) {
      if (conversionMap.has(s.setting_val)) {
        const nextUrl = conversionMap.get(s.setting_val);
        await db.query('UPDATE site_settings SET setting_val = ? WHERE id = ?', [nextUrl, s.id]);
        dbUpdates++;
      }
    }

    // 4. Official Signatures
    const [signatures] = await db.query('SELECT id, signature_url FROM official_signatures WHERE signature_url IS NOT NULL');
    for (const sig of signatures) {
      if (conversionMap.has(sig.signature_url)) {
        const nextUrl = conversionMap.get(sig.signature_url);
        await db.query('UPDATE official_signatures SET signature_url = ? WHERE id = ?', [nextUrl, sig.id]);
        dbUpdates++;
      }
    }

    // 5. Users
    const [users] = await db.query('SELECT id, photo_url FROM users WHERE photo_url IS NOT NULL');
    for (const u of users) {
      if (conversionMap.has(u.photo_url)) {
        const nextUrl = conversionMap.get(u.photo_url);
        await db.query('UPDATE users SET photo_url = ? WHERE id = ?', [nextUrl, u.id]);
        dbUpdates++;
      }
    }

    // 6. Volunteer Applications
    const [vols] = await db.query('SELECT id, photo_url FROM volunteer_applications WHERE photo_url IS NOT NULL');
    for (const v of vols) {
      if (conversionMap.has(v.photo_url)) {
        const nextUrl = conversionMap.get(v.photo_url);
        await db.query('UPDATE volunteer_applications SET photo_url = ? WHERE id = ?', [nextUrl, v.id]);
        dbUpdates++;
      }
    }

    console.log(`✓ [Database] Successfully updated ${dbUpdates} media references to WebP!`);
  } catch (err) {
    console.error('[Database] Error updating DB records:', err.message);
  }

  process.exit(0);
}

if (require.main === module) {
  runOptimization();
}

module.exports = { runOptimization, convertImageToWebP, getMediaDir };
