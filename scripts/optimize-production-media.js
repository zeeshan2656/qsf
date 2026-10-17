const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const mediaRoot = 'C:\\Users\\Basharat\\Desktop\\qasreshabbir\\qasreshabbir_media';
const publicMedia = 'C:\\Users\\Basharat\\Desktop\\qasreshabbir\\qsf\\public\\media';
const publicImagesBranding = 'C:\\Users\\Basharat\\Desktop\\qasreshabbir\\qsf\\public\\images\\branding';

async function run() {
  console.log('--- GENERATING PRODUCTION OPTIMIZED MEDIA ---');

  // Ensure target directories exist
  for (const dir of [
    publicMedia,
    path.join(publicMedia, 'branding'),
    path.join(publicMedia, 'hero'),
    path.join(publicMedia, 'uploads'),
    path.join(publicMedia, 'projects'),
    path.join(publicMedia, 'news'),
    publicImagesBranding
  ]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Process Foundation Logo Emblem
  const emblemSource = path.join(mediaRoot, 'branding', 'Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.png');
  if (fs.existsSync(emblemSource)) {
    const rawBuf = fs.readFileSync(emblemSource);
    console.log(`Original Emblem: ${(rawBuf.length / 1024).toFixed(1)} KB`);

    // 1a. Header Logo 58px retina WebP (140x140)
    const headerWebp = await sharp(rawBuf)
      .resize(140, 140, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 85, effort: 6 })
      .toBuffer();
    console.log(`logo_header_58.webp: ${(headerWebp.length / 1024).toFixed(1)} KB`);

    // 1b. Standard logo.webp (320x320)
    const logoWebp = await sharp(rawBuf)
      .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 85, effort: 6 })
      .toBuffer();
    console.log(`logo.webp: ${(logoWebp.length / 1024).toFixed(1)} KB`);

    // 1c. Optimized PNG version of the uploaded emblem
    const emblemPng = await sharp(rawBuf)
      .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();
    console.log(`emblem 320px PNG: ${(emblemPng.length / 1024).toFixed(1)} KB`);

    // 1d. Clean ultra-light SVG containing PNG base64
    const logoPngSmall = await sharp(rawBuf)
      .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180"><image href="data:image/png;base64,${logoPngSmall.toString('base64')}" width="180" height="180"/></svg>`;
    console.log(`Clean logo.svg: ${(Buffer.byteLength(cleanSvg) / 1024).toFixed(1)} KB`);

    // 1e. Favicons
    const fav64 = await sharp(rawBuf)
      .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 90 })
      .toBuffer();
    const fav32 = await sharp(rawBuf)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Write to all appropriate destinations
    const brandingDirs = [
      path.join(mediaRoot, 'branding'),
      path.join(publicMedia, 'branding'),
      publicImagesBranding
    ];
    for (const d of brandingDirs) {
      fs.writeFileSync(path.join(d, 'logo_header_58.webp'), headerWebp);
      fs.writeFileSync(path.join(d, 'logo.webp'), logoWebp);
      fs.writeFileSync(path.join(d, 'logo.svg'), cleanSvg, 'utf8');
      fs.writeFileSync(path.join(d, 'favicon-64.webp'), fav64);
      fs.writeFileSync(path.join(d, 'favicon-32.png'), fav32);
      fs.writeFileSync(path.join(d, 'Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.webp'), logoWebp);
      fs.writeFileSync(path.join(d, 'Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.png'), emblemPng);
    }
  }

  // 2. Process Hero Image (Smiling School Group)
  const heroCandidates = [
    path.join(mediaRoot, 'uploads', 'Smiling_School_Group_with_Foun_1792082807587_458986.png'),
    path.join(mediaRoot, 'branding', 'Smiling_School_Group_with_Foun_1792082807587_458986.png')
  ];
  let heroSource = heroCandidates.find(f => fs.existsSync(f));
  if (heroSource) {
    const rawHero = fs.readFileSync(heroSource);
    console.log(`Original Hero: ${(rawHero.length / 1024).toFixed(1)} KB`);

    // 2a. Mobile Hero WebP (640x360)
    const mobileHero = await sharp(rawHero)
      .resize(640, 360, { fit: 'cover', position: 'right' })
      .webp({ quality: 75, effort: 6 })
      .toBuffer();
    console.log(`hero_bg_mobile.webp: ${(mobileHero.length / 1024).toFixed(1)} KB`);

    // 2b. Desktop Hero WebP (1280x640)
    const desktopHero = await sharp(rawHero)
      .resize(1280, 640, { fit: 'cover', position: 'right' })
      .webp({ quality: 78, effort: 6 })
      .toBuffer();
    console.log(`desktop hero WebP: ${(desktopHero.length / 1024).toFixed(1)} KB`);

    // 2c. Fallback JPEG
    const fallbackJpg = await sharp(rawHero)
      .resize(1000, 500, { fit: 'cover', position: 'right' })
      .jpeg({ quality: 75, mozjpeg: true })
      .toBuffer();

    const targetDirs = [
      path.join(mediaRoot, 'uploads'),
      path.join(mediaRoot, 'branding'),
      path.join(mediaRoot, 'hero'),
      path.join(publicMedia, 'uploads'),
      path.join(publicMedia, 'branding'),
      path.join(publicMedia, 'hero')
    ];
    for (const d of targetDirs) {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, 'hero_bg_mobile.webp'), mobileHero);
      fs.writeFileSync(path.join(d, 'hero_bg_desktop.webp'), desktopHero);
      fs.writeFileSync(path.join(d, 'Smiling_School_Group_with_Foun_1792082807587_458986.webp'), desktopHero);
      fs.writeFileSync(path.join(d, 'hero_bg.jpg'), fallbackJpg);
    }
  }

  // 3. Process Projects Images
  const projectsDir = path.join(mediaRoot, 'projects');
  if (fs.existsSync(projectsDir)) {
    const files = fs.readdirSync(projectsDir);
    for (const f of files) {
      const srcPath = path.join(projectsDir, f);
      if (f.match(/\.(jpg|jpeg|png)$/i)) {
        const raw = fs.readFileSync(srcPath);
        const nameWithoutExt = f.replace(/\.[^.]+$/, '');
        const webpBuf = await sharp(raw)
          .resize(600, 375, { fit: 'cover' })
          .webp({ quality: 75, effort: 6 })
          .toBuffer();
        const jpgBuf = await sharp(raw)
          .resize(600, 375, { fit: 'cover' })
          .jpeg({ quality: 75, mozjpeg: true })
          .toBuffer();

        for (const d of [projectsDir, path.join(publicMedia, 'projects')]) {
          fs.writeFileSync(path.join(d, `${nameWithoutExt}.webp`), webpBuf);
          fs.writeFileSync(path.join(d, `${nameWithoutExt}.jpg`), jpgBuf);
        }
        console.log(`Optimized project ${f}: ${(raw.length/1024).toFixed(1)} KB -> WebP ${(webpBuf.length/1024).toFixed(1)} KB`);
      }
    }
  }

  // 4. Process News Images
  const newsDir = path.join(mediaRoot, 'news');
  if (fs.existsSync(newsDir)) {
    const files = fs.readdirSync(newsDir);
    for (const f of files) {
      const srcPath = path.join(newsDir, f);
      if (f.match(/\.(jpg|jpeg|png)$/i)) {
        const raw = fs.readFileSync(srcPath);
        const nameWithoutExt = f.replace(/\.[^.]+$/, '');
        const webpBuf = await sharp(raw)
          .resize(500, 320, { fit: 'cover' })
          .webp({ quality: 75, effort: 6 })
          .toBuffer();

        for (const d of [newsDir, path.join(publicMedia, 'news')]) {
          fs.writeFileSync(path.join(d, `${nameWithoutExt}.webp`), webpBuf);
          fs.writeFileSync(path.join(d, f), raw);
        }
        console.log(`Optimized news ${f}: ${(raw.length/1024).toFixed(1)} KB -> WebP ${(webpBuf.length/1024).toFixed(1)} KB`);
      }
    }
  }

  console.log('\n--- ALL MEDIA ASSETS PRODUCED & SYNCHRONIZED ---');
}

run().catch(console.error);
