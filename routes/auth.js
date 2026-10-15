const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    const [users] = await db.query(
      'SELECT id, username, email, password_hash, full_name, role, designation, designation_ur, photo_url, permissions, is_active FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username.trim(), username.trim()]
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

    const isMatch = await bcrypt.compare(password, user.password_hash);
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

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)',
      [user.id, 'LOGIN', 'user', String(user.id), req.ip || req.connection.remoteAddress]
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      user: req.session.user
    });
  } catch (err) {
    console.error('[Auth Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
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
