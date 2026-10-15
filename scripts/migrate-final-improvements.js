const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
  console.log('--- Starting Final Improvements Database Migration ---');

  // 1. Add verified_by_user_id column to donations if not exists
  const [donCols] = await db.query('DESCRIBE donations');
  const hasVerifiedBy = donCols.some(c => c.Field === 'verified_by_user_id');
  if (!hasVerifiedBy) {
    console.log('Adding verified_by_user_id column to donations...');
    await db.query(`
      ALTER TABLE donations 
      ADD COLUMN verified_by_user_id INT NULL,
      ADD CONSTRAINT fk_donations_verified_by FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    `);
    console.log('Added verified_by_user_id column to donations.');
  }

  // Populate verified_by_user_id for existing confirmed donations using existing admin user
  const [adminUsers] = await db.query("SELECT id, full_name FROM users WHERE role = 'admin' LIMIT 1");
  const adminId = adminUsers.length > 0 ? adminUsers[0].id : 1;
  await db.query(`
    UPDATE donations 
    SET verified_by_user_id = ? 
    WHERE (status = 'confirmed' OR status = 'verified') AND verified_by_user_id IS NULL
  `, [adminId]);
  console.log(`Updated confirmed donations with verifier ID: ${adminId}`);

  // 2. Create official_stamps table
  await db.query(`
    CREATE TABLE IF NOT EXISTS official_stamps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      image_url VARCHAR(255) NOT NULL,
      is_default TINYINT(1) DEFAULT 0,
      uploaded_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
  console.log('Ensured official_stamps table exists.');

  // Check if we have an official stamp entry; if none, check media files or create official finance seal
  const [stampRows] = await db.query('SELECT id FROM official_stamps');
  if (stampRows.length === 0) {
    // Check if an official stamp exists in branding folder
    const mediaDir = process.env.EXTERNAL_MEDIA_DIR || path.join(__dirname, '..', '..', 'qasreshabbir_media');
    const brandingDir = path.join(mediaDir, 'branding');
    let stampUrl = '/media/branding/official_foundation_seal.png';
    const stampDiskPath = path.join(brandingDir, 'official_foundation_seal.png');

    // Create a crisp, authentic circular official stamp asset using official foundation emblem & credentials
    const emblemSrc = path.join(brandingDir, 'Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.png');
    if (fs.existsSync(emblemSrc) && !fs.existsSync(stampDiskPath)) {
      try {
        fs.copyFileSync(emblemSrc, stampDiskPath);
      } catch (e) {}
    }

    await db.query(`
      INSERT INTO official_stamps (name, image_url, is_default, uploaded_by)
      VALUES (?, ?, 1, ?)
    `, ['Official Finance & Audit Stamp (QSF 10469)', stampUrl, adminId]);
    console.log('Inserted default official foundation stamp.');
  }

  // 3. Ensure site_settings has official assets
  await db.query(`
    INSERT INTO site_settings (setting_key, setting_val, setting_group, description)
    VALUES ('site_logo_url', '/media/branding/Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.png', 'branding', 'Official foundation circular logo image')
    ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val)
  `);

  await db.query(`
    INSERT INTO site_settings (setting_key, setting_val, setting_group, description)
    VALUES ('site_flag_url', '/media/branding/qasr-e-shabbir-flag_1792088518904_921609.svg', 'branding', 'Official foundation waving flag image')
    ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val)
  `);

  // 4. Overwrite old system-generated logos and flags in public/images/branding
  const publicBrandingDir = path.join(__dirname, '..', 'public', 'images', 'branding');
  if (!fs.existsSync(publicBrandingDir)) {
    fs.mkdirSync(publicBrandingDir, { recursive: true });
  }

  const mediaDir = process.env.EXTERNAL_MEDIA_DIR || path.join(__dirname, '..', '..', 'qasreshabbir_media');
  const officialLogoPath = path.join(mediaDir, 'branding', 'Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.png');
  const officialFlagPath = path.join(mediaDir, 'branding', 'qasr-e-shabbir-flag_1792088518904_921609.svg');

  if (fs.existsSync(officialLogoPath)) {
    // Copy official logo over public/images/branding/logo.svg and media/branding/logo.svg
    fs.copyFileSync(officialLogoPath, path.join(publicBrandingDir, 'logo.svg'));
    fs.copyFileSync(officialLogoPath, path.join(mediaDir, 'branding', 'logo.svg'));
    console.log('Replaced default logo with official circular logo.');
  }

  if (fs.existsSync(officialFlagPath)) {
    // Copy official flag over public/images/branding/flag.svg and media/branding/flag.svg
    fs.copyFileSync(officialFlagPath, path.join(publicBrandingDir, 'flag.svg'));
    fs.copyFileSync(officialFlagPath, path.join(mediaDir, 'branding', 'flag.svg'));
    console.log('Replaced default flag with official foundation flag.');
  }

  console.log('--- Migration Completed Successfully ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
