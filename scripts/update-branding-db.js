const db = require('../config/db');

async function updateBranding() {
  await db.query("UPDATE site_settings SET setting_val = 'Qasr-e-Shabbir Foundation' WHERE setting_key = 'foundation_name_en'");
  await db.query("UPDATE site_settings SET setting_val = 'قصرِ شبیر فاؤنڈیشن' WHERE setting_key = 'foundation_name_ur'");
  await db.query("UPDATE site_settings SET setting_val = 'Qasr-e-Shabbir Foundation' WHERE setting_key IN ('account_title', 'easypaisa_title', 'jazzcash_title')");
  
  // Verify
  const [rows] = await db.query("SELECT setting_key, setting_val FROM site_settings WHERE setting_key IN ('foundation_name_en', 'foundation_name_ur', 'account_title', 'site_logo_url', 'site_stamp_url')");
  console.log('Updated branding settings:', rows);
  process.exit(0);
}

updateBranding().catch(err => {
  console.error(err);
  process.exit(1);
});
