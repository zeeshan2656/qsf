const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../config/db');

// In-memory store for single-use, time-limited password recovery codes (hashed)
// Map<userId, { hash: Buffer, expiresAt: number, attempts: number }>
const passwordResetTokens = new Map();
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RESET_ATTEMPTS = 5;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please wait a few minutes and try again.'
  }
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password recovery attempts. Please try again later.'
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    const identifier = String(username).trim();
    const [users] = await db.query(
      'SELECT id, username, email, password_hash, full_name, role, designation, designation_ur, photo_url, permissions, is_active FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
      [identifier, identifier]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username and password.'
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'This administrative account has been deactivated.'
      });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please use the password recovery option if needed.'
      });
    }

    const isMatch = await bcrypt.compare(String(password), user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username and password.'
      });
    }

    // Parse modular permissions
    let perms = [];
    if (user.role === 'superadmin' || user.role === 'admin') {
      perms = ['overview', 'users', 'accounts', 'projects', 'volunteers', 'articles', 'applications', 'donations', 'submissions', 'settings'];
    } else if (user.permissions) {
      try {
        perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      } catch (e) {
        perms = String(user.permissions).split(',').map(s => s.trim());
      }
    }

    // Set user session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      designation: user.designation,
      designation_ur: user.designation_ur,
      photo_url: user.photo_url,
      permissions: perms
    };

    // Audit log (non-blocking so login never fails due to audit insert)
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)',
      [user.id, 'LOGIN', 'user', String(user.id), req.ip || (req.connection && req.connection.remoteAddress) || '']
    ).catch((logErr) => {
      console.warn('[Auth Audit Warning]', logErr.message);
    });

    // Explicitly persist session before responding
    return req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[Session Save Error]', saveErr);
        return res.status(500).json({
          success: false,
          message: 'Could not establish administrative session. Please try again.'
        });
      }
      return res.json({
        success: true,
        message: 'Login successful.',
        user: req.session.user
      });
    });
  } catch (err) {
    console.error('[Auth Error]', err);
    const isDbError = ['ER_BAD_DB_ERROR', 'ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT'].includes(err.code);
    return res.status(500).json({
      success: false,
      message: isDbError
        ? 'Database service is unavailable. Please ensure MySQL is running and the qasreshabbir database is connected.'
        : 'Server error during authentication.'
    });
  }
});

// POST /api/auth/request-reset (Generates a secure one-time recovery code logged on the server console)
router.post('/request-reset', resetLimiter, async (req, res) => {
  try {
    const { identifier } = req.body || {};
    if (!identifier || !String(identifier).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your username or registered email address.'
      });
    }

    const cleanId = String(identifier).trim();
    const [users] = await db.query(
      'SELECT id, username, email, is_active FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
      [cleanId, cleanId]
    );

    if (users.length > 0 && users[0].is_active) {
      const user = users[0];
      const rawCode = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char cryptographic hex code
      const codeHash = crypto.createHash('sha256').update(rawCode).digest();
      passwordResetTokens.set(user.id, {
        hash: codeHash,
        expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
        attempts: 0
      });

      console.log('=======================================================');
      console.log('[ADMIN PASSWORD RECOVERY] One-Time Recovery Code');
      console.log(`Account:       ${user.username} (${user.email})`);
      console.log(`Recovery Code: ${rawCode}`);
      console.log('Expires In:    15 minutes (single use)');
      console.log('=======================================================');
    }

    return res.json({
      success: true,
      message: 'If an active account matches that username or email, a one-time recovery code has been generated in the server console (valid for 15 minutes).'
    });
  } catch (err) {
    console.error('[Password Reset Request Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Could not process recovery request. Please check database connectivity.'
    });
  }
});

// POST /api/auth/reset-password (Verifies one-time recovery code and updates password securely)
router.post('/reset-password', resetLimiter, async (req, res) => {
  try {
    const { identifier, recoveryCode, newPassword } = req.body || {};

    if (!identifier || !recoveryCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Username/email, recovery code, and new password are all required.'
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.'
      });
    }

    const cleanId = String(identifier).trim();
    const [users] = await db.query(
      'SELECT id, username, is_active FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
      [cleanId, cleanId]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired recovery code.'
      });
    }

    const user = users[0];
    const tokenRecord = passwordResetTokens.get(user.id);
    if (!tokenRecord || Date.now() > tokenRecord.expiresAt || tokenRecord.attempts >= MAX_RESET_ATTEMPTS) {
      passwordResetTokens.delete(user.id);
      return res.status(400).json({
        success: false,
        message: 'Recovery code has expired or exceeded maximum attempts. Please request a new code.'
      });
    }

    const submittedHash = crypto.createHash('sha256').update(String(recoveryCode).trim().toUpperCase()).digest();
    const isValid = submittedHash.length === tokenRecord.hash.length && crypto.timingSafeEqual(submittedHash, tokenRecord.hash);

    if (!isValid) {
      tokenRecord.attempts += 1;
      if (tokenRecord.attempts >= MAX_RESET_ATTEMPTS) {
        passwordResetTokens.delete(user.id);
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid recovery code. Please verify the code from the server console.'
      });
    }

    // Consume single-use token
    passwordResetTokens.delete(user.id);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(newPassword), salt);

    try {
      await db.query(
        'UPDATE users SET password_hash = ?, password_plain = ? WHERE id = ?',
        [passwordHash, String(newPassword), user.id]
      );
    } catch (colErr) {
      // Fallback if password_plain column does not exist
      await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
    }

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, 'PASSWORD_RESET', 'user', String(user.id), 'Password updated via verified recovery code', req.ip || '']
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'Your password has been securely updated. You may now sign in with your new password.'
    });
  } catch (err) {
    console.error('[Password Reset Confirm Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while resetting password.'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  if (req.session && req.session.user) {
    const userId = req.session.user.id;
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)',
      [userId, 'LOGOUT', 'user', String(userId), req.ip || req.connection.remoteAddress]
    ).catch(() => {});

    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Could not log out.' });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Logged out successfully.' });
    });
  } else {
    return res.json({ success: true, message: 'Already logged out.' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  if (req.session && req.session.user) {
    try {
      const [rows] = await db.query(
        'SELECT id, username, email, full_name, role, designation, designation_ur, photo_url, permissions, is_active FROM users WHERE id = ? LIMIT 1',
        [req.session.user.id]
      );
      if (!rows.length || !rows[0].is_active) {
        req.session.destroy(() => {});
        return res.json({ authenticated: false, user: null });
      }
      const u = rows[0];
      let perms = [];
      if (u.role === 'superadmin' || u.role === 'admin') {
        perms = ['overview', 'users', 'accounts', 'projects', 'volunteers', 'articles', 'applications', 'donations', 'submissions', 'settings'];
      } else if (u.permissions) {
        try {
          perms = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions;
        } catch (e) {
          perms = String(u.permissions).split(',').map(s => s.trim());
        }
      }

      req.session.user = {
        id: u.id,
        username: u.username,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        designation: u.designation,
        designation_ur: u.designation_ur,
        photo_url: u.photo_url,
        permissions: perms
      };

      return res.json({
        authenticated: true,
        user: req.session.user
      });
    } catch (e) {
      return res.json({
        authenticated: true,
        user: req.session.user
      });
    }
  }
  return res.json({
    authenticated: false,
    user: null
  });
});

module.exports = router;
