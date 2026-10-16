const pool = require('../config/db');

async function run() {
  const [rows] = await pool.query("SELECT setting_key, setting_val FROM site_settings WHERE setting_key LIKE '%hero%' OR setting_key LIKE '%logo%' OR setting_key LIKE '%banner%'");
  console.table(rows);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
