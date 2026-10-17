const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const mediaRoot = 'C:\\Users\\Basharat\\Desktop\\qasreshabbir\\qasreshabbir_media';
const publicMedia = 'C:\\Users\\Basharat\\Desktop\\qasreshabbir\\qsf\\public\\media';
const publicBranding = 'C:\\Users\\Basharat\\Desktop\\qasreshabbir\\qsf\\public\\images\\branding';

async function tune() {
  // 1. Logo
  const emblem = path.join(mediaRoot, 'branding', 'Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.png');
  if (fs.existsSync(emblem)) {
    const logoBuf = await sharp(emblem)
      .resize(90, 90, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 75, effort: 6 })
      .toBuffer();
    console.log('Tuned logo_header_58.webp:', logoBuf.length, 'bytes');

    for (const d of [
      path.join(mediaRoot, 'branding'),
      path.join(publicMedia, 'branding'),
      publicBranding
    ]) {
      fs.writeFileSync(path.join(d, 'logo_header_58.webp'), logoBuf);
    }
  }

  // 2. Mobile Hero
  const hero = path.join(mediaRoot, 'uploads', 'Smiling_School_Group_with_Foun_1792082807587_458986.png');
  if (fs.existsSync(hero)) {
    const heroMobBuf = await sharp(hero)
      .resize(550, 310, { fit: 'cover', position: 'right' })
      .webp({ quality: 65, effort: 6 })
      .toBuffer();
    console.log('Tuned hero_bg_mobile.webp:', heroMobBuf.length, 'bytes');

    const heroDeskBuf = await sharp(hero)
      .resize(750, 400, { fit: 'cover', position: 'right' })
      .webp({ quality: 70, effort: 6 })
      .toBuffer();
    console.log('Tuned desktop hero.webp:', heroDeskBuf.length, 'bytes');

    for (const sub of ['uploads', 'branding']) {
      for (const root of [mediaRoot, publicMedia]) {
        const dest = path.join(root, sub);
        if (fs.existsSync(dest)) {
          fs.writeFileSync(path.join(dest, 'hero_bg_mobile.webp'), heroMobBuf);
          fs.writeFileSync(path.join(dest, 'Smiling_School_Group_with_Foun_1792082807587_458986.webp'), heroDeskBuf);
          fs.writeFileSync(path.join(dest, 'hero_bg_desktop.webp'), heroDeskBuf);
        }
      }
    }
  }

  // 3. Project card upload
  const p1 = path.join(mediaRoot, 'uploads', 'ChatGPT_Image_Oct_15__2026__02_1792056160133_717615.jpg');
  if (fs.existsSync(p1)) {
    const p1Buf = await sharp(p1)
      .resize(450, 280, { fit: 'cover' })
      .webp({ quality: 70, effort: 6 })
      .toBuffer();
    console.log('Tuned p1 webp:', p1Buf.length, 'bytes');
    fs.writeFileSync(path.join(mediaRoot, 'uploads', 'ChatGPT_Image_Oct_15__2026__02_1792056160133_717615.webp'), p1Buf);
    fs.writeFileSync(path.join(publicMedia, 'uploads', 'ChatGPT_Image_Oct_15__2026__02_1792056160133_717615.webp'), p1Buf);
  }

  console.log('--- Fine Tuning Complete ---');
}

tune().catch(console.error);
