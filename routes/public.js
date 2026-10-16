const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { upload, processProfilePhoto } = require('../middleware/upload');

// GET /api/public/bootstrap
router.get('/bootstrap', async (req, res) => {
  try {
    // 1. Settings
    const [settingsRows] = await db.query('SELECT setting_key, setting_val, setting_group FROM site_settings');
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.setting_key] = row.setting_val;
    });

    // 2. Categories
    const [categories] = await db.query(
      'SELECT id, slug, icon, name_en, name_ur, description_en, description_ur FROM categories WHERE is_active = 1 ORDER BY sort_order ASC'
    );

    // 3. Featured Projects
    const [projects] = await db.query(`
      SELECT p.*, c.slug as category_slug, c.name_en as category_name_en, c.name_ur as category_name_ur
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status IN ('published', 'active') AND p.is_featured = 1
      ORDER BY p.sort_order ASC, p.id ASC
      LIMIT 6
    `);

    // 4. Latest News
    const [news] = await db.query(`
      SELECT a.*, c.slug as category_slug, c.name_en as category_name_en, c.name_ur as category_name_ur
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.status = 'published'
      ORDER BY a.published_at DESC, a.id DESC
      LIMIT 4
    `);

    // 5. Impact Statistics
    const [stats] = await db.query(
      'SELECT stat_key, number_val, suffix, label_en, label_ur, icon FROM impact_stats WHERE is_active = 1 ORDER BY sort_order ASC'
    );

    return res.json({
      success: true,
      data: {
        settings,
        categories,
        projects,
        news,
        stats
      }
    });
  } catch (err) {
    console.error('[Public Bootstrap Error]', err);
    return res.status(500).json({ success: false, message: 'Error retrieving foundation data.' });
  }
});

// GET /api/public/media-status (Diagnostic endpoint to verify media storage)
router.get('/media-status', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  const candidates = [
    process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : null,
    '/home/u434697879/qasreshabbir_media',
    path.resolve(__dirname, '../../qasreshabbir_media'),
    path.resolve(__dirname, '../qasreshabbir_media'),
    path.resolve(process.cwd(), '../qasreshabbir_media'),
    path.resolve(process.cwd(), 'qasreshabbir_media')
  ].filter(Boolean);

  let activeDir = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      activeDir = c;
      break;
    }
  }

  const resolvedDir = activeDir || (process.env.MEDIA_DIR ? path.resolve(process.env.MEDIA_DIR) : path.resolve(__dirname, '../../qasreshabbir_media'));
  const exists = fs.existsSync(resolvedDir);
  const subfolders = ['branding', 'hero', 'projects', 'news', 'uploads'];
  const folderDetails = {};

  if (exists) {
    subfolders.forEach(sub => {
      const p = path.join(resolvedDir, sub);
      const nestedP = path.join(resolvedDir, 'qasreshabbir_media', sub);
      if (fs.existsSync(p)) {
        try {
          const files = fs.readdirSync(p);
          folderDetails[sub] = { exists: true, count: files.length, sample: files.slice(0, 5) };
        } catch (e) {
          folderDetails[sub] = { exists: true, error: e.message };
        }
      } else if (fs.existsSync(nestedP)) {
        try {
          const files = fs.readdirSync(nestedP);
          folderDetails[sub] = { exists: true, nested: true, count: files.length, sample: files.slice(0, 5) };
        } catch (e) {
          folderDetails[sub] = { exists: true, nested: true, error: e.message };
        }
      } else {
        // Check if there are flat backslash files in resolvedDir or resolvedDir/qasreshabbir_media
        try {
          const allFiles = fs.readdirSync(resolvedDir);
          const matched = allFiles.filter(f => f.startsWith(`${sub}\\`));
          if (matched.length > 0) {
            folderDetails[sub] = { exists: true, flatBackslash: true, count: matched.length, sample: matched.slice(0, 5) };
          } else if (fs.existsSync(path.join(resolvedDir, 'qasreshabbir_media'))) {
            const nestedFiles = fs.readdirSync(path.join(resolvedDir, 'qasreshabbir_media'));
            const nestedMatched = nestedFiles.filter(f => f.startsWith(`${sub}\\`));
            if (nestedMatched.length > 0) {
              folderDetails[sub] = { exists: true, flatBackslashNested: true, count: nestedMatched.length, sample: nestedMatched.slice(0, 5) };
            } else {
              folderDetails[sub] = { exists: false };
            }
          } else {
            folderDetails[sub] = { exists: false };
          }
        } catch (e) {
          folderDetails[sub] = { exists: false };
        }
      }
    });
  }

  return res.json({
    status: 'ok',
    envMediaDir: process.env.MEDIA_DIR || null,
    activeDir: resolvedDir,
    exists,
    folderDetails
  });
});

