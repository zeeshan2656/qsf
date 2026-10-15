const db = require('../config/db');

async function check() {
  const [users] = await db.query('SELECT id, username, email, role, permissions, is_active FROM users');
  console.log('All Users:', users);
  process.exit(0);
}

check();
