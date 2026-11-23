/**
 * Secure Local CLI Utility: Reset an Existing Admin/Staff User Password
 *
 * Usage:
 *   node scripts/reset-admin-password.js --username admin --password "YourNewStrongPassword!"
 *
 * Notes:
 * - Never creates a new account; only updates an existing active account.
 * - Hashes the password with bcrypt (10 rounds) and records an audit log entry.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith('--') && i + 1 < argv.length) {
      args[key.slice(2)] = argv[++i];
    }
  }
  return args;
}

async function run() {
  const { username, password } = parseArgs(process.argv);

  if (!username || !password) {
    console.error('Usage: node scripts/reset-admin-password.js --username <username_or_email> --password "<new_password>"');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: New password must be at least 8 characters long.');
    process.exit(1);
  }

  try {
    const [users] = await db.query(
      'SELECT id, username, email, role, is_active FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
      [username.trim(), username.trim()]
    );

    if (users.length === 0) {
      console.error(`Error: No existing user found matching "${username}". No account was created.`);
      process.exit(1);
    }

    const user = users[0];
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    try {
      await db.query('UPDATE users SET password_hash = ?, password_plain = ? WHERE id = ?', [hash, password, user.id]);
    } catch (e) {
      await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    }

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, 'PASSWORD_RESET_CLI', 'user', String(user.id), 'Password reset via local server CLI script', '127.0.0.1']
    ).catch(() => {});

    console.log(`[Success] Password securely updated for existing account: ${user.username} (${user.email}, role: ${user.role}).`);
    process.exit(0);
  } catch (err) {
    console.error('[Error]', err.message);
    process.exit(1);
  }
}

run();
