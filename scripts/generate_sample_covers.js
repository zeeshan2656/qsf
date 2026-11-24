const db = require('../config/db');
const memorialCoverService = require('../services/memorialCoverService');

async function main() {
  const [rows] = await db.query(`
    SELECT m.id, m.slug, m.full_name, m.full_name_ur, m.father_name, m.father_name_ur,
           m.date_of_martyrdom, m.place_of_martyrdom, m.place_of_martyrdom_ur,
           m.profile_photo_url, m.cutout_photo_url, m.cover_template,
           w.name AS war_name, w.name_ur AS war_name_ur
    FROM martyrs m
    LEFT JOIN martyr_wars w ON w.id = m.primary_war_id
    WHERE m.is_deleted = 0 AND m.is_demo = 0 AND m.status = 'published'
    ORDER BY COALESCE(m.date_of_martyrdom, '0000-01-01') DESC, m.id DESC
    LIMIT 12
  `);

  console.log(`Found ${rows.length} top published martyrs:`);
  rows.forEach(r => console.log(` - [${r.id}] ${r.full_name} (${r.full_name_ur || ''}) | ${r.date_of_martyrdom ? String(r.date_of_martyrdom).slice(0, 10) : 'N/A'} | photo: ${r.profile_photo_url || 'none'}`));

  const templates = ['splatter_mountain', 'halo_dove', 'islamic_arch', 'fallen_memorial', 'maroon_ribbon', 'arabesque_plate'];

  // Assign the user-supplied reference portrait to the very first featured profile if no martyr has a photo yet
  // so the real background removal cutout, Table View original photo, and Profile dual-image display are immediately visible.
  const hasAnyPhoto = rows.some(r => Boolean(r.profile_photo_url));
  if (!hasAnyPhoto && rows.length > 0) {
    const first = rows[0];
    const sampleUrl = '/media/martyrs/photos/sample_portrait_1.jpg';
    console.log(`\nAttaching user-provided sample portrait (${sampleUrl}) to featured martyr [${first.id}] ${first.full_name} for live demonstration...`);
    await db.query('UPDATE martyrs SET profile_photo_url = ? WHERE id = ?', [sampleUrl, first.id]);
    first.profile_photo_url = sampleUrl;
  }

  // Ensure sample_portrait_1.jpg is a crisp upright studio portrait without excess headroom or poster text
  const sharp = require('sharp');
  const fs = require('fs');
  const rawCutout = './public/media/martyrs/cutouts/cutout_15_sample_portrait_1.png';
  if (fs.existsSync(rawCutout)) {
    const cleanCutout = await sharp(rawCutout)
      .extract({ left: 0, top: 0, width: 704, height: 500 })
      .trim()
      .png()
      .toBuffer();
    const { data, info } = await sharp(cleanCutout)
      .resize({ width: 520, height: 480, fit: 'inside' })
      .png()
      .toBuffer({ resolveWithObject: true });
    const w = 540;
    const h = info.height + 65;
    const studioSvg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="bg" cx="50%" cy="42%" r="68%">
            <stop offset="0%" stop-color="#475569"/>
            <stop offset="65%" stop-color="#1E293B"/>
            <stop offset="100%" stop-color="#0F172A"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
      </svg>
    `;
    const photoBuf = await sharp(Buffer.from(studioSvg))
      .composite([{ input: data, left: Math.round((w - info.width) / 2), top: h - info.height }])
      .jpeg({ quality: 92 })
      .toBuffer();
    fs.writeFileSync('./public/media/martyrs/photos/sample_portrait_1.jpg', photoBuf);
    fs.writeFileSync('../qasreshabbir_media/martyrs/photos/sample_portrait_1.jpg', photoBuf);
  }

  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const m = rows[i];
    const tpl = templates[i % templates.length];
    console.log(`Generating [${tpl}] card & EN/UR covers for [${m.id}] ${m.full_name}...`);
    const res = await memorialCoverService.generateMemorialCover(
      { ...m, cutout_photo_url: null },
      {
        template: tpl,
        portraitPos: 'center',
        forceRegenerate: Boolean(m.profile_photo_url)
      }
    );
    await db.query(`
      UPDATE martyrs SET
        cutout_photo_url = COALESCE(?, cutout_photo_url),
        memorial_card_url = COALESCE(?, memorial_card_url),
        cover_template = ?,
        memorial_cover_url = ?,
        memorial_cover_url_ur = ?,
        cover_portrait_pos = 'center'
      WHERE id = ?
    `, [res.cutoutUrl || null, res.cardUrl || null, res.template, res.coverUrlEn, res.coverUrlUr, m.id]);
    console.log(`  -> Saved Card: ${res.cardUrl || 'none'} | EN: ${res.coverUrlEn} | Cutout: ${res.cutoutUrl || 'none'}`);
  }

  console.log('\nDone generating sample memorial covers.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
