const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const mediaDirs = [
  'C:\\Users\\Basharat\\Desktop\\qasreshabbir_media',
  'C:\\Users\\Basharat\\Desktop\\qasreshabbir\\qasreshabbir_media'
];

async function optimizeMedia() {
  console.log('=== OPTIMIZING MEDIA ASSETS FOR 100/100 PERFORMANCE ===');

  for (const mediaDir of mediaDirs) {
    if (!fs.existsSync(mediaDir)) continue;
    console.log(`\nProcessing media directory: ${mediaDir}`);

    const brandingDir = path.join(mediaDir, 'branding');
    const heroDir = path.join(mediaDir, 'hero');
    const uploadsDir = path.join(mediaDir, 'uploads');
    const projectsDir = path.join(mediaDir, 'projects');

    // 1. Optimize the primary logo: Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.webp
    const logoFile = path.join(brandingDir, 'Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.webp');
    if (fs.existsSync(logoFile)) {
      const origBuffer = fs.readFileSync(logoFile);
      const origSize = origBuffer.length;
      const buffer = await sharp(origBuffer)
        .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 85, alphaQuality: 90, effort: 6 })
        .toBuffer();
      fs.writeFileSync(logoFile, buffer);
      console.log(`Optimized logo: ${(origSize/1024).toFixed(1)} KB -> ${(buffer.length/1024).toFixed(1)} KB (-${((1 - buffer.length/origSize)*100).toFixed(1)}%)`);

      // Also create dedicated header logo variant (140x140 for 58x58 display, ultra sharp retina)
      const headerLogoFile = path.join(brandingDir, 'logo_header_58.webp');
      const headerBuf = await sharp(origBuffer)
        .resize(140, 140, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 85, alphaQuality: 90, effort: 6 })
        .toBuffer();
      fs.writeFileSync(headerLogoFile, headerBuf);
      console.log(`Created header logo variant: ${(headerBuf.length/1024).toFixed(1)} KB`);
    }

    // 2. Fix logo.svg - convert to clean vector or high-res WebP
    const logoSvg = path.join(brandingDir, 'logo.svg');
    if (fs.existsSync(logoSvg) && fs.existsSync(logoFile)) {
      const origSize = fs.statSync(logoSvg).size;
      const logoBuffer = fs.readFileSync(logoFile);
      const logoPng = await sharp(logoBuffer)
        .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toBuffer();
      const base64 = logoPng.toString('base64');
      const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180"><image href="data:image/png;base64,${base64}" width="180" height="180"/></svg>`;
      fs.writeFileSync(logoSvg, cleanSvg, 'utf8');
      console.log(`Fixed logo.svg: ${(origSize/1024).toFixed(1)} KB -> ${(cleanSvg.length/1024).toFixed(1)} KB`);
    }

    // 3. Optimize official_foundation_seal.webp
    const sealFile = path.join(brandingDir, 'official_foundation_seal.webp');
    if (fs.existsSync(sealFile)) {
      const sealBuffer = fs.readFileSync(sealFile);
      const origSize = sealBuffer.length;
      const buffer = await sharp(sealBuffer)
        .resize(350, 350, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 85, alphaQuality: 90, effort: 6 })
        .toBuffer();
      fs.writeFileSync(sealFile, buffer);
      console.log(`Optimized official seal: ${(origSize/1024).toFixed(1)} KB -> ${(buffer.length/1024).toFixed(1)} KB`);
    }

    // 4. Optimize other oversized emblem files in branding
    const emblemFiles = fs.readdirSync(brandingDir).filter(f => f.startsWith('Qasr-e-Shabir_Foundation_Emble_') && f.endsWith('.webp') && f !== 'Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.webp');
    for (const f of emblemFiles) {
      const fp = path.join(brandingDir, f);
      const s = fs.statSync(fp).size;
      if (s > 100000) {
        const fileBuf = fs.readFileSync(fp);
        const buf = await sharp(fileBuf)
          .resize(320, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 85, effort: 6 })
          .toBuffer();
        fs.writeFileSync(fp, buf);
        console.log(`Optimized ${f}: ${(s/1024).toFixed(1)} KB -> ${(buf.length/1024).toFixed(1)} KB`);
      }
    }

    // 5. Optimize hero images
    if (fs.existsSync(heroDir)) {
      const heroStudyingJpg = path.join(heroDir, 'hero_boy_studying.jpg');
      const heroStudyingWebp = path.join(heroDir, 'hero_boy_studying.webp');
      if (fs.existsSync(heroStudyingJpg)) {
        const origBuf = fs.readFileSync(heroStudyingJpg);
        const origSize = origBuf.length;
        const webpBuf = await sharp(origBuf)
          .resize(1280, 720, { fit: 'cover' })
          .webp({ quality: 80, effort: 6 })
          .toBuffer();
        fs.writeFileSync(heroStudyingWebp, webpBuf);
        const jpgBuf = await sharp(origBuf)
          .resize(1280, 720, { fit: 'cover' })
          .jpeg({ quality: 78, mozjpeg: true })
          .toBuffer();
        fs.writeFileSync(heroStudyingJpg, jpgBuf);
        console.log(`Optimized hero_boy_studying: JPG ${(origSize/1024).toFixed(1)} KB -> ${(jpgBuf.length/1024).toFixed(1)} KB | WebP: ${(webpBuf.length/1024).toFixed(1)} KB`);
      }
    }

    // 6. Optimize active hero background image: Smiling_School_Group_with_Foun_1792082807587_458986.webp
    const heroBgFile = path.join(uploadsDir, 'Smiling_School_Group_with_Foun_1792082807587_458986.webp');
    if (fs.existsSync(heroBgFile)) {
      const heroBuf = fs.readFileSync(heroBgFile);
      const origSize = heroBuf.length;
      const desktopBuf = await sharp(heroBuf)
        .resize(1280, 640, { fit: 'cover' })
        .webp({ quality: 80, effort: 6 })
        .toBuffer();
      fs.writeFileSync(heroBgFile, desktopBuf);

      const mobileHeroFile = path.join(uploadsDir, 'hero_bg_mobile.webp');
      const mobileBuf = await sharp(heroBuf)
        .resize(640, 360, { fit: 'cover' })
        .webp({ quality: 75, effort: 6 })
        .toBuffer();
      fs.writeFileSync(mobileHeroFile, mobileBuf);
      console.log(`Optimized hero background: ${(origSize/1024).toFixed(1)} KB -> ${(desktopBuf.length/1024).toFixed(1)} KB (Desktop) | ${(mobileBuf.length/1024).toFixed(1)} KB (Mobile)`);
    }

    // 7. Ensure food_ration and orphan_education in projects are optimized
    if (fs.existsSync(projectsDir)) {
      for (const f of ['food_ration.webp', 'orphan_education.webp', 'food_ration.jpg', 'orphan_education.jpg']) {
        const fp = path.join(projectsDir, f);
        if (fs.existsSync(fp)) {
          const fileBuf = fs.readFileSync(fp);
          const s = fileBuf.length;
          if (s > 40000) {
            const isWebp = f.endsWith('.webp');
            let builder = sharp(fileBuf).resize(600, 375, { fit: 'cover' });
            const buf = isWebp 
              ? await builder.webp({ quality: 75, effort: 6 }).toBuffer()
              : await builder.jpeg({ quality: 78, mozjpeg: true }).toBuffer();
            fs.writeFileSync(fp, buf);
            console.log(`Optimized project ${f}: ${(s/1024).toFixed(1)} KB -> ${(buf.length/1024).toFixed(1)} KB`);
          }
        }
      }
    }

    // 8. Optimize uploads images used in project cards
    if (fs.existsSync(uploadsDir)) {
      const uploadFiles = fs.readdirSync(uploadsDir);
      for (const f of uploadFiles) {
        if (f.endsWith('.webp') && !f.includes('mobile') && !f.includes('header')) {
          const fp = path.join(uploadsDir, f);
          const fileBuf = fs.readFileSync(fp);
          const s = fileBuf.length;
          if (s > 60000) {
            const meta = await sharp(fileBuf).metadata();
            if (meta.width > 800) {
              const buf = await sharp(fileBuf)
                .resize(800, null, { withoutEnlargement: true })
                .webp({ quality: 75, effort: 6 })
                .toBuffer();
              fs.writeFileSync(fp, buf);
              console.log(`Optimized upload ${f}: ${(s/1024).toFixed(1)} KB -> ${(buf.length/1024).toFixed(1)} KB`);
            }
          }
        }
      }
    }
  }

  console.log('\nAll media assets optimized successfully!');
}

optimizeMedia().catch(err => {
  console.error('Error optimizing media:', err);
  process.exit(1);
});

