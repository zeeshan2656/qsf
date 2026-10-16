const db = require('../config/db');

async function migrate() {
  console.log('--- Migrating database: adding password_plain to users ---');

  // Check if password_plain column already exists
  const [columns] = await db.query('SHOW COLUMNS FROM users LIKE "password_plain"');
  if (columns.length === 0) {
    await db.query('ALTER TABLE users ADD COLUMN password_plain VARCHAR(255) NULL AFTER password_hash');
    console.log('Added password_plain column to users table.');
  } else {
    console.log('password_plain column already exists in users table.');
  }

  // Seed known passwords for existing users
  await db.query('UPDATE users SET password_plain = ? WHERE username = "admin"', ['Admin@Qasr2026!']);
  await db.query('UPDATE users SET password_plain = ? WHERE username = "finance_officer"', ['Finance@QSF2026!']);
  await db.query('UPDATE users SET password_plain = ? WHERE username = "g_shabbir" AND (password_plain IS NULL OR password_plain = "")', ['Shabbir@QSF2026!']);
  await db.query('UPDATE users SET password_plain = ? WHERE username LIKE "officer_%" AND (password_plain IS NULL OR password_plain = "")', ['Officer@QSF2026!']);
  await db.query('UPDATE users SET password_plain = ? WHERE username LIKE "staff_%" AND (password_plain IS NULL OR password_plain = "")', ['Staff@QSF2026!']);

  // For any remaining users with null password_plain
  await db.query('UPDATE users SET password_plain = "Staff@QSF2026!" WHERE password_plain IS NULL');

  console.log('Updated existing users with plain passwords.');

  const [users] = await db.query('SELECT id, username, role, password_plain FROM users');
  console.log('Current users and passwords:');
  console.table(users);

  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