// GET /api/public/projects
router.get('/projects', async (req, res) => {
  try {
    const { category, search } = req.query;
    let sql = `
      SELECT p.*, c.slug as category_slug, c.name_en as category_name_en, c.name_ur as category_name_ur
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status IN ('published', 'active', 'completed')
    `;
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND c.slug = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (p.title_en LIKE ? OR p.title_ur LIKE ? OR p.short_desc_en LIKE ? OR p.short_desc_ur LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY p.sort_order ASC, p.id ASC';

    const [rows] = await db.query(sql, params);
    return res.json({ success: true, projects: rows });
  } catch (err) {
    console.error('[Public Projects Error]', err);
    return res.status(500).json({ success: false, message: 'Could not load projects.' });
  }
});

// GET /api/public/projects/:slug
router.get('/projects/:slug', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, c.slug as category_slug, c.name_en as category_name_en, c.name_ur as category_name_ur
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.status = 'published'
      LIMIT 1
    `, [req.params.slug]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const project = rows[0];

    // Additional gallery images
    const [gallery] = await db.query(
      'SELECT image_url, caption_en, caption_ur FROM project_images WHERE project_id = ? ORDER BY sort_order ASC',
      [project.id]
    );
    project.gallery = gallery;

    return res.json({ success: true, project });
  } catch (err) {
    console.error('[Public Project Detail Error]', err);
    return res.status(500).json({ success: false, message: 'Could not load project details.' });
  }
});

// GET /api/public/news
router.get('/news', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, c.slug as category_slug, c.name_en as category_name_en, c.name_ur as category_name_ur
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.status = 'published'
      ORDER BY a.published_at DESC, a.id DESC
    `);
    return res.json({ success: true, articles: rows });
  } catch (err) {
    console.error('[Public News Error]', err);
    return res.status(500).json({ success: false, message: 'Could not load news.' });
  }
});

// GET /api/public/news/:slug
router.get('/news/:slug', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, c.slug as category_slug, c.name_en as category_name_en, c.name_ur as category_name_ur
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE a.slug = ? AND a.status = 'published'
      LIMIT 1
    `, [req.params.slug]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Article not found.' });
    }

    return res.json({ success: true, article: rows[0] });
  } catch (err) {
    console.error('[Public News Detail Error]', err);
    return res.status(500).json({ success: false, message: 'Could not load article.' });
  }
});

// POST /api/public/contact
router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields (Name, Email, Subject, Message).'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const ip = req.ip || req.connection.remoteAddress || '';
    await db.query(`
      INSERT INTO contact_submissions (name, email, phone, subject, message, ip_address, status)
      VALUES (?, ?, ?, ?, ?, ?, 'new')
    `, [name.trim(), email.trim(), phone ? phone.trim() : '', subject.trim(), message.trim(), ip]);

    return res.json({
      success: true,
      message: 'Thank you! Your message has been received. Our team will contact you shortly.'
    });
  } catch (err) {
    console.error('[Contact Form Error]', err);
    return res.status(500).json({ success: false, message: 'Error submitting contact form.' });
  }
});

// POST /api/public/apply-assistance
router.post('/apply-assistance', async (req, res) => {
  try {
    const {
      applicant_name,
      guardian_name,
      cnic_or_bform,
      phone,
      alt_phone,
      city,
      address,
      assistance_type,
      family_members_count,
      monthly_income,
      details
    } = req.body;

    if (!applicant_name || !phone || !address || !details) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required application details (Name, Phone, Address, Details).'
      });
    }

    // Generate unique tracking number e.g. QASR-2026-XXXXXX
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const trackingNumber = `QASR-${new Date().getFullYear()}-${randomCode}`;

    await db.query(`
      INSERT INTO assistance_applications (
        tracking_number, applicant_name, guardian_name, cnic_or_bform,
        phone, alt_phone, city, address, assistance_type, family_members_count,
        monthly_income, details, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      trackingNumber,
      applicant_name.trim(),
      guardian_name ? guardian_name.trim() : '',
      cnic_or_bform ? cnic_or_bform.trim() : '',
      phone.trim(),
      alt_phone ? alt_phone.trim() : '',
      city ? city.trim() : '',
      address.trim(),
      assistance_type || 'orphan_education',
      parseInt(family_members_count, 10) || 1,
      monthly_income ? monthly_income.trim() : '',
      details.trim()
    ]);

    return res.json({
      success: true,
      tracking_number: trackingNumber,
      message: 'Application submitted successfully with full confidentiality.'
    });
  } catch (err) {
    console.error('[Assistance Apply Error]', err);
    return res.status(500).json({ success: false, message: 'Error submitting application.' });
  }
});

