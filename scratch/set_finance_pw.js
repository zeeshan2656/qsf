const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function setPw() {
  const hash = await bcrypt.hash('Finance@QSF2026!', 10);
  await db.query('UPDATE users SET password_hash = ? WHERE username = "finance_officer"', [hash]);
  console.log('Password for finance_officer set to Finance@QSF2026!');
  process.exit(0);
}

setPw();
