const { query } = require('../config/db');

async function seed() {
  const settings = [
    { key: 'whatsapp_enabled', val: '1' },
    { key: 'whatsapp_number', val: '+923000817702' },
    { key: 'whatsapp_message', val: 'Assalam-o-Alaikum, I want to inquire about Qasr-e-Shabbir Foundation welfare projects and donations.' }
  ];

  for (const s of settings) {
    await query(
      'INSERT INTO site_settings (setting_key, setting_val, setting_group) VALUES (?, ?, "general") ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val)',
      [s.key, s.val]
    );
  }
  console.log('WhatsApp settings seeded successfully in database.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