// GET /api/public/track-application/:tracking
router.get('/track-application/:tracking', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT tracking_number, assistance_type, status, created_at, updated_at
      FROM assistance_applications
      WHERE tracking_number = ?
      LIMIT 1
    `, [req.params.tracking.trim()]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tracking record not found.' });
    }

    return res.json({ success: true, application: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Tracking lookup failed.' });
  }
});

// POST /api/public/volunteer-apply
router.post('/volunteer-apply', (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Error uploading profile photograph.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      city,
      application_type,
      areas_of_interest,
      relevant_skills,
      availability,
      motivation_message
    } = req.body;

    if (!full_name || !email || !phone || !city || !motivation_message) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields (Full Name, Email, Phone, City, Motivation Message).'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Passport-style profile photograph is mandatory for your volunteer identity card. Please select and upload your photo.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // Convert photo to WebP
    let photoUrl = '';
    try {
      photoUrl = await processProfilePhoto(req.file, 'vol_photo');
    } catch (photoErr) {
      return res.status(400).json({
        success: false,
        message: photoErr.message || 'Invalid image file. Please provide a valid JPG, PNG, or WebP photo.'
      });
    }

    // Generate unique reference code e.g. VOL-2026-XXXX
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const referenceNo = `VOL-${new Date().getFullYear()}-${randomCode}`;

    const areasVal = Array.isArray(areas_of_interest) 
      ? areas_of_interest.join(', ') 
      : (areas_of_interest ? String(areas_of_interest) : '');

    const [result] = await db.query(`
      INSERT INTO volunteer_applications (
        reference_no, full_name, email, phone, city, application_type,
        areas_of_interest, relevant_skills, availability, motivation_message, photo_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      referenceNo,
      full_name.trim(),
      email.trim(),
      phone.trim(),
      city.trim(),
      application_type === 'internship' ? 'internship' : 'volunteer',
      areasVal,
      relevant_skills ? relevant_skills.trim() : '',
      availability || 'flexible',
      motivation_message.trim(),
      photoUrl
    ]);

    return res.json({
      success: true,
      applicationId: result.insertId,
      reference_no: referenceNo,
      photo_url: photoUrl,
      message: 'JazakAllahu Khair! Your volunteer application and identity photo have been submitted successfully.'
    });
  } catch (err) {
    console.error('[Volunteer Apply Error]', err);
    return res.status(500).json({ success: false, message: 'Error submitting volunteer application.' });
  }
});

// POST /api/public/donate
router.post('/donate', async (req, res) => {
  try {
    const { donor_name, donor_email, donor_phone, amount, payment_method, transaction_reference, project_id, notes } = req.body;

    if (!donor_name || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide donor name and valid donation amount.'
      });
    }

    // Verify project is active if project_id is provided
    if (project_id) {
      const [projRows] = await db.query('SELECT id, title_en, status FROM projects WHERE id = ?', [parseInt(project_id, 10)]);
      if (projRows.length > 0 && projRows[0].status === 'closed') {
        return res.status(400).json({
          success: false,
          message: 'This welfare project is administratively closed and is no longer accepting public donations. Please choose an active project or contribute to our General Welfare Fund.'
        });
      }
    }

    await db.query(`
      INSERT INTO donations (
        donor_name, donor_email, donor_phone, amount, currency,
        payment_method, transaction_reference, project_id, notes, status
      ) VALUES (?, ?, ?, ?, 'PKR', ?, ?, ?, ?, 'pending')
    `, [
      donor_name.trim(),
      donor_email ? donor_email.trim() : '',
      donor_phone ? donor_phone.trim() : '',
      parseFloat(amount),
      payment_method || 'Bank Transfer',
      transaction_reference ? transaction_reference.trim() : '',
      project_id ? parseInt(project_id, 10) : null,
      notes ? notes.trim() : ''
    ]);

    return res.json({
      success: true,
      message: 'Donation recorded successfully. JazakAllahu Khair for your noble support!'
    });
  } catch (err) {
    console.error('[Donate Error]', err);
    return res.status(500).json({ success: false, message: 'Error recording donation.' });
  }
});

module.exports = router;
