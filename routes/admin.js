const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { upload, mediaRoot, processProfilePhoto, optimizeUploadedImage } = require('../middleware/upload');

const cache = require('../config/cache');

// Apply auth middleware to all admin endpoints
router.use(requireAuth);

// Automatically invalidate public cache on any mutating admin action (POST/PUT/DELETE/PATCH)
router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        cache.invalidateGroup('public');
      }
    });
  }
  next();
});

// GET /api/admin/overview
router.get('/overview', requirePermission('overview'), async (req, res) => {
  try {
    const [[{ projectCount }]] = await db.query('SELECT COUNT(*) as projectCount FROM projects');
    const [[{ articleCount }]] = await db.query('SELECT COUNT(*) as articleCount FROM articles');
    const [[{ submissionCount }]] = await db.query('SELECT COUNT(*) as submissionCount FROM contact_submissions WHERE status = "new"');
    const [[{ pendingAppsCount }]] = await db.query('SELECT COUNT(*) as pendingAppsCount FROM assistance_applications WHERE status = "pending"');
    const [[{ totalDonations }]] = await db.query('SELECT COALESCE(SUM(amount), 0) as totalDonations FROM donations WHERE status = "verified"');
    const [[{ pendingDonationsCount }]] = await db.query('SELECT COUNT(*) as pendingDonationsCount FROM donations WHERE status = "pending"');

    // Recent 5 contact submissions
    const [recentSubmissions] = await db.query(
      'SELECT id, name, email, subject, created_at, status FROM contact_submissions ORDER BY created_at DESC LIMIT 5'
    );

    // Recent 5 assistance applications
    const [recentApplications] = await db.query(
      'SELECT id, tracking_number, applicant_name, phone, assistance_type, status, created_at FROM assistance_applications ORDER BY created_at DESC LIMIT 5'
    );

    return res.json({
      success: true,
      data: {
        counts: {
          projects: projectCount,
          articles: articleCount,
          unreadSubmissions: submissionCount,
          pendingApplications: pendingAppsCount,
          verifiedDonationsTotal: totalDonations,
          pendingDonations: pendingDonationsCount
        },
        recentSubmissions,
        recentApplications
      }
    });
  } catch (err) {
    console.error('[Admin Overview Error]', err);
    return res.status(500).json({ success: false, message: 'Could not load admin overview.' });
  }
});

// ==================== PROJECTS CRUD ====================
// GET /api/admin/projects (With advanced filters, stats, sorting and pagination)
router.get('/projects', requirePermission('projects'), async (req, res) => {
  try {
    const { status, category_id, search, progress_range, sort_by, page, limit } = req.query;

    // 1. Calculate overall project status metrics
    const [[stats]] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN LOWER(status) IN ('active', 'published') THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN LOWER(status) = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN LOWER(status) = 'closed' THEN 1 ELSE 0 END) as closed_count,
        SUM(CASE WHEN LOWER(status) = 'draft' THEN 1 ELSE 0 END) as draft_count,
        COALESCE(SUM(goal_amount), 0) as total_goal_amount,
        COALESCE(SUM(raised_amount), 0) as total_raised_amount
      FROM projects
    `);

    // 2. Build filtered projects query
    let whereClause = ' WHERE 1=1';
    const filterParams = [];

    // Filter by status
    if (status && status !== 'all') {
      const s = status.toLowerCase();
      if (s === 'active') {
        whereClause += " AND LOWER(p.status) IN ('active', 'published')";
      } else {
        whereClause += ' AND LOWER(p.status) = ?';
        filterParams.push(s);
      }
    }

    // Filter by category
    if (category_id && category_id !== 'all') {
      whereClause += ' AND p.category_id = ?';
      filterParams.push(parseInt(category_id, 10));
    }

    // Filter by search keyword
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClause += ' AND (p.title_en LIKE ? OR p.title_ur LIKE ? OR p.short_desc_en LIKE ? OR p.short_desc_ur LIKE ? OR p.notes LIKE ?)';
      filterParams.push(q, q, q, q, q);
    }

    // Filter by funding progress range
    if (progress_range && progress_range !== 'all') {
      if (progress_range === '0-25') {
        whereClause += ' AND (p.goal_amount > 0 AND (p.raised_amount / p.goal_amount) <= 0.25)';
      } else if (progress_range === '25-50') {
        whereClause += ' AND (p.goal_amount > 0 AND (p.raised_amount / p.goal_amount) > 0.25 AND (p.raised_amount / p.goal_amount) <= 0.50)';
      } else if (progress_range === '50-75') {
        whereClause += ' AND (p.goal_amount > 0 AND (p.raised_amount / p.goal_amount) > 0.50 AND (p.raised_amount / p.goal_amount) <= 0.75)';
      } else if (progress_range === '75-99' || progress_range === '75-100') {
        whereClause += ' AND (p.goal_amount > 0 AND (p.raised_amount / p.goal_amount) > 0.75 AND (p.raised_amount / p.goal_amount) <= 1.0)';
      } else if (progress_range === '100+') {
        whereClause += ' AND (p.goal_amount > 0 AND (p.raised_amount / p.goal_amount) >= 1.0)';
      }
    }

    // Total count before pagination
    const countSql = `SELECT COUNT(*) as filtered_total FROM projects p ${whereClause}`;
    const [[countResult]] = await db.query(countSql, filterParams);
    const totalFiltered = countResult ? parseInt(countResult.filtered_total, 10) : 0;

    let sql = `
      SELECT 
        p.*,
        c.name_en as category_name_en,
        c.name_ur as category_name_ur,
        COALESCE(d.confirmed_total, 0) as ledger_confirmed_total,
        COALESCE(d.confirmed_count, 0) as confirmed_count,
        COALESCE(d.pending_count, 0) as pending_count,
        GREATEST(0, CAST(p.goal_amount AS DECIMAL(12,2)) - CAST(p.raised_amount AS DECIMAL(12,2))) as remaining_amount,
        CASE 
          WHEN p.goal_amount > 0 THEN ROUND((p.raised_amount / p.goal_amount) * 100)
          ELSE 0 
        END as progress_pct
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT 
          project_id,
          COALESCE(SUM(CASE WHEN LOWER(status) IN ('confirmed', 'verified') THEN amount ELSE 0 END), 0) as confirmed_total,
          SUM(CASE WHEN LOWER(status) IN ('confirmed', 'verified') THEN 1 ELSE 0 END) as confirmed_count,
          SUM(CASE WHEN LOWER(status) = 'pending' THEN 1 ELSE 0 END) as pending_count
        FROM donations
        WHERE project_id IS NOT NULL
        GROUP BY project_id
      ) d ON p.id = d.project_id
      ${whereClause}
    `;
    const params = [...filterParams];

    // Sorting
    if (sort_by === 'newest') {
      sql += ' ORDER BY p.id DESC';
    } else if (sort_by === 'oldest') {
      sql += ' ORDER BY p.id ASC';
    } else if (sort_by === 'goal_desc') {
      sql += ' ORDER BY p.goal_amount DESC';
    } else if (sort_by === 'raised_desc') {
      sql += ' ORDER BY p.raised_amount DESC';
    } else if (sort_by === 'progress_desc') {
      sql += ' ORDER BY progress_pct DESC';
    } else if (sort_by === 'title_asc') {
      sql += ' ORDER BY p.title_en ASC';
    } else {
      sql += ' ORDER BY p.sort_order ASC, p.id DESC';
    }

    // Pagination
    let pageNum = page ? parseInt(page, 10) : 1;
    let limitNum = limit ? parseInt(limit, 10) : 50;
    if (pageNum < 1) pageNum = 1;
    if (limitNum < 1) limitNum = 12;

    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, (pageNum - 1) * limitNum);

    const [rows] = await db.query(sql, params);

    return res.json({
      success: true,
      projects: rows.map(r => ({
        ...r,
        goal_amount: parseFloat(r.goal_amount) || 0,
        raised_amount: parseFloat(r.raised_amount) || 0,
        remaining_amount: parseFloat(r.remaining_amount) || 0,
        ledger_confirmed_total: parseFloat(r.ledger_confirmed_total) || 0,
        confirmed_count: parseInt(r.confirmed_count, 10) || 0,
        pending_count: parseInt(r.pending_count, 10) || 0,
        progress_pct: parseInt(r.progress_pct, 10) || 0,
        progress_percentage: parseInt(r.progress_pct, 10) || 0
      })),
      stats: {
        total: stats.total || 0,
        active_count: stats.active_count || 0,
        completed_count: stats.completed_count || 0,
        closed_count: stats.closed_count || 0,
        draft_count: stats.draft_count || 0,
        total_goal_amount: parseFloat(stats.total_goal_amount) || 0,
        total_raised_amount: parseFloat(stats.total_raised_amount) || 0
      },
      pagination: {
        total: totalFiltered,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalFiltered / limitNum) || 1
      }
    });
  } catch (err) {
    console.error('[Admin Projects List Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load projects.' });
  }
});

// GET /api/admin/projects/:id (Complete project details & dedicated donation ledger)
router.get('/projects/:id', requirePermission('projects'), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { search, status, payment_method, date_range } = req.query;

    const [pRows] = await db.query(`
      SELECT p.*, c.name_en as category_name_en, c.name_ur as category_name_ur
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [projectId]);

    if (!pRows.length) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    const project = pRows[0];

    // Project donation financial totals (Only confirmed contribute to actual received total)
    const [[finStats]] = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN LOWER(status) IN ('confirmed', 'verified') THEN amount ELSE 0 END), 0) as confirmed_total,
        SUM(CASE WHEN LOWER(status) IN ('confirmed', 'verified') THEN 1 ELSE 0 END) as confirmed_count,
        COALESCE(SUM(CASE WHEN LOWER(status) = 'pending' THEN amount ELSE 0 END), 0) as pending_total,
        SUM(CASE WHEN LOWER(status) = 'pending' THEN 1 ELSE 0 END) as pending_count,
        COALESCE(SUM(CASE WHEN LOWER(status) = 'refunded' THEN amount ELSE 0 END), 0) as refunded_total,
        SUM(CASE WHEN LOWER(status) = 'refunded' THEN 1 ELSE 0 END) as refunded_count,
        COALESCE(SUM(CASE WHEN LOWER(status) = 'failed' THEN amount ELSE 0 END), 0) as failed_total,
        SUM(CASE WHEN LOWER(status) = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM donations
      WHERE project_id = ?
    `, [projectId]);

    // Dedicated Project Donation Ledger
    let ledgerSql = `
      SELECT d.id, d.donor_name, d.donor_email, d.donor_phone, d.amount, d.payment_method, 
             d.transaction_reference, d.notes, d.status, d.confirmed_at, d.created_at,
             u_v.full_name as verified_by_name
      FROM donations d
      LEFT JOIN users u_v ON d.verified_by_user_id = u_v.id
      WHERE d.project_id = ?
    `;
    const ledgerParams = [projectId];

    if (status && status !== 'all') {
      const s = status.toLowerCase();
      if (s === 'confirmed') {
        ledgerSql += " AND LOWER(d.status) IN ('confirmed', 'verified')";
      } else {
        ledgerSql += ' AND LOWER(d.status) = ?';
        ledgerParams.push(s);
      }
    }

    if (payment_method && payment_method !== 'all') {
      ledgerSql += ' AND LOWER(d.payment_method) LIKE ?';
      ledgerParams.push(`%${payment_method.toLowerCase()}%`);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      ledgerSql += ' AND (d.donor_name LIKE ? OR d.donor_phone LIKE ? OR d.donor_email LIKE ? OR d.transaction_reference LIKE ? OR d.notes LIKE ?)';
      ledgerParams.push(q, q, q, q, q);
    }

    if (date_range) {
      if (date_range === 'today') {
        ledgerSql += ' AND DATE(d.created_at) = CURDATE()';
      } else if (date_range === 'week') {
        ledgerSql += ' AND d.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      } else if (date_range === 'month') {
        ledgerSql += ' AND d.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      } else if (date_range === 'year') {
        ledgerSql += ' AND d.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
      }
    }

    ledgerSql += ' ORDER BY d.created_at DESC, d.id DESC';
    const [donations] = await db.query(ledgerSql, ledgerParams);

    const goalNum = parseFloat(project.goal_amount) || 0;
    const raisedNum = parseFloat(project.raised_amount) || 0;
    const remainingNum = Math.max(0, goalNum - raisedNum);
    const progressPct = goalNum > 0 ? Math.round((raisedNum / goalNum) * 100) : 0;

    return res.json({
      success: true,
      project: {
        ...project,
        goal_amount: goalNum,
        raised_amount: raisedNum,
        remaining_amount: remainingNum,
        progress_pct: progressPct,
        progress_percentage: progressPct
      },
      ledger_stats: {
        confirmed_total: parseFloat(finStats.confirmed_total) || 0,
        confirmed_count: parseInt(finStats.confirmed_count, 10) || 0,
        pending_total: parseFloat(finStats.pending_total) || 0,
        pending_count: parseInt(finStats.pending_count, 10) || 0,
        refunded_total: parseFloat(finStats.refunded_total) || 0,
        refunded_count: parseInt(finStats.refunded_count, 10) || 0,
        failed_total: parseFloat(finStats.failed_total) || 0,
        failed_count: parseInt(finStats.failed_count, 10) || 0
      },
      donations: donations.map(d => ({
        ...d,
        amount: parseFloat(d.amount) || 0,
        status: (d.status === 'verified' ? 'confirmed' : d.status)
      }))
    });
  } catch (err) {
    console.error('[Admin Project Details & Ledger Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve project details and ledger.' });
  }
});

// POST /api/admin/projects (Create new welfare project)
router.post('/projects', requirePermission('projects'), async (req, res) => {
  try {
    const {
      title_en, title_ur, category_id, short_desc_en, short_desc_ur,
      full_desc_en, full_desc_ur, image_url, goal_amount, raised_amount,
      beneficiaries_count, beneficiaries_label_en, beneficiaries_label_ur,
      start_date, end_date, expected_completion_date, notes,
      status, is_featured, sort_order
    } = req.body;

    if (!title_en || !title_ur) {
      return res.status(400).json({ success: false, message: 'English and Urdu titles are required.' });
    }

    const cleanStatus = status ? status.toLowerCase() : 'active';
    const slug = title_en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

    const [result] = await db.query(`
      INSERT INTO projects (
        slug, category_id, title_en, title_ur, short_desc_en, short_desc_ur,
        full_desc_en, full_desc_ur, image_url, goal_amount, raised_amount,
        beneficiaries_count, beneficiaries_label_en, beneficiaries_label_ur,
        start_date, end_date, expected_completion_date, notes,
        status, is_featured, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      slug, category_id ? parseInt(category_id, 10) : null, title_en.trim(), title_ur.trim(),
      short_desc_en ? short_desc_en.trim() : '', short_desc_ur ? short_desc_ur.trim() : '',
      full_desc_en ? full_desc_en.trim() : '', full_desc_ur ? full_desc_ur.trim() : '',
      image_url || '/media/projects/orphan_education.jpg',
      parseFloat(goal_amount) || 0,
      parseFloat(raised_amount) || 0,
      parseInt(beneficiaries_count, 10) || 0,
      beneficiaries_label_en || 'Beneficiaries',
      beneficiaries_label_ur || 'مستفیدین',
      start_date || null,
      end_date || null,
      expected_completion_date || null,
      notes ? notes.trim() : null,
      cleanStatus,
      is_featured ? 1 : 0,
      parseInt(sort_order, 10) || 0
    ]);

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'CREATE_PROJECT',
        'project',
        String(result.insertId),
        JSON.stringify({ title_en, goal_amount, status: cleanStatus })
      ]
    ).catch(() => {});

    return res.json({ success: true, id: result.insertId, message: 'Welfare project created successfully.' });
  } catch (err) {
    console.error('[Admin Project Create]', err);
    return res.status(500).json({ success: false, message: 'Error creating project.' });
  }
});

// PUT /api/admin/projects/:id (Edit project details)
router.put('/projects/:id', requirePermission('projects'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title_en, title_ur, category_id, short_desc_en, short_desc_ur,
      full_desc_en, full_desc_ur, image_url, goal_amount, raised_amount,
      beneficiaries_count, beneficiaries_label_en, beneficiaries_label_ur,
      start_date, end_date, expected_completion_date, notes,
      status, is_featured, sort_order
    } = req.body;

    const [existing] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Project not found.' });

    const cleanStatus = status ? status.toLowerCase() : existing[0].status;

    await db.query(`
      UPDATE projects SET
        category_id = ?,
        title_en = ?,
        title_ur = ?,
        short_desc_en = ?,
        short_desc_ur = ?,
        full_desc_en = ?,
        full_desc_ur = ?,
        image_url = ?,
        goal_amount = ?,
        raised_amount = ?,
        beneficiaries_count = ?,
        beneficiaries_label_en = ?,
        beneficiaries_label_ur = ?,
        start_date = ?,
        end_date = ?,
        expected_completion_date = ?,
        notes = ?,
        status = ?,
        is_featured = ?,
        sort_order = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      category_id ? parseInt(category_id, 10) : null,
      title_en ? title_en.trim() : existing[0].title_en,
      title_ur ? title_ur.trim() : existing[0].title_ur,
      short_desc_en !== undefined ? short_desc_en.trim() : existing[0].short_desc_en,
      short_desc_ur !== undefined ? short_desc_ur.trim() : existing[0].short_desc_ur,
      full_desc_en !== undefined ? full_desc_en.trim() : existing[0].full_desc_en,
      full_desc_ur !== undefined ? full_desc_ur.trim() : existing[0].full_desc_ur,
      image_url !== undefined ? image_url : existing[0].image_url,
      goal_amount !== undefined ? parseFloat(goal_amount) : existing[0].goal_amount,
      raised_amount !== undefined ? parseFloat(raised_amount) : existing[0].raised_amount,
      beneficiaries_count !== undefined ? parseInt(beneficiaries_count, 10) : existing[0].beneficiaries_count,
      beneficiaries_label_en !== undefined ? beneficiaries_label_en : existing[0].beneficiaries_label_en,
      beneficiaries_label_ur !== undefined ? beneficiaries_label_ur : existing[0].beneficiaries_label_ur,
      start_date !== undefined ? (start_date || null) : existing[0].start_date,
      end_date !== undefined ? (end_date || null) : existing[0].end_date,
      expected_completion_date !== undefined ? (expected_completion_date || null) : existing[0].expected_completion_date,
      notes !== undefined ? (notes ? notes.trim() : null) : existing[0].notes,
      cleanStatus,
      is_featured !== undefined ? (is_featured ? 1 : 0) : existing[0].is_featured,
      sort_order !== undefined ? parseInt(sort_order, 10) : existing[0].sort_order,
      id
    ]);

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'UPDATE_PROJECT',
        'project',
        String(id),
        JSON.stringify({ title_en, status: cleanStatus, goal_amount })
      ]
    ).catch(() => {});

    return res.json({ success: true, message: 'Welfare project updated successfully.' });
  } catch (err) {
    console.error('[Admin Project Update]', err);
    return res.status(500).json({ success: false, message: 'Error updating project.' });
  }
});

// PUT /api/admin/projects/:id/status (Mark Completed, Closed, or Active with confirmation tracking)
router.put('/projects/:id/status', requirePermission('projects'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const validStatuses = ['active', 'completed', 'closed', 'draft'];
    if (!status || !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid project status provided.' });
    }

    const cleanStatus = status.toLowerCase();
    const [existing] = await db.query('SELECT id, title_en, status FROM projects WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ success: false, message: 'Project not found.' });

    const oldStatus = existing[0].status;
    const completedAtVal = cleanStatus === 'completed' ? new Date() : (cleanStatus === 'active' ? null : undefined);
    const closedAtVal = cleanStatus === 'closed' ? new Date() : (cleanStatus === 'active' ? null : undefined);

    let sql = 'UPDATE projects SET status = ?, updated_at = NOW()';
    const params = [cleanStatus];

    if (completedAtVal !== undefined) {
      sql += ', completed_at = ?';
      params.push(completedAtVal);
    }
    if (closedAtVal !== undefined) {
      sql += ', closed_at = ?';
      params.push(closedAtVal);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await db.query(sql, params);

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'CHANGE_PROJECT_STATUS',
        'project',
        String(id),
        JSON.stringify({ oldStatus, newStatus: cleanStatus, reason: reason || 'Admin status change' })
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      message: `Project status successfully updated to ${cleanStatus.toUpperCase()}. All historical donations and ledger entries remain safely preserved.`
    });
  } catch (err) {
    console.error('[Admin Project Status Change]', err);
    return res.status(500).json({ success: false, message: 'Failed to update project status.' });
  }
});

// DELETE /api/admin/projects/:id
router.delete('/projects/:id', requirePermission('projects'), async (req, res) => {
  try {
    const [pRows] = await db.query('SELECT title_en FROM projects WHERE id = ?', [req.params.id]);
    if (!pRows.length) return res.status(404).json({ success: false, message: 'Project not found.' });

    // Check if project has associated donations
    const [[{ donationCount }]] = await db.query('SELECT COUNT(*) as donationCount FROM donations WHERE project_id = ?', [req.params.id]);
    if (donationCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete project because it has ${donationCount} donation record(s) attached. Please mark the project as Closed instead to preserve financial audit history.`
      });
    }

    await db.query('DELETE FROM projects WHERE id = ?', [req.params.id]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'DELETE_PROJECT',
        'project',
        String(req.params.id),
        JSON.stringify({ title: pRows[0].title_en })
      ]
    ).catch(() => {});

    return res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error deleting project.' });
  }
});

// ==================== ARTICLES CRUD ====================
// GET /api/admin/articles
router.get('/articles', requirePermission('articles'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, c.name_en as category_name_en, c.name_ur as category_name_ur
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      ORDER BY a.published_at DESC, a.id DESC
    `);
    return res.json({ success: true, articles: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load articles.' });
  }
});

// POST /api/admin/articles
router.post('/articles', requirePermission('articles'), async (req, res) => {
  try {
    const { title_en, title_ur, category_id, short_desc_en, short_desc_ur, content_en, content_ur, image_url, published_at, status } = req.body;

    if (!title_en || !title_ur) {
      return res.status(400).json({ success: false, message: 'Title is required in English and Urdu.' });
    }

    const slug = title_en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

    const [result] = await db.query(`
      INSERT INTO articles (
        slug, category_id, title_en, title_ur, short_desc_en, short_desc_ur,
        content_en, content_ur, image_url, published_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      slug, category_id || null, title_en, title_ur,
      short_desc_en || '', short_desc_ur || '',
      content_en || '', content_ur || '',
      image_url || '',
      published_at || new Date().toISOString().split('T')[0],
      status || 'published'
    ]);

    return res.json({ success: true, id: result.insertId, message: 'Article created successfully.' });
  } catch (err) {
    console.error('[Admin Article Create]', err);
    return res.status(500).json({ success: false, message: 'Error creating article.' });
  }
});

// PUT /api/admin/articles/:id
router.put('/articles/:id', requirePermission('articles'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title_en, title_ur, category_id, short_desc_en, short_desc_ur, content_en, content_ur, image_url, published_at, status } = req.body;

    await db.query(`
      UPDATE articles SET
        category_id = ?,
        title_en = ?,
        title_ur = ?,
        short_desc_en = ?,
        short_desc_ur = ?,
        content_en = ?,
        content_ur = ?,
        image_url = ?,
        published_at = ?,
        status = ?
      WHERE id = ?
    `, [
      category_id || null, title_en, title_ur,
      short_desc_en || '', short_desc_ur || '',
      content_en || '', content_ur || '',
      image_url || '',
      published_at || new Date().toISOString().split('T')[0],
      status || 'published',
      id
    ]);

    return res.json({ success: true, message: 'Article updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error updating article.' });
  }
});

// DELETE /api/admin/articles/:id
router.delete('/articles/:id', requirePermission('articles'), async (req, res) => {
  try {
    await db.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Article deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error deleting article.' });
  }
});

// ==================== IMPACT STATS ====================
// GET /api/admin/impact-stats
router.get('/impact-stats', requirePermission('settings'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM impact_stats ORDER BY sort_order ASC');
    return res.json({ success: true, stats: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Could not load stats.' });
  }
});

// PUT /api/admin/impact-stats/:id
router.put('/impact-stats/:id', requirePermission('settings'), async (req, res) => {
  try {
    const { id } = req.params;
    const { number_val, suffix, label_en, label_ur, icon, is_active } = req.body;

    await db.query(`
      UPDATE impact_stats SET
        number_val = ?,
        suffix = ?,
        label_en = ?,
        label_ur = ?,
        icon = ?,
        is_active = ?
      WHERE id = ?
    `, [number_val, suffix || '', label_en, label_ur, icon || 'users', is_active ? 1 : 0, id]);

    return res.json({ success: true, message: 'Impact statistic updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error updating impact stat.' });
  }
});

// ==================== SITE SETTINGS ====================
// GET /api/admin/settings
router.get('/settings', requirePermission('settings'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT setting_key, setting_val FROM site_settings');
    const settings = {};
    rows.forEach(r => {
      settings[r.setting_key] = r.setting_val;
    });
    return res.json({ success: true, settings, rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Could not load settings.' });
  }
});

// POST /api/admin/settings (bulk update)
router.post('/settings', requirePermission('settings'), async (req, res) => {
  try {
    const settingsObj = req.body;
    for (const [key, val] of Object.entries(settingsObj)) {
      if (val !== undefined && val !== null) {
        await db.query(`
          INSERT INTO site_settings (setting_key, setting_val, setting_group)
          VALUES (?, ?, 'general')
          ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val)
        `, [key, String(val)]);
      }
    }

    // Record in audit logs
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user ? req.session.user.id : null, 'UPDATE_SETTINGS', 'settings', 'site_settings', JSON.stringify(settingsObj)]
    ).catch(() => {});

    return res.json({ success: true, message: 'Foundation & Bank settings saved successfully!' });
  } catch (err) {
    console.error('[Admin Settings Error]', err);
    return res.status(500).json({ success: false, message: 'Error saving settings.' });
  }
});

// ==================== SUBMISSIONS & APPLICATIONS ====================
// GET /api/admin/contact-submissions
router.get('/contact-submissions', requirePermission('submissions'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM contact_submissions ORDER BY created_at DESC');
    return res.json({ success: true, submissions: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error loading submissions.' });
  }
});

// PUT /api/admin/contact-submissions/:id/status
router.put('/contact-submissions/:id/status', requirePermission('submissions'), async (req, res) => {
  try {
    const { status } = req.body;
    await db.query('UPDATE contact_submissions SET status = ? WHERE id = ?', [status, req.params.id]);
    return res.json({ success: true, message: 'Status updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Update failed.' });
  }
});

// GET /api/admin/contact-submissions/:id
router.get('/contact-submissions/:id', requirePermission('submissions'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM contact_submissions WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Contact message not found.' });
    return res.json({ success: true, submission: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error retrieving contact message.' });
  }
});

// GET /api/admin/assistance-applications
router.get('/assistance-applications', requirePermission('applications'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM assistance_applications ORDER BY created_at DESC');
    return res.json({ success: true, applications: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error loading applications.' });
  }
});

// PUT /api/admin/assistance-applications/:id (Full edit & review)
router.put('/assistance-applications/:id', requirePermission('applications'), async (req, res) => {
  try {
    const {
      applicant_name, guardian_name, cnic_or_bform, phone, city,
      address, assistance_type, family_members_count, monthly_income,
      details, status, notes
    } = req.body;

    await db.query(`
      UPDATE assistance_applications SET
        applicant_name = COALESCE(?, applicant_name),
        guardian_name = COALESCE(?, guardian_name),
        cnic_or_bform = COALESCE(?, cnic_or_bform),
        phone = COALESCE(?, phone),
        city = COALESCE(?, city),
        address = COALESCE(?, address),
        assistance_type = COALESCE(?, assistance_type),
        family_members_count = COALESCE(?, family_members_count),
        monthly_income = COALESCE(?, monthly_income),
        details = COALESCE(?, details),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `, [
      applicant_name, guardian_name, cnic_or_bform, phone, city,
      address, assistance_type, parseInt(family_members_count, 10) || 1,
      parseFloat(monthly_income) || 0, details, status, notes,
      req.params.id
    ]);
    return res.json({ success: true, message: 'Assistance application updated successfully.' });
  } catch (err) {
    console.error('[Admin Application Update]', err);
    return res.status(500).json({ success: false, message: 'Update failed.' });
  }
});

// PUT /api/admin/assistance-applications/:id/status
router.put('/assistance-applications/:id/status', requirePermission('applications'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    await db.query(
      'UPDATE assistance_applications SET status = ?, notes = ? WHERE id = ?',
      [status, notes || '', req.params.id]
    );
    return res.json({ success: true, message: 'Application status updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Update failed.' });
  }
});

// GET /api/admin/donations
router.get('/donations', requirePermission('donations'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.*, 
        p.title_en as project_title_en,
        p.title_ur as project_title_ur,
        u_v.full_name as verified_by_name
      FROM donations d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u_v ON d.verified_by_user_id = u_v.id
      ORDER BY d.created_at DESC
    `);
    return res.json({ success: true, donations: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error loading donations.' });
  }
});

// Helper to check if a donation status represents a confirmed/received payment
function isConfirmedStatus(status) {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s === 'confirmed' || s === 'verified';
}

// Helper to safely adjust project raised amount upon donation confirmation or reversal/refund
async function adjustProjectRaisedAmount(projectId, deltaAmount) {
  if (!projectId || !deltaAmount || deltaAmount === 0) return;
  try {
    await db.query(`
      UPDATE projects 
      SET raised_amount = GREATEST(0, raised_amount + ?),
          updated_at = NOW()
      WHERE id = ?
    `, [parseFloat(deltaAmount), parseInt(projectId, 10)]);
  } catch (err) {
    console.error('[Adjust Project Raised Amount Error]', err);
  }
}

// PUT /api/admin/donations/:id (Full edit with automatic project sync)
router.put('/donations/:id', requirePermission('donations'), async (req, res) => {
  try {
    const donationId = req.params.id;
    const { donor_name, donor_phone, donor_email, amount, payment_method, transaction_reference, project_id, notes, status } = req.body;

    const [existingRows] = await db.query('SELECT * FROM donations WHERE id = ?', [donationId]);
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }
    const oldDonation = existingRows[0];
    const oldWasConfirmed = isConfirmedStatus(oldDonation.status);
    const newStatus = status ? status.toLowerCase() : oldDonation.status;
    const newIsConfirmed = isConfirmedStatus(newStatus);

    const oldAmount = parseFloat(oldDonation.amount) || 0;
    const newAmount = amount !== undefined ? (parseFloat(amount) || 0) : oldAmount;

    const oldProjId = oldDonation.project_id;
    const newProjId = project_id !== undefined ? (project_id ? parseInt(project_id, 10) : null) : oldProjId;

    // Check duplicate transaction reference if changed and non-empty
    if (transaction_reference && transaction_reference.trim() !== oldDonation.transaction_reference) {
      const [dupes] = await db.query(
        'SELECT id FROM donations WHERE transaction_reference = ? AND id != ? LIMIT 1',
        [transaction_reference.trim(), donationId]
      );
      if (dupes.length > 0) {
        return res.status(400).json({ success: false, message: 'Transaction reference is already used by another donation.' });
      }
    }

    const confirmedAtVal = newIsConfirmed ? (oldDonation.confirmed_at || new Date()) : null;

    await db.query(`
      UPDATE donations SET
        donor_name = COALESCE(?, donor_name),
        donor_phone = COALESCE(?, donor_phone),
        donor_email = COALESCE(?, donor_email),
        amount = ?,
        payment_method = COALESCE(?, payment_method),
        transaction_reference = COALESCE(?, transaction_reference),
        project_id = ?,
        notes = COALESCE(?, notes),
        status = ?,
        confirmed_at = ?
      WHERE id = ?
    `, [
      donor_name ? donor_name.trim() : null,
      donor_phone !== undefined ? donor_phone.trim() : null,
      donor_email !== undefined ? donor_email.trim() : null,
      newAmount,
      payment_method || null,
      transaction_reference ? transaction_reference.trim() : null,
      newProjId,
      notes !== undefined ? notes.trim() : null,
      newStatus,
      confirmedAtVal,
      donationId
    ]);

    // Handle project funding balance adjustments
    if (oldWasConfirmed && !newIsConfirmed) {
      // Reverted from confirmed to unconfirmed/refunded: decrement old project
      await adjustProjectRaisedAmount(oldProjId, -oldAmount);
    } else if (!oldWasConfirmed && newIsConfirmed) {
      // Confirmed: increment new project
      await adjustProjectRaisedAmount(newProjId, +newAmount);
    } else if (oldWasConfirmed && newIsConfirmed) {
      // Was confirmed and remains confirmed, but amount or project may have changed
      if (oldProjId !== newProjId) {
        await adjustProjectRaisedAmount(oldProjId, -oldAmount);
        await adjustProjectRaisedAmount(newProjId, +newAmount);
      } else if (oldAmount !== newAmount) {
        await adjustProjectRaisedAmount(newProjId, newAmount - oldAmount);
      }
    }

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'UPDATE_DONATION',
        'donation',
        String(donationId),
        JSON.stringify({ oldStatus: oldDonation.status, newStatus, oldAmount, newAmount, oldProjId, newProjId })
      ]
    ).catch(() => {});

    return res.json({ success: true, message: 'Donation record updated and project progress synced successfully.' });
  } catch (err) {
    console.error('[Admin Donation Update]', err);
    return res.status(500).json({ success: false, message: 'Failed to update donation.' });
  }
});

// PUT /api/admin/donations/:id/status (Quick status changer with auto project sync)
router.put('/donations/:id/status', requirePermission('donations'), async (req, res) => {
  try {
    const donationId = req.params.id;
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required.' });

    const [rows] = await db.query('SELECT * FROM donations WHERE id = ?', [donationId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Donation not found.' });

    const donation = rows[0];
    const oldWasConfirmed = isConfirmedStatus(donation.status);
    const newStatus = status.toLowerCase();
    const newIsConfirmed = isConfirmedStatus(newStatus);
    const amount = parseFloat(donation.amount) || 0;

    const confirmedAtVal = newIsConfirmed ? (donation.confirmed_at || new Date()) : null;
    const verifierUserId = req.session.user ? req.session.user.id : null;

    await db.query(
      `UPDATE donations 
       SET status = ?, 
           confirmed_at = ?, 
           verified_by_user_id = CASE WHEN ? = 1 THEN COALESCE(verified_by_user_id, ?) ELSE verified_by_user_id END, 
           notes = COALESCE(?, notes) 
       WHERE id = ?`,
      [newStatus, confirmedAtVal, newIsConfirmed ? 1 : 0, verifierUserId, notes ? notes.trim() : null, donationId]
    );

    // Sync project raised amount
    if (!oldWasConfirmed && newIsConfirmed) {
      await adjustProjectRaisedAmount(donation.project_id, +amount);
    } else if (oldWasConfirmed && !newIsConfirmed) {
      await adjustProjectRaisedAmount(donation.project_id, -amount);
    }

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        newIsConfirmed ? 'CONFIRM_DONATION' : (newStatus === 'refunded' ? 'REFUND_DONATION' : 'UPDATE_DONATION_STATUS'),
        'donation',
        String(donationId),
        JSON.stringify({ fromStatus: donation.status, toStatus: newStatus, amount, project_id: donation.project_id, notes })
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      message: newIsConfirmed 
        ? 'Donation marked as confirmed and project raised amount updated!' 
        : `Donation status updated to ${newStatus} and project balance adjusted.`
    });
  } catch (err) {
    console.error('[Admin Donation Status Update]', err);
    return res.status(500).json({ success: false, message: 'Update failed.' });
  }
});

// POST /api/admin/donations (Record manual donation with automatic project progress updates)
router.post('/donations', requirePermission('donations'), async (req, res) => {
  try {
    const { donor_name, donor_email, donor_phone, amount, payment_method, transaction_reference, project_id, notes, status } = req.body;
    if (!donor_name || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Donor name and valid donation amount are required.' });
    }

    const cleanAmount = parseFloat(amount);
    const cleanStatus = status ? status.toLowerCase() : 'confirmed';
    const isConfirmed = isConfirmedStatus(cleanStatus);
    const projId = project_id ? parseInt(project_id, 10) : null;
    const ref = transaction_reference ? transaction_reference.trim() : `TXN-${Date.now().toString().slice(-6)}`;

    // Prevent duplicate transaction references if explicitly given
    if (transaction_reference && transaction_reference.trim()) {
      const [dupes] = await db.query('SELECT id FROM donations WHERE transaction_reference = ? LIMIT 1', [transaction_reference.trim()]);
      if (dupes.length > 0) {
        return res.status(400).json({ success: false, message: 'A donation with this transaction reference already exists in the ledger.' });
      }
    }

    const confirmedAtVal = isConfirmed ? new Date() : null;

    const [result] = await db.query(`
      INSERT INTO donations (
        donor_name, donor_email, donor_phone, amount, currency,
        payment_method, transaction_reference, project_id, notes, status, confirmed_at
      ) VALUES (?, ?, ?, ?, 'PKR', ?, ?, ?, ?, ?, ?)
    `, [
      donor_name.trim(),
      donor_email ? donor_email.trim() : '',
      donor_phone ? donor_phone.trim() : '',
      cleanAmount,
      payment_method || 'Direct Bank Transfer',
      ref,
      projId,
      notes ? notes.trim() : '',
      cleanStatus,
      confirmedAtVal
    ]);

    // If confirmed, immediately update the project's raised_amount
    if (isConfirmed && projId) {
      await adjustProjectRaisedAmount(projId, +cleanAmount);
    }

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'MANUAL_DONATION_CREATE',
        'donation',
        String(result.insertId),
        JSON.stringify({ donor_name, amount: cleanAmount, project_id: projId, status: cleanStatus, transaction_reference: ref })
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      id: result.insertId,
      message: isConfirmed 
        ? 'Donation recorded and project raised amount automatically updated!' 
        : 'Donation recorded in pending verification queue.'
    });
  } catch (err) {
    console.error('[Admin Donation Create]', err);
    return res.status(500).json({ success: false, message: 'Failed to record donation.' });
  }
});

// DELETE /api/admin/donations/:id (Delete donation and adjust project total if it was confirmed)
router.delete('/donations/:id', requirePermission('donations'), async (req, res) => {
  try {
    const donationId = req.params.id;
    const [rows] = await db.query('SELECT * FROM donations WHERE id = ?', [donationId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Donation not found.' });

    const donation = rows[0];
    if (isConfirmedStatus(donation.status) && donation.project_id) {
      await adjustProjectRaisedAmount(donation.project_id, -(parseFloat(donation.amount) || 0));
    }

    await db.query('DELETE FROM donations WHERE id = ?', [donationId]);

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'DELETE_DONATION',
        'donation',
        String(donationId),
        JSON.stringify({ deletedDonor: donation.donor_name, amount: donation.amount, project_id: donation.project_id })
      ]
    ).catch(() => {});

    return res.json({ success: true, message: 'Donation record deleted and project balance synced.' });
  } catch (err) {
    console.error('[Admin Donation Delete]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete donation.' });
  }
});

// POST /api/admin/assistance-applications (Add new assistance request)
router.post('/assistance-applications', requirePermission('applications'), async (req, res) => {
  try {
    const { applicant_name, guardian_name, cnic_or_bform, phone, city, address, assistance_type, family_members_count, monthly_income, details, status, notes } = req.body;
    if (!applicant_name || !phone) {
      return res.status(400).json({ success: false, message: 'Applicant name and phone are required.' });
    }
    const tracking = `QASR-APP-${Date.now().toString().slice(-6)}`;
    const [result] = await db.query(`
      INSERT INTO assistance_applications (
        tracking_number, applicant_name, guardian_name, cnic_or_bform,
        phone, city, address, assistance_type, family_members_count,
        monthly_income, details, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tracking, applicant_name, guardian_name || '', cnic_or_bform || '',
      phone, city || '', address || '', assistance_type || 'education',
      parseInt(family_members_count, 10) || 1,
      parseFloat(monthly_income) || 0,
      details || '', status || 'pending', notes || ''
    ]);
    return res.json({ success: true, id: result.insertId, tracking_number: tracking, message: 'Assistance application created successfully.' });
  } catch (err) {
    console.error('[Admin Application Create]', err);
    return res.status(500).json({ success: false, message: 'Failed to create application.' });
  }
});

// POST /api/admin/upload (Stores image directly in external MEDIA_DIR and optimizes to WebP)
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }

    await optimizeUploadedImage(req.file);
    const subfolder = req.query.folder || req.body.folder || req.file.subfolder || 'uploads';
    const relativeUrl = req.file.publicUrl || `/media/${subfolder}/${req.file.filename}`;

    return res.json({
      success: true,
      message: 'Image uploaded and optimized to WebP successfully.',
      url: relativeUrl,
      filename: req.file.filename,
      thumbnailUrl: req.file.thumbnailUrl || relativeUrl
    });
  } catch (err) {
    console.error('[Upload Error]', err);
    return res.status(500).json({ success: false, message: 'Error processing upload.' });
  }
});

// GET /api/admin/media-library (Scans media directory by folder and returns list of image assets)
router.get('/media-library', async (req, res) => {
  try {
    const { folder, search } = req.query;
    const subfolders = ['projects', 'news', 'branding', 'hero', 'uploads', 'categories'];
    const targetFolders = (folder && folder !== 'all' && subfolders.includes(folder))
      ? [folder]
      : subfolders;

    const allowedExts = ['.webp', '.png', '.jpg', '.jpeg', '.svg', '.gif'];
    const filesList = [];

    for (const sub of targetFolders) {
      const folderPath = path.join(mediaRoot, sub);
      if (fs.existsSync(folderPath)) {
        try {
          const files = fs.readdirSync(folderPath);
          for (const f of files) {
            if (f.endsWith('.bak')) continue;
            const ext = path.extname(f).toLowerCase();
            if (allowedExts.includes(ext)) {
              try {
                const stat = fs.statSync(path.join(folderPath, f));
                if (stat.isFile()) {
                  let sizeStr = '';
                  if (stat.size < 1024) sizeStr = `${stat.size} B`;
                  else if (stat.size < 1024 * 1024) sizeStr = `${(stat.size / 1024).toFixed(1)} KB`;
                  else sizeStr = `${(stat.size / (1024 * 1024)).toFixed(1)} MB`;

                  filesList.push({
                    filename: f,
                    folder: sub,
                    url: `/media/${sub}/${f}`,
                    size: stat.size,
                    size_formatted: sizeStr,
                    mtime: stat.mtimeMs,
                    is_thumb: f.includes('-thumb.')
                  });
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
      }
    }

    filesList.sort((a, b) => b.mtime - a.mtime);

    let filtered = filesList;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filesList.filter(f => f.filename.toLowerCase().includes(q) || f.folder.toLowerCase().includes(q));
    }

    return res.json({
      success: true,
      files: filtered,
      total: filtered.length
    });
  } catch (err) {
    console.error('[Media Library Error]', err);
    return res.status(500).json({ success: false, message: 'Could not load media library files.' });
  }
});

// ==================== BRANDING ASSETS MANAGEMENT (LOGO, FLAG & STAMPS) ====================
// GET /api/admin/branding-assets
router.get('/branding-assets', requirePermission('settings'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT setting_key, setting_val FROM site_settings 
      WHERE setting_key IN ('site_logo_url', 'site_flag_url', 'site_stamp_url', 'foundation_name_en', 'foundation_name_ur')
    `);
    const assets = {
      foundation_name_en: 'Qasr-e-Shabbir Foundation',
      foundation_name_ur: 'قصرِ شبیر فاؤنڈیشن',
      site_logo_url: '/media/branding/Qasr-e-Shabir_Foundation_Emble_1792086383401_940589.png',
      site_flag_url: '/media/branding/qasr-e-shabbir-flag_1792088518904_921609.svg',
      site_stamp_url: ''
    };
    rows.forEach(r => {
      assets[r.setting_key] = r.setting_val;
    });

    const [stamps] = await db.query('SELECT id, name, image_url, is_default, created_at FROM official_stamps ORDER BY is_default DESC, id DESC');
    if (stamps.length && !assets.site_stamp_url) {
      const def = stamps.find(s => s.is_default) || stamps[0];
      assets.site_stamp_url = def.image_url;
    }

    return res.json({ success: true, assets, stamps });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve branding assets.' });
  }
});

// POST /api/admin/branding-assets/names (Update site foundation name in English and Urdu)
router.post('/branding-assets/names', requirePermission('settings'), async (req, res) => {
  try {
    const { foundation_name_en, foundation_name_ur } = req.body;
    if (!foundation_name_en || !foundation_name_ur) {
      return res.status(400).json({ success: false, message: 'Both English and Urdu foundation names are required.' });
    }

    await db.query(`
      INSERT INTO site_settings (setting_key, setting_val, setting_group, description)
      VALUES ('foundation_name_en', ?, 'branding', 'Official Organization Name in English')
      ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val)
    `, [foundation_name_en.trim()]);

    await db.query(`
      INSERT INTO site_settings (setting_key, setting_val, setting_group, description)
      VALUES ('foundation_name_ur', ?, 'branding', 'Official Organization Name in Urdu')
      ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val)
    `, [foundation_name_ur.trim()]);

    // Update audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user ? req.session.user.id : null, 'UPDATE_FOUNDATION_NAMES', 'branding', 'names', JSON.stringify({ foundation_name_en, foundation_name_ur })]
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'Official foundation names in English and Urdu updated successfully!',
      foundation_name_en: foundation_name_en.trim(),
      foundation_name_ur: foundation_name_ur.trim()
    });
  } catch (err) {
    console.error('[Branding Names Update Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to update foundation names.' });
  }
});

// POST /api/admin/branding-assets/logo
router.post('/branding-assets/logo', requirePermission('settings'), upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a logo image file to upload.' });
    }
    await optimizeUploadedImage(req.file);
    const logoUrl = req.file.publicUrl || `/media/branding/${req.file.filename}`;

    try {
      const defaultLogoPath = path.join(mediaDir, 'branding', 'logo.svg');
      if (req.file.path.endsWith('.svg')) {
        fs.copyFileSync(req.file.path, defaultLogoPath);
      }
    } catch (e) {}

    await db.query(`
      INSERT INTO site_settings (setting_key, setting_val, setting_group, description)
      VALUES ('site_logo_url', ?, 'branding', 'Official foundation circular logo image')
      ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val)
    `, [logoUrl]);

    // Also update audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user ? req.session.user.id : null, 'UPDATE_LOGO', 'branding', 'site_logo_url', logoUrl]
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'Foundation logo updated successfully!',
      url: logoUrl
    });
  } catch (err) {
    console.error('[Logo Update Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to upload new foundation logo.' });
  }
});

// POST /api/admin/branding-assets/flag
router.post('/branding-assets/flag', requirePermission('settings'), upload.single('flag'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a flag image file to upload.' });
    }
    await optimizeUploadedImage(req.file);
    const flagUrl = req.file.publicUrl || `/media/branding/${req.file.filename}`;

    try {
      const defaultFlagPath = path.join(mediaDir, 'branding', 'flag.svg');
      if (req.file.path.endsWith('.svg')) {
        fs.copyFileSync(req.file.path, defaultFlagPath);
      }
    } catch (e) {}

    await db.query(`
      INSERT INTO site_settings (setting_key, setting_val, setting_group, description)
      VALUES ('site_flag_url', ?, 'branding', 'Official foundation waving flag image')
      ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val)
    `, [flagUrl]);

    // Also update audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user ? req.session.user.id : null, 'UPDATE_FLAG', 'branding', 'site_flag_url', flagUrl]
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'Foundation flag updated successfully!',
      url: flagUrl
    });
  } catch (err) {
    console.error('[Flag Update Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to upload new foundation flag.' });
  }
});

// GET /api/admin/branding-assets/stamps
router.get('/branding-assets/stamps', requirePermission('settings'), async (req, res) => {
  try {
    const [stamps] = await db.query('SELECT id, name, image_url, is_default, created_at FROM official_stamps ORDER BY is_default DESC, id DESC');
    return res.json({ success: true, stamps });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load official stamps.' });
  }
});

// POST /api/admin/branding-assets/stamps
router.post('/branding-assets/stamps', requirePermission('settings'), upload.single('stamp'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an official stamp image file to upload.' });
    }
    await optimizeUploadedImage(req.file);
    const stampName = req.body.name && req.body.name.trim() ? req.body.name.trim() : 'Official Foundation Stamp';
    const stampUrl = req.file.publicUrl || `/media/branding/${req.file.filename}`;
    const isDefault = req.body.is_default === '1' || req.body.is_default === 'true' || req.body.is_default === true ? 1 : 0;

    if (isDefault) {
      await db.query('UPDATE official_stamps SET is_default = 0');
      await db.query(`
        INSERT INTO site_settings (setting_key, setting_val, setting_group, description)
        VALUES ('site_stamp_url', ?, 'branding', 'Default official foundation stamp')
        ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val)
      `, [stampUrl]);
    }

    const [result] = await db.query(
      'INSERT INTO official_stamps (name, image_url, is_default, uploaded_by) VALUES (?, ?, ?, ?)',
      [stampName, stampUrl, isDefault, req.session.user ? req.session.user.id : null]
    );

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user ? req.session.user.id : null, 'UPLOAD_STAMP', 'branding', String(result.insertId), JSON.stringify({ name: stampName, url: stampUrl })]
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'Official foundation stamp uploaded successfully!',
      stamp: { id: result.insertId, name: stampName, image_url: stampUrl, is_default: isDefault }
    });
  } catch (err) {
    console.error('[Stamp Upload Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to upload official stamp.' });
  }
});

// PUT /api/admin/branding-assets/stamps/:id/default
router.put('/branding-assets/stamps/:id/default', requirePermission('settings'), async (req, res) => {
  try {
    const stampId = parseInt(req.params.id, 10);
    const [rows] = await db.query('SELECT id, name, image_url FROM official_stamps WHERE id = ?', [stampId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Stamp not found.' });

    await db.query('UPDATE official_stamps SET is_default = 0');
    await db.query('UPDATE official_stamps SET is_default = 1 WHERE id = ?', [stampId]);

    await db.query(`
      INSERT INTO site_settings (setting_key, setting_val, setting_group, description)
      VALUES ('site_stamp_url', ?, 'branding', 'Default official foundation stamp')
      ON DUPLICATE KEY UPDATE setting_val = VALUES(setting_val)
    `, [rows[0].image_url]);

    return res.json({ success: true, message: `"${rows[0].name}" set as the default official stamp for receipts and documents.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to set default stamp.' });
  }
});

// DELETE /api/admin/branding-assets/stamps/:id
router.delete('/branding-assets/stamps/:id', requirePermission('settings'), async (req, res) => {
  try {
    const stampId = parseInt(req.params.id, 10);
    const [countRows] = await db.query('SELECT COUNT(*) as cnt FROM official_stamps');
    if (countRows[0].cnt <= 1) {
      return res.status(400).json({ success: false, message: 'At least one official stamp must be maintained in the foundation assets.' });
    }
    await db.query('DELETE FROM official_stamps WHERE id = ?', [stampId]);
    return res.json({ success: true, message: 'Official stamp deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete stamp.' });
  }
});

// ==================== OFFICIAL SIGNATURES MANAGEMENT ====================

// GET /api/admin/branding-assets/signatures
router.get('/branding-assets/signatures', async (req, res) => {
  try {
    const [signatures] = await db.query(
      'SELECT id, name, designation, designation_ur, signature_url, is_default, created_at FROM official_signatures ORDER BY is_default DESC, id DESC'
    );
    return res.json({ success: true, signatures });
  } catch (err) {
    console.error('[Signatures GET Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to load official signatures.' });
  }
});

// POST /api/admin/branding-assets/signatures
router.post('/branding-assets/signatures', requirePermission('settings'), (req, res, next) => {
  upload.single('signature')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Error uploading signature image.' });
    next();
  });
}, async (req, res) => {
  try {
    const { name, designation, designation_ur, is_default } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Signatory name is required (e.g. Dr. Ghulam Shabbir).' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an official signature image to upload.' });
    }

    let signatureUrl = '';
    try {
      signatureUrl = await processProfilePhoto(req.file, 'sig_official');
    } catch (errPhoto) {
      signatureUrl = req.file.publicUrl || `/media/uploads/${req.file.filename}`;
    }

    const isDefault = (is_default === '1' || is_default === 'true' || is_default === true) ? 1 : 0;
    if (isDefault) {
      await db.query('UPDATE official_signatures SET is_default = 0');
    }

    const [result] = await db.query(`
      INSERT INTO official_signatures (name, designation, designation_ur, signature_url, is_default, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      designation ? designation.trim() : 'Chief Executive Officer',
      designation_ur ? designation_ur.trim() : 'چیف ایگزیکٹو آفیسر',
      signatureUrl,
      isDefault,
      req.session.user ? req.session.user.id : null
    ]);

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'UPLOAD_SIGNATURE',
        'branding',
        String(result.insertId),
        JSON.stringify({ name: name.trim(), url: signatureUrl, is_default: isDefault })
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'Official signature uploaded and saved successfully!',
      signature: {
        id: result.insertId,
        name: name.trim(),
        designation: designation ? designation.trim() : 'Chief Executive Officer',
        designation_ur: designation_ur ? designation_ur.trim() : 'چیف ایگزیکٹو آفیسر',
        signature_url: signatureUrl,
        is_default: isDefault
      }
    });
  } catch (err) {
    console.error('[Signature Upload Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to upload official signature.' });
  }
});

// PUT /api/admin/branding-assets/signatures/:id/default
router.put('/branding-assets/signatures/:id/default', requirePermission('settings'), async (req, res) => {
  try {
    const sigId = parseInt(req.params.id, 10);
    const [rows] = await db.query('SELECT id, name FROM official_signatures WHERE id = ?', [sigId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Signature not found.' });

    await db.query('UPDATE official_signatures SET is_default = 0');
    await db.query('UPDATE official_signatures SET is_default = 1 WHERE id = ?', [sigId]);

    return res.json({ success: true, message: `"${rows[0].name}" set as the active default official signature.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to set default signature.' });
  }
});

// DELETE /api/admin/branding-assets/signatures/:id
router.delete('/branding-assets/signatures/:id', requirePermission('settings'), async (req, res) => {
  try {
    const sigId = parseInt(req.params.id, 10);
    const [countRows] = await db.query('SELECT COUNT(*) as cnt FROM official_signatures');
    if (countRows[0].cnt <= 1) {
      return res.status(400).json({ success: false, message: 'At least one official signature must be maintained in the foundation assets.' });
    }
    await db.query('DELETE FROM official_signatures WHERE id = ?', [sigId]);
    return res.json({ success: true, message: 'Official signature deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete signature.' });
  }
});

// ==================== SINGLE ITEM GET ENDPOINTS (FOR EDIT MODALS) ====================

// GET /api/admin/articles/:id
router.get('/articles/:id', requirePermission('articles'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Article not found.' });
    return res.json({ success: true, article: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error retrieving article.' });
  }
});

// GET /api/admin/donations/:id
router.get('/donations/:id', requirePermission('donations'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        d.*,
        p.title_en as project_title,
        p.title_en as project_title_en,
        p.title_ur as project_title_ur,
        u_v.full_name as verified_by_name,
        u_v.role as verified_by_role
      FROM donations d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN users u_v ON d.verified_by_user_id = u_v.id
      WHERE d.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Donation not found.' });
    return res.json({ success: true, donation: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error retrieving donation.' });
  }
});

// GET /api/admin/assistance-applications/:id
router.get('/assistance-applications/:id', requirePermission('applications'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*
      FROM assistance_applications a
      WHERE a.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found.' });
    return res.json({ success: true, application: rows[0] });
  } catch (err) {
    console.error('Error retrieving application:', err);
    return res.status(500).json({ success: false, message: 'Error retrieving application.' });
  }
});

// ==================== USERS & STAFF MANAGEMENT ====================

// GET /api/admin/users
router.get('/users', requirePermission('users'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.username, u.email, u.full_name, u.role, u.department_id, u.role_id, u.designation_id,
             u.designation, u.designation_ur, u.phone, u.photo_url,
             u.signature_id, u.salary, u.has_salary, u.permissions, u.is_active, u.created_at, u.updated_at,
             d.name_en as department_name_en, d.name_ur as department_name_ur, d.code as department_code,
             ur.name_en as role_name_en, ur.name_ur as role_name_ur,
             des.name_en as designation_name_en, des.name_ur as designation_name_ur
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_roles ur ON u.role_id = ur.id
      LEFT JOIN designations des ON u.designation_id = des.id
      ORDER BY u.id ASC
    `);

    const users = rows.map(u => {
      let perms = [];
      if (u.permissions) {
        try {
          perms = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions;
        } catch (e) {
          perms = u.permissions.split(',').map(s => s.trim());
        }
      }
      return {
        ...u,
        salary: parseFloat(u.salary) || 0,
        has_salary: Boolean(u.has_salary),
        permissions: perms,
        department_name: u.department_name_en || '',
        role_title: u.role_name_en || u.role,
        designation: u.designation_name_en || u.designation || '',
        designation_ur: u.designation_name_ur || u.designation_ur || ''
      };
    });

    return res.json({ success: true, users });
  } catch (err) {
    console.error('[Admin Users GET]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', requirePermission('users'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.username, u.email, u.password_plain, u.full_name, u.role, u.department_id, u.role_id, u.designation_id,
             u.designation, u.designation_ur, u.phone, u.photo_url,
             u.signature_id, u.salary, u.has_salary, u.permissions, u.is_active, u.created_at, u.updated_at,
             d.name_en as department_name_en, d.name_ur as department_name_ur, d.code as department_code,
             ur.name_en as role_name_en, ur.name_ur as role_name_ur,
             des.name_en as designation_name_en, des.name_ur as designation_name_ur
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_roles ur ON u.role_id = ur.id
      LEFT JOIN designations des ON u.designation_id = des.id
      WHERE u.id = ?
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const u = rows[0];
    let perms = [];
    if (u.permissions) {
      try {
        perms = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions;
      } catch (e) {
        perms = u.permissions.split(',').map(s => s.trim());
      }
    }

    return res.json({
      success: true,
      user: {
        ...u,
        password_plain: u.password_plain || '',
        salary: parseFloat(u.salary) || 0,
        has_salary: Boolean(u.has_salary),
        permissions: perms,
        department_name: u.department_name_en || '',
        role_title: u.role_name_en || u.role,
        designation: u.designation_name_en || u.designation || '',
        designation_ur: u.designation_name_ur || u.designation_ur || ''
      }
    });
  } catch (err) {
    console.error('[Admin User GET ID]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user.' });
  }
});

// GET /api/admin/users/:id/id-card
router.get('/users/:id/id-card', async (req, res) => {
  try {
    const userId = req.params.id;
    // Permission check: must have 'users' permission OR be viewing their own ID card
    const userRole = req.session.user.role;
    const isSelf = String(req.session.user.id) === String(userId);
    const userPerms = Array.isArray(req.session.user.permissions) ? req.session.user.permissions : [];
    if (userRole !== 'superadmin' && userRole !== 'admin' && !userPerms.includes('users') && !isSelf) {
      return res.status(403).json({ success: false, message: 'Access denied: Insufficient permissions to view staff identity card.' });
    }

    const [rows] = await db.query(`
      SELECT u.*,
             d.name_en as department_name_en, d.name_ur as department_name_ur, d.code as department_code,
             ur.name_en as role_name_en, ur.name_ur as role_name_ur,
             des.name_en as designation_name_en, des.name_ur as designation_name_ur
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN user_roles ur ON u.role_id = ur.id
      LEFT JOIN designations des ON u.designation_id = des.id
      WHERE u.id = ?
    `, [userId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }
    const staff = rows[0];

    // Fetch site branding settings
    const [settingsRows] = await db.query(`
      SELECT setting_key, setting_val FROM site_settings 
      WHERE setting_key IN ('foundation_name_en', 'foundation_name_ur', 'site_logo_url', 'site_stamp_url', 'site_flag_url', 'contact_address_en', 'contact_address_ur', 'contact_phone', 'contact_email', 'tagline_en', 'tagline_ur')
    `);
    const branding = {};
    settingsRows.forEach(r => { branding[r.setting_key] = r.setting_val; });

    // Fetch assigned official signature
    let signature = null;
    if (staff.signature_id) {
      const [sigRows] = await db.query('SELECT * FROM official_signatures WHERE id = ?', [staff.signature_id]);
      if (sigRows.length) signature = sigRows[0];
    }
    if (!signature) {
      const [defSig] = await db.query('SELECT * FROM official_signatures WHERE is_default = 1 LIMIT 1');
      if (defSig.length) signature = defSig[0];
      else {
        const [anySig] = await db.query('SELECT * FROM official_signatures ORDER BY id ASC LIMIT 1');
        if (anySig.length) signature = anySig[0];
      }
    }

    const issueDate = staff.created_at ? new Date(staff.created_at) : new Date();
    const validUntil = new Date(issueDate);
    validUntil.setFullYear(validUntil.getFullYear() + 2); // 2 years validity for staff

    const empId = `EMP-QSF-${String(staff.id).padStart(3, '0')}`;

    const roleTitles = {
      superadmin: 'Super Administrator',
      admin: 'Administrative Officer',
      manager: 'Operations & Program Manager',
      accountant: 'Accounts & Finance Officer',
      staff: 'Field Staff / Welfare Officer'
    };
    const roleTitlesUr = {
      superadmin: 'سپر ایڈمنسٹریٹر',
      admin: 'ایڈمنسٹریٹو آفیسر',
      manager: 'پروگرام مینیجر',
      accountant: 'اکاؤنٹس و فنانس آفیسر',
      staff: 'فیلڈ ویلفیئر آفیسر'
    };

    const finalDeptEn = staff.department_name_en || 'Administration & Operations';
    const finalDeptUr = staff.department_name_ur || 'شعبہ انتظامیہ و آپریشنز';
    const finalRoleEn = staff.role_name_en || roleTitles[staff.role] || staff.role;
    const finalRoleUr = staff.role_name_ur || roleTitlesUr[staff.role] || 'ملازم و عملہ';
    const finalDesignationEn = staff.designation_name_en || staff.designation || finalRoleEn;
    const finalDesignationUr = staff.designation_name_ur || staff.designation_ur || finalRoleUr;

    return res.json({
      success: true,
      card_type: 'staff',
      staff: {
        id: staff.id,
        employee_id: empId,
        username: staff.username,
        full_name: staff.full_name,
        email: staff.email,
        phone: staff.phone || 'N/A',
        department_id: staff.department_id,
        department: finalDeptEn,
        department_name_en: finalDeptEn,
        department_en: finalDeptEn,
        department_ur: finalDeptUr,
        department_code: staff.department_code || 'ADMIN',
        role_id: staff.role_id,
        role: staff.role || 'staff',
        role_name_en: finalRoleEn,
        role_title_en: finalRoleEn,
        role_title_ur: finalRoleUr,
        designation_id: staff.designation_id,
        designation: finalDesignationEn,
        designation_name_en: finalDesignationEn,
        designation_ur: finalDesignationUr,
        signature_id: staff.signature_id,
        photo_url: staff.photo_url || null,
        is_active: staff.is_active,
        created_at: staff.created_at
      },
      signature: signature ? {
        id: signature.id,
        name: signature.name,
        designation: signature.designation,
        designation_ur: signature.designation_ur,
        signature_url: signature.signature_url
      } : null,
      branding: {
        foundation_name_en: branding.foundation_name_en || 'Qasr-e-Shabir Foundation',
        foundation_name_ur: branding.foundation_name_ur || 'قصرِ شبیر فاؤنڈیشن',
        tagline_en: branding.tagline_en || 'Together for a Brighter Tomorrow',
        tagline_ur: branding.tagline_ur || 'ایک بہتر کل کے لیے ساتھ',
        logo_url: branding.site_logo_url || '/media/branding/logo.svg',
        stamp_url: branding.site_stamp_url || '',
        flag_url: branding.site_flag_url || '/media/branding/flag.svg',
        address_en: branding.contact_address_en || 'Anjuman-e-Hussainia Anwaria Town Jalandhar Parachinar',
        address_ur: branding.contact_address_ur || 'انجمن حسینیہ انواریہ ٹاؤن جالندھر پاراچنار',
        phone: branding.contact_phone || '+92 300 0817702',
        email: branding.contact_email || 'admin@qesf.org.pk'
      },
      card_meta: {
        issue_date: issueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        valid_thru: validUntil.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        employee_id: empId,
        security_hash: `QSF-EMP-${staff.id}-${issueDate.getFullYear()}`
      }
    });
  } catch (err) {
    console.error('[Staff ID Card Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate staff identity card data.' });
  }
});

// POST /api/admin/users
router.post('/users', requirePermission('users'), (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Error uploading staff photo.' });
    next();
  });
}, async (req, res) => {
  try {
    const {
      username, email, password, full_name, role, designation, designation_ur, phone,
      signature_id, salary, has_salary, permissions, is_active,
      department_id, role_id, designation_id
    } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Username, Email, Password, and Full Name are required.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Profile photo is mandatory when registering a new staff member. Please select and upload a photo.'
      });
    }

    // Convert staff photo to WebP
    let photoUrl = '';
    try {
      photoUrl = await processProfilePhoto(req.file, 'staff_photo');
    } catch (photoErr) {
      return res.status(400).json({
        success: false,
        message: photoErr.message || 'Invalid image file. Please upload a valid JPG, PNG, or WebP photo.'
      });
    }

    // Check existing username or email
    const [existing] = await db.query(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username.trim(), email.trim()]
    );
    if (existing.length > 0) {
      if (existing[0].username.toLowerCase() === username.trim().toLowerCase()) {
        return res.status(400).json({ success: false, message: 'This username is already taken.' });
      }
      return res.status(400).json({ success: false, message: 'This email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password.trim(), salt);

    const hasSalaryVal = (has_salary === true || has_salary === 1 || has_salary === '1' || has_salary === 'true') ? 1 : 0;
    const salaryVal = hasSalaryVal ? (parseFloat(salary) || 0) : 0;
    const permsVal = Array.isArray(permissions) ? JSON.stringify(permissions) : (permissions ? String(permissions) : '[]');
    const isActiveVal = (is_active === false || is_active === 0 || is_active === '0' || is_active === 'false') ? 0 : 1;
    const sigIdVal = signature_id ? parseInt(signature_id, 10) : null;
    const deptIdVal = department_id ? parseInt(department_id, 10) : null;
    const roleIdVal = role_id ? parseInt(role_id, 10) : null;
    const desIdVal = designation_id ? parseInt(designation_id, 10) : null;

    let finalDesEn = designation ? designation.trim() : '';
    let finalDesUr = designation_ur ? designation_ur.trim() : '';
    if (desIdVal && (!finalDesEn || !finalDesUr)) {
      const [desRows] = await db.query('SELECT name_en, name_ur FROM designations WHERE id = ?', [desIdVal]);
      if (desRows.length) {
        if (!finalDesEn) finalDesEn = desRows[0].name_en;
        if (!finalDesUr) finalDesUr = desRows[0].name_ur;
      }
    }

    let finalRoleKey = role || 'admin';
    if (roleIdVal && !role) {
      const [rRows] = await db.query('SELECT role_key FROM user_roles WHERE id = ?', [roleIdVal]);
      if (rRows.length) finalRoleKey = rRows[0].role_key;
    }

    const [result] = await db.query(`
      INSERT INTO users (
        username, email, password_hash, password_plain, full_name, role, department_id, role_id, designation_id,
        designation, designation_ur, phone, photo_url,
        signature_id, salary, has_salary, permissions, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      username.trim(),
      email.trim(),
      password_hash,
      password.trim(),
      full_name.trim(),
      finalRoleKey,
      deptIdVal,
      roleIdVal,
      desIdVal,
      finalDesEn,
      finalDesUr,
      phone ? phone.trim() : '',
      photoUrl,
      sigIdVal,
      salaryVal,
      hasSalaryVal,
      permsVal,
      isActiveVal
    ]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'CREATE_USER',
        'user',
        String(result.insertId),
        JSON.stringify({ username, email, full_name, role: finalRoleKey, department_id: deptIdVal, role_id: roleIdVal, designation_id: desIdVal, photo_url: photoUrl })
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'New staff member created successfully with verified profile photo!',
      id: result.insertId,
      userId: result.insertId,
      photo_url: photoUrl
    });
  } catch (err) {
    console.error('[Admin Users POST]', err);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', requirePermission('users'), (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Error uploading photo.' });
    next();
  });
}, async (req, res) => {
  try {
    const userId = req.params.id;
    const {
      username, email, password, full_name, role, designation, designation_ur, phone,
      signature_id, salary, has_salary, permissions, is_active,
      department_id, role_id, designation_id
    } = req.body;

    const [userRows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!userRows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (username || email) {
      const [dupes] = await db.query(
        'SELECT id, username, email FROM users WHERE (username = ? OR email = ?) AND id != ? LIMIT 1',
        [username ? username.trim() : '', email ? email.trim() : '', userId]
      );
      if (dupes.length > 0) {
        if (username && dupes[0].username.toLowerCase() === username.trim().toLowerCase()) {
          return res.status(400).json({ success: false, message: 'This username is already taken by another user.' });
        }
        return res.status(400).json({ success: false, message: 'This email is already in use by another user.' });
      }
    }

    // Process photo if replacement uploaded
    let photoUrl = userRows[0].photo_url;
    if (req.file) {
      try {
        photoUrl = await processProfilePhoto(req.file, 'staff_photo');
      } catch (photoErr) {
        return res.status(400).json({ success: false, message: photoErr.message || 'Invalid image file.' });
      }
    }

    const hasSalaryVal = (has_salary === true || has_salary === 1 || has_salary === '1' || has_salary === 'true') ? 1 : 0;
    const salaryVal = hasSalaryVal ? (parseFloat(salary) || 0) : 0;
    const permsVal = permissions !== undefined ? (Array.isArray(permissions) ? JSON.stringify(permissions) : String(permissions)) : userRows[0].permissions;
    const isActiveVal = is_active !== undefined ? ((is_active === false || is_active === 0 || is_active === '0' || is_active === 'false') ? 0 : 1) : userRows[0].is_active;
    const sigIdVal = signature_id !== undefined ? (signature_id ? parseInt(signature_id, 10) : null) : userRows[0].signature_id;
    const deptIdVal = department_id !== undefined ? (department_id ? parseInt(department_id, 10) : null) : userRows[0].department_id;
    const roleIdVal = role_id !== undefined ? (role_id ? parseInt(role_id, 10) : null) : userRows[0].role_id;
    const desIdVal = designation_id !== undefined ? (designation_id ? parseInt(designation_id, 10) : null) : userRows[0].designation_id;

    let finalDesEn = designation !== undefined ? designation.trim() : userRows[0].designation;
    let finalDesUr = designation_ur !== undefined ? designation_ur.trim() : userRows[0].designation_ur;
    if (desIdVal && (!finalDesEn || !finalDesUr)) {
      const [desRows] = await db.query('SELECT name_en, name_ur FROM designations WHERE id = ?', [desIdVal]);
      if (desRows.length) {
        if (!finalDesEn) finalDesEn = desRows[0].name_en;
        if (!finalDesUr) finalDesUr = desRows[0].name_ur;
      }
    }

    let finalRoleKey = role || userRows[0].role;
    if (roleIdVal && !role) {
      const [rRows] = await db.query('SELECT role_key FROM user_roles WHERE id = ?', [roleIdVal]);
      if (rRows.length) finalRoleKey = rRows[0].role_key;
    }

    let updateFields = `
      username = COALESCE(?, username),
      email = COALESCE(?, email),
      full_name = COALESCE(?, full_name),
      role = COALESCE(?, role),
      department_id = ?,
      role_id = ?,
      designation_id = ?,
      designation = ?,
      designation_ur = ?,
      phone = ?,
      signature_id = ?,
      photo_url = ?,
      salary = ?,
      has_salary = ?,
      permissions = ?,
      is_active = ?
    `;
    let updateParams = [
      username ? username.trim() : null,
      email ? email.trim() : null,
      full_name ? full_name.trim() : null,
      finalRoleKey,
      deptIdVal,
      roleIdVal,
      desIdVal,
      finalDesEn,
      finalDesUr,
      phone !== undefined ? phone.trim() : userRows[0].phone,
      sigIdVal,
      photoUrl,
      salaryVal,
      hasSalaryVal,
      permsVal,
      isActiveVal
    ];

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password.trim(), salt);
      updateFields += ', password_hash = ?, password_plain = ?';
      updateParams.push(password_hash, password.trim());
    }

    updateParams.push(userId);

    await db.query(`UPDATE users SET ${updateFields} WHERE id = ?`, updateParams);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'UPDATE_USER',
        'user',
        String(userId),
        JSON.stringify({ username, email, full_name, role, designation, designation_ur, has_salary: hasSalaryVal, salary: salaryVal, photo_url: photoUrl })
      ]
    ).catch(() => {});

    return res.json({ success: true, message: 'User updated successfully!', photo_url: photoUrl });
  } catch (err) {
    console.error('[Admin Users PUT]', err);
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requirePermission('users'), async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.session.user && req.session.user.id == userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own active administrator account.'
      });
    }

    const [userRows] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
    if (!userRows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (userRows[0].username === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'The master administrator account cannot be deleted.'
      });
    }

    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'DELETE_USER',
        'user',
        String(userId),
        JSON.stringify({ deletedUsername: userRows[0].username })
      ]
    ).catch(() => {});

    return res.json({ success: true, message: 'User account deleted successfully.' });
  } catch (err) {
    console.error('[Admin Users DELETE]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

// ==================== VOLUNTEER & INTERNSHIP MANAGEMENT ====================
// GET /api/admin/volunteers
router.get('/volunteers', requirePermission('volunteers'), async (req, res) => {
  try {
    const { status, type, search } = req.query;
    let sql = `
      SELECT v.*,
             d.name_en as department_name_en, d.name_ur as department_name_ur, d.code as department_code,
             ur.name_en as role_name_en, ur.name_ur as role_name_ur,
             des.name_en as designation_name_en, des.name_ur as designation_name_ur
      FROM volunteer_applications v
      LEFT JOIN departments d ON v.department_id = d.id
      LEFT JOIN user_roles ur ON v.role_id = ur.id
      LEFT JOIN designations des ON v.designation_id = des.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND v.status = ?';
      params.push(status);
    }

    if (type && type !== 'all') {
      sql += ' AND v.application_type = ?';
      params.push(type);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ' AND (v.full_name LIKE ? OR v.email LIKE ? OR v.phone LIKE ? OR v.city LIKE ? OR v.reference_no LIKE ? OR v.relevant_skills LIKE ?)';
      params.push(q, q, q, q, q, q);
    }

    sql += ' ORDER BY v.created_at DESC';

    const [rows] = await db.query(sql, params);

    // Calculate Summary Counts
    const [[summary]] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as reviewCount,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as acceptedCount,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedCount,
        SUM(CASE WHEN application_type = 'internship' THEN 1 ELSE 0 END) as internshipCount,
        SUM(CASE WHEN application_type = 'volunteer' THEN 1 ELSE 0 END) as volunteerCount
      FROM volunteer_applications
    `);

    return res.json({
      success: true,
      volunteers: rows,
      applications: rows,
      summary: {
        total: summary.total || 0,
        pending: summary.pendingCount || 0,
        under_review: summary.reviewCount || 0,
        accepted: summary.acceptedCount || 0,
        rejected: summary.rejectedCount || 0,
        internships: summary.internshipCount || 0,
        volunteers: summary.volunteerCount || 0
      }
    });
  } catch (err) {
    console.error('[Admin Volunteers GET]', err);
    return res.status(500).json({ success: false, message: 'Failed to load volunteer applications.' });
  }
});

// GET /api/admin/volunteers/:id
router.get('/volunteers/:id', requirePermission('volunteers'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT v.*, u.full_name as reviewer_name, u.username as reviewer_username,
             d.name_en as department_name_en, d.name_ur as department_name_ur, d.code as department_code,
             ur.name_en as role_name_en, ur.name_ur as role_name_ur,
             des.name_en as designation_name_en, des.name_ur as designation_name_ur
      FROM volunteer_applications v
      LEFT JOIN users u ON v.reviewed_by = u.id
      LEFT JOIN departments d ON v.department_id = d.id
      LEFT JOIN user_roles ur ON v.role_id = ur.id
      LEFT JOIN designations des ON v.designation_id = des.id
      WHERE v.id = ?
    `, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Volunteer application not found.' });
    }

    return res.json({ success: true, volunteer: rows[0], application: rows[0] });
  } catch (err) {
    console.error('[Admin Volunteer GET ID]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve application details.' });
  }
});

// PUT /api/admin/volunteers/:id/status
router.put('/volunteers/:id/status', requirePermission('volunteers'), async (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    const volId = req.params.id;

    const validStatuses = ['pending', 'under_review', 'accepted', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid volunteer status provided.' });
    }

    const reviewerId = req.session.user ? req.session.user.id : null;

    await db.query(`
      UPDATE volunteer_applications 
      SET status = ?,
          admin_notes = COALESCE(?, admin_notes),
          reviewed_by = ?,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, [status, admin_notes !== undefined ? admin_notes.trim() : null, reviewerId, volId]);

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        reviewerId,
        'UPDATE_VOLUNTEER_STATUS',
        'volunteer_application',
        String(volId),
        JSON.stringify({ newStatus: status, admin_notes })
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      message: `Volunteer application status updated to ${status.replace('_', ' ').toUpperCase()}.`
    });
  } catch (err) {
    console.error('[Admin Volunteer Status PUT]', err);
    return res.status(500).json({ success: false, message: 'Failed to update volunteer status.' });
  }
});

// DELETE /api/admin/volunteers/:id
router.delete('/volunteers/:id', requirePermission('volunteers'), async (req, res) => {
  try {
    const volId = req.params.id;
    const [rows] = await db.query('SELECT reference_no, full_name FROM volunteer_applications WHERE id = ?', [volId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found.' });

    await db.query('DELETE FROM volunteer_applications WHERE id = ?', [volId]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'DELETE_VOLUNTEER',
        'volunteer_application',
        String(volId),
        JSON.stringify({ ref: rows[0].reference_no, name: rows[0].full_name })
      ]
    ).catch(() => {});

    return res.json({ success: true, message: 'Volunteer application deleted successfully.' });
  } catch (err) {
    console.error('[Admin Volunteer DELETE]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete volunteer application.' });
  }
});

// GET /api/admin/volunteers/:id/id-card
router.get('/volunteers/:id/id-card', requirePermission('volunteers'), async (req, res) => {
  try {
    const volId = req.params.id;
    const [rows] = await db.query(`
      SELECT v.*,
             d.name_en as department_name_en, d.name_ur as department_name_ur, d.code as department_code,
             ur.name_en as role_name_en, ur.name_ur as role_name_ur,
             des.name_en as designation_name_en, des.name_ur as designation_name_ur
      FROM volunteer_applications v
      LEFT JOIN departments d ON v.department_id = d.id
      LEFT JOIN user_roles ur ON v.role_id = ur.id
      LEFT JOIN designations des ON v.designation_id = des.id
      WHERE v.id = ?
    `, [volId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Volunteer application not found.' });
    }
    const vol = rows[0];

    // Fetch site branding
    const [settingsRows] = await db.query('SELECT setting_key, setting_val FROM site_settings');
    const branding = {};
    settingsRows.forEach(r => {
      branding[r.setting_key] = r.setting_val;
    });

    // Fetch assigned official signature
    let signature = null;
    if (vol.signature_id) {
      const [sigRows] = await db.query('SELECT * FROM official_signatures WHERE id = ?', [vol.signature_id]);
      if (sigRows.length) signature = sigRows[0];
    }
    if (!signature) {
      const [defSig] = await db.query('SELECT * FROM official_signatures WHERE is_default = 1 LIMIT 1');
      if (defSig.length) signature = defSig[0];
      else {
        const [anySig] = await db.query('SELECT * FROM official_signatures ORDER BY id ASC LIMIT 1');
        if (anySig.length) signature = anySig[0];
      }
    }

    const issueDate = vol.created_at ? new Date(vol.created_at) : new Date();
    const validUntil = new Date(issueDate);
    validUntil.setFullYear(validUntil.getFullYear() + 2);

    const isIntern = vol.application_type === 'internship';
    const defaultRoleTitleEn = isIntern 
      ? 'Student Intern / Research Scholar'
      : 'Honorary Volunteer / Community Ambassador';
    const defaultRoleTitleUr = isIntern
      ? 'طالب علم انٹرن / ریسرچ اسکالر'
      : 'فلاحی رضاکار / اعزازی سفیر';
    const roleTitleEn = vol.role_name_en || defaultRoleTitleEn;
    const roleTitleUr = vol.role_name_ur || defaultRoleTitleUr;
    const badgeLabelEn = isIntern ? 'ACADEMIC INTERN' : 'HONORARY VOLUNTEER';
    const badgeLabelUr = isIntern ? 'طالب علم انٹرن' : 'فلاحی رضاکار';

    const finalDeptEn = vol.department_name_en || (isIntern ? 'Academic & Community Outreach' : 'Volunteer Network & Field Operations');
    const finalDeptUr = vol.department_name_ur || (isIntern ? 'شعبہ اکیڈمک و ریسرچ انٹرنشپ' : 'شعبہ رضاکار و فیلڈ رابطہ عامہ');
    const finalDesignationEn = vol.designation_name_en || vol.designation || roleTitleEn;
    const finalDesignationUr = vol.designation_name_ur || vol.designation_ur || roleTitleUr;

    return res.json({
      success: true,
      card_type: 'volunteer',
      volunteer: {
        id: vol.id,
        reference_no: vol.reference_no,
        full_name: vol.full_name,
        email: vol.email,
        phone: vol.phone || 'N/A',
        city: vol.city || 'Parachinar / Islamabad',
        application_type: vol.application_type,
        department_id: vol.department_id,
        department: finalDeptEn,
        department_name_en: finalDeptEn,
        department_en: finalDeptEn,
        department_ur: finalDeptUr,
        department_code: vol.department_code || 'VOLUNTEER',
        role_id: vol.role_id,
        role: vol.role || (isIntern ? 'intern' : 'volunteer'),
        role_name_en: roleTitleEn,
        role_title_en: roleTitleEn,
        role_title_ur: roleTitleUr,
        badge_label_en: badgeLabelEn,
        badge_label_ur: badgeLabelUr,
        designation_id: vol.designation_id,
        designation: finalDesignationEn,
        designation_name_en: finalDesignationEn,
        designation_ur: finalDesignationUr,
        signature_id: vol.signature_id,
        areas_of_interest: vol.areas_of_interest || 'Community Welfare & Relief',
        relevant_skills: vol.relevant_skills || 'Field Volunteer',
        availability: vol.availability || 'Active Volunteer',
        status: vol.status,
        photo_url: vol.photo_url || null,
        created_at: vol.created_at
      },
      signature: signature ? {
        id: signature.id,
        name: signature.name,
        designation: signature.designation,
        designation_ur: signature.designation_ur,
        signature_url: signature.signature_url
      } : null,
      branding: {
        foundation_name_en: branding.foundation_name_en || 'Qasr-e-Shabir Foundation',
        foundation_name_ur: branding.foundation_name_ur || 'قصرِ شبیر فاؤنڈیشن',
        tagline_en: branding.tagline_en || 'Together for a Brighter Tomorrow',
        tagline_ur: branding.tagline_ur || 'ایک بہتر کل کے لیے ساتھ',
        logo_url: branding.site_logo_url || '/media/branding/logo.svg',
        stamp_url: branding.site_stamp_url || '',
        flag_url: branding.site_flag_url || '/media/branding/flag.svg',
        address_en: branding.contact_address_en || 'Anjuman-e-Hussainia Anwaria Town Jalandhar Parachinar',
        address_ur: branding.contact_address_ur || 'انجمن حسینیہ انواریہ ٹاؤن جالندھر پاراچنار',
        phone: branding.contact_phone || '+92 300 0817702',
        email: branding.contact_email || 'admin@qesf.org.pk'
      },
      card_meta: {
        issue_date: issueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        valid_thru: validUntil.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        reference_no: vol.reference_no,
        security_hash: `QSF-VOL-${vol.id}-${issueDate.getFullYear()}`
      }
    });
  } catch (err) {
    console.error('[Volunteer ID Card Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate volunteer identity card data.' });
  }
});

// POST /api/admin/volunteers (Add New Volunteer manually by administrator)
router.post('/volunteers', requirePermission('volunteers'), (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Error uploading volunteer photo.' });
    next();
  });
}, async (req, res) => {
  try {
    const {
      full_name, email, phone, city, application_type,
      designation, designation_ur, signature_id,
      areas_of_interest, relevant_skills, availability,
      motivation_message, status, admin_notes,
      department_id, role_id, designation_id, role
    } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({ success: false, message: 'Full name and contact phone number are required.' });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Profile photo is mandatory when registering a volunteer. Please upload a clear photo.'
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

    const refNo = `VOL-${Date.now().toString().slice(-6)}`;
    const validStatus = ['pending', 'under_review', 'accepted', 'rejected'].includes(status) ? status : 'accepted';
    const validAppType = ['volunteer', 'internship'].includes(application_type) ? application_type : 'volunteer';
    const sigIdVal = signature_id ? parseInt(signature_id, 10) : null;
    const deptIdVal = department_id ? parseInt(department_id, 10) : null;
    const roleIdVal = role_id ? parseInt(role_id, 10) : null;
    const desIdVal = designation_id ? parseInt(designation_id, 10) : null;

    let finalDesEn = designation ? designation.trim() : '';
    let finalDesUr = designation_ur ? designation_ur.trim() : '';
    if (desIdVal && (!finalDesEn || !finalDesUr)) {
      const [desRows] = await db.query('SELECT name_en, name_ur FROM designations WHERE id = ?', [desIdVal]);
      if (desRows.length) {
        if (!finalDesEn) finalDesEn = desRows[0].name_en;
        if (!finalDesUr) finalDesUr = desRows[0].name_ur;
      }
    }

    const [result] = await db.query(`
      INSERT INTO volunteer_applications (
        reference_no, full_name, email, phone, city,
        department_id, role_id, role, designation_id,
        application_type, designation, designation_ur, signature_id,
        areas_of_interest, relevant_skills,
        availability, motivation_message, status, admin_notes,
        photo_url, reviewed_by, reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      refNo,
      full_name.trim(),
      email ? email.trim() : '',
      phone.trim(),
      city ? city.trim() : 'Parachinar / Islamabad',
      deptIdVal,
      roleIdVal,
      role || (validAppType === 'internship' ? 'intern' : 'volunteer'),
      desIdVal,
      validAppType,
      finalDesEn || null,
      finalDesUr || null,
      sigIdVal,
      areas_of_interest ? (Array.isArray(areas_of_interest) ? areas_of_interest.join(', ') : String(areas_of_interest)) : 'Community Welfare & Relief',
      relevant_skills ? String(relevant_skills).trim() : '',
      availability ? String(availability).trim() : 'Active Field Volunteer',
      motivation_message ? String(motivation_message).trim() : 'Directly enrolled by Foundation Management',
      validStatus,
      admin_notes ? String(admin_notes).trim() : 'Official volunteer registration',
      photoUrl,
      req.session.user ? req.session.user.id : null
    ]);

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'CREATE_VOLUNTEER',
        'volunteer',
        String(result.insertId),
        JSON.stringify({ full_name, phone, status: validStatus, refNo, photoUrl, department_id: deptIdVal, role_id: roleIdVal, designation_id: desIdVal })
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      id: result.insertId,
      reference_no: refNo,
      photo_url: photoUrl,
      message: `Volunteer record for "${full_name}" registered successfully with Reference #${refNo}.`
    });
  } catch (err) {
    console.error('[Add Volunteer Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to create volunteer record.' });
  }
});

// PUT /api/admin/volunteers/:id (Update volunteer details & optional photo replacement)
router.put('/volunteers/:id', requirePermission('volunteers'), (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message || 'Error uploading photo.' });
    next();
  });
}, async (req, res) => {
  try {
    const volId = req.params.id;
    const [rows] = await db.query('SELECT * FROM volunteer_applications WHERE id = ?', [volId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Volunteer application not found.' });
    }

    const {
      full_name, email, phone, city, application_type,
      designation, designation_ur, signature_id,
      areas_of_interest, relevant_skills, availability,
      motivation_message, status, admin_notes,
      department_id, role_id, designation_id, role
    } = req.body;

    let photoUrl = rows[0].photo_url;
    if (req.file) {
      try {
        photoUrl = await processProfilePhoto(req.file, 'vol_photo');
      } catch (photoErr) {
        return res.status(400).json({ success: false, message: photoErr.message || 'Invalid image file.' });
      }
    }

    const areasVal = areas_of_interest !== undefined
      ? (Array.isArray(areas_of_interest) ? areas_of_interest.join(', ') : String(areas_of_interest))
      : rows[0].areas_of_interest;

    const sigIdVal = signature_id !== undefined ? (signature_id ? parseInt(signature_id, 10) : null) : rows[0].signature_id;
    const deptIdVal = department_id !== undefined ? (department_id ? parseInt(department_id, 10) : null) : rows[0].department_id;
    const roleIdVal = role_id !== undefined ? (role_id ? parseInt(role_id, 10) : null) : rows[0].role_id;
    const desIdVal = designation_id !== undefined ? (designation_id ? parseInt(designation_id, 10) : null) : rows[0].designation_id;

    let finalDesEn = designation !== undefined ? (designation ? designation.trim() : null) : rows[0].designation;
    let finalDesUr = designation_ur !== undefined ? (designation_ur ? designation_ur.trim() : null) : rows[0].designation_ur;
    if (desIdVal && (!finalDesEn || !finalDesUr)) {
      const [desRows] = await db.query('SELECT name_en, name_ur FROM designations WHERE id = ?', [desIdVal]);
      if (desRows.length) {
        if (!finalDesEn) finalDesEn = desRows[0].name_en;
        if (!finalDesUr) finalDesUr = desRows[0].name_ur;
      }
    }

    await db.query(`
      UPDATE volunteer_applications SET
        full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        city = COALESCE(?, city),
        department_id = ?,
        role_id = ?,
        role = COALESCE(?, role),
        designation_id = ?,
        application_type = COALESCE(?, application_type),
        designation = ?,
        designation_ur = ?,
        signature_id = ?,
        areas_of_interest = ?,
        relevant_skills = COALESCE(?, relevant_skills),
        availability = COALESCE(?, availability),
        motivation_message = COALESCE(?, motivation_message),
        status = COALESCE(?, status),
        admin_notes = COALESCE(?, admin_notes),
        photo_url = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      full_name ? full_name.trim() : null,
      email ? email.trim() : null,
      phone ? phone.trim() : null,
      city ? city.trim() : null,
      deptIdVal,
      roleIdVal,
      role || null,
      desIdVal,
      application_type || null,
      finalDesEn,
      finalDesUr,
      sigIdVal,
      areasVal,
      relevant_skills !== undefined ? relevant_skills.trim() : null,
      availability || null,
      motivation_message !== undefined ? motivation_message.trim() : null,
      status || null,
      admin_notes !== undefined ? admin_notes.trim() : null,
      photoUrl,
      volId
    ]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'UPDATE_VOLUNTEER',
        'volunteer_application',
        String(volId),
        JSON.stringify({ full_name, phone, status, photoUrl })
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'Volunteer profile updated successfully.',
      photo_url: photoUrl
    });
  } catch (err) {
    console.error('[Admin Volunteer PUT]', err);
    return res.status(500).json({ success: false, message: 'Failed to update volunteer profile.' });
  }
});

// ==================== ACCOUNTS & PROJECT-WISE DONATION TRACKING ====================

// GET /api/admin/accounts/summary
router.get('/accounts/summary', requirePermission('accounts'), async (req, res) => {
  try {
    // 1. Overall Confirmed, Pending & Refunded Totals
    const [[overallStats]] = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN LOWER(status) IN ('confirmed', 'verified') THEN amount ELSE 0 END), 0) as totalConfirmedAmount,
        SUM(CASE WHEN LOWER(status) IN ('confirmed', 'verified') THEN 1 ELSE 0 END) as totalConfirmedCount,
        COALESCE(SUM(CASE WHEN LOWER(status) = 'pending' THEN amount ELSE 0 END), 0) as totalPendingAmount,
        SUM(CASE WHEN LOWER(status) = 'pending' THEN 1 ELSE 0 END) as totalPendingCount,
        COALESCE(SUM(CASE WHEN LOWER(status) = 'refunded' THEN amount ELSE 0 END), 0) as totalRefundedAmount,
        SUM(CASE WHEN LOWER(status) = 'refunded' THEN 1 ELSE 0 END) as totalRefundedCount
      FROM donations
    `);

    // 2. Project-wise Detailed Breakdown (Target Goal, Raised, Progress %, Confirmed Count)
    const [projectBreakdowns] = await db.query(`
      SELECT 
        p.id,
        p.id as project_id,
        p.slug,
        p.title_en,
        p.title_ur,
        p.image_url,
        CAST(p.goal_amount AS DECIMAL(12,2)) as goal_amount,
        CAST(p.raised_amount AS DECIMAL(12,2)) as raised_amount,
        c.name_en as category_name_en,
        c.name_ur as category_name_ur,
        COALESCE(d.confirmed_total, 0) as ledger_confirmed_total,
        COALESCE(d.confirmed_count, 0) as confirmed_count,
        COALESCE(d.pending_count, 0) as pending_count,
        CASE 
          WHEN p.goal_amount > 0 THEN LEAST(100, ROUND((p.raised_amount / p.goal_amount) * 100))
          ELSE 0 
        END as progress_pct
      FROM projects p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN (
        SELECT 
          project_id,
          COALESCE(SUM(CASE WHEN LOWER(status) IN ('confirmed', 'verified') THEN amount ELSE 0 END), 0) as confirmed_total,
          SUM(CASE WHEN LOWER(status) IN ('confirmed', 'verified') THEN 1 ELSE 0 END) as confirmed_count,
          SUM(CASE WHEN LOWER(status) = 'pending' THEN 1 ELSE 0 END) as pending_count
        FROM donations
        WHERE project_id IS NOT NULL
        GROUP BY project_id
      ) d ON p.id = d.project_id
      WHERE p.status = 'published'
      ORDER BY p.sort_order ASC, p.id ASC
    `);

    // 3. General / Unrestricted Fund Summary (donations with no specific project)
    const [[generalStats]] = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN LOWER(status) IN ('confirmed', 'verified') THEN amount ELSE 0 END), 0) as generalConfirmedAmount,
        SUM(CASE WHEN LOWER(status) IN ('confirmed', 'verified') THEN 1 ELSE 0 END) as generalConfirmedCount,
        COALESCE(SUM(CASE WHEN LOWER(status) = 'pending' THEN amount ELSE 0 END), 0) as generalPendingAmount,
        SUM(CASE WHEN LOWER(status) = 'pending' THEN 1 ELSE 0 END) as generalPendingCount
      FROM donations
      WHERE project_id IS NULL
    `);

    const projectsList = projectBreakdowns.map(p => ({
      ...p,
      id: p.id || p.project_id,
      goal_amount: parseFloat(p.goal_amount) || 0,
      raised_amount: parseFloat(p.raised_amount) || 0,
      ledger_confirmed_total: parseFloat(p.ledger_confirmed_total) || 0,
      confirmed_count: parseInt(p.confirmed_count, 10) || 0,
      pending_count: parseInt(p.pending_count, 10) || 0,
      progress_pct: parseInt(p.progress_pct, 10) || 0,
      progress_percentage: parseInt(p.progress_pct, 10) || 0
    }));

    return res.json({
      success: true,
      total_confirmed: parseFloat(overallStats.totalConfirmedAmount) || 0,
      total_pending: parseFloat(overallStats.totalPendingAmount) || 0,
      active_projects_count: projectsList.length,
      confirmed_transactions_count: parseInt(overallStats.totalConfirmedCount, 10) || 0,
      general_fund: {
        total_confirmed: parseFloat(generalStats.generalConfirmedAmount) || 0,
        confirmed_count: parseInt(generalStats.generalConfirmedCount, 10) || 0
      },
      projects: projectsList,
      data: {
        overall: {
          totalConfirmedAmount: parseFloat(overallStats.totalConfirmedAmount) || 0,
          totalConfirmedCount: parseInt(overallStats.totalConfirmedCount, 10) || 0,
          totalPendingAmount: parseFloat(overallStats.totalPendingAmount) || 0,
          totalPendingCount: parseInt(overallStats.totalPendingCount, 10) || 0,
          totalRefundedAmount: parseFloat(overallStats.totalRefundedAmount) || 0,
          totalRefundedCount: parseInt(overallStats.totalRefundedCount, 10) || 0
        },
        generalFund: {
          confirmedAmount: parseFloat(generalStats.generalConfirmedAmount) || 0,
          confirmedCount: parseInt(generalStats.generalConfirmedCount, 10) || 0,
          pendingAmount: parseFloat(generalStats.generalPendingAmount) || 0,
          pendingCount: parseInt(generalStats.generalPendingCount, 10) || 0
        },
        projects: projectsList
      }
    });
  } catch (err) {
    console.error('[Admin Accounts Summary Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve accounts summary.' });
  }
});

// GET /api/admin/accounts/transactions (Complete Ledger with filtering by project, date, status, and search)
router.get('/accounts/transactions', requirePermission('accounts'), async (req, res) => {
  try {
    const { project_id, status, date_range, startDate, endDate, search } = req.query;

    let sql = `
      SELECT 
        d.*,
        p.title_en as project_title_en,
        p.title_ur as project_title_ur,
        p.goal_amount as project_goal_amount,
        p.raised_amount as project_raised_amount,
        c.name_en as category_name_en,
        u_v.full_name as verified_by_name
      FROM donations d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u_v ON d.verified_by_user_id = u_v.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by Project
    if (project_id && project_id !== 'all') {
      if (project_id === 'general' || project_id === 'null') {
        sql += ' AND d.project_id IS NULL';
      } else {
        sql += ' AND d.project_id = ?';
        params.push(parseInt(project_id, 10));
      }
    }

    // Filter by Payment Status
    if (status && status !== 'all') {
      if (status === 'confirmed') {
        sql += " AND LOWER(d.status) IN ('confirmed', 'verified')";
      } else {
        sql += ' AND LOWER(d.status) = ?';
        params.push(status.toLowerCase());
      }
    }

    // Filter by Date Range
    if (date_range === 'today') {
      sql += ' AND DATE(d.created_at) = CURDATE()';
    } else if (date_range === 'month') {
      sql += ' AND YEAR(d.created_at) = YEAR(CURDATE()) AND MONTH(d.created_at) = MONTH(CURDATE())';
    } else if (date_range === 'year') {
      sql += ' AND YEAR(d.created_at) = YEAR(CURDATE())';
    } else if (startDate && endDate) {
      sql += ' AND DATE(d.created_at) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      sql += ' AND DATE(d.created_at) >= ?';
      params.push(startDate);
    } else if (endDate) {
      sql += ' AND DATE(d.created_at) <= ?';
      params.push(endDate);
    }

    // Filter by Search (Donor Name, Phone, Email, Transaction Reference, Notes)
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ' AND (d.donor_name LIKE ? OR d.donor_phone LIKE ? OR d.donor_email LIKE ? OR d.transaction_reference LIKE ? OR d.notes LIKE ?)';
      params.push(q, q, q, q, q);
    }

    sql += ' ORDER BY d.created_at DESC, d.id DESC';

    const [rows] = await db.query(sql, params);

    return res.json({
      success: true,
      transactions: rows.map(r => ({
        ...r,
        amount: parseFloat(r.amount) || 0,
        status: (r.status === 'verified' ? 'confirmed' : r.status)
      }))
    });
  } catch (err) {
    console.error('[Admin Accounts Transactions Error]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve transaction ledger.' });
  }
});

// POST /api/admin/accounts/donations (Manual Donation Recording with project validation and auto progress update)
router.post('/accounts/donations', requirePermission('accounts'), async (req, res) => {
  try {
    const { donor_name, donor_email, donor_phone, amount, payment_method, transaction_reference, project_id, notes, status, donation_date } = req.body;

    if (!donor_name || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Donor name and a valid donation amount (greater than 0) are required.' });
    }

    const cleanAmount = parseFloat(amount);
    const cleanStatus = status ? status.toLowerCase() : 'confirmed';
    const isConfirmed = isConfirmedStatus(cleanStatus);
    const projId = project_id ? parseInt(project_id, 10) : null;
    const ref = transaction_reference ? transaction_reference.trim() : `TXN-${Date.now().toString().slice(-6)}`;

    // Prevent duplicate transaction reference
    if (transaction_reference && transaction_reference.trim()) {
      const [dupes] = await db.query('SELECT id FROM donations WHERE transaction_reference = ? LIMIT 1', [transaction_reference.trim()]);
      if (dupes.length > 0) {
        return res.status(400).json({ success: false, message: 'A donation with this transaction reference ID already exists in the ledger.' });
      }
    }

    // Verify project exists if specified
    let targetProject = null;
    if (projId) {
      const [pRows] = await db.query('SELECT id, title_en, goal_amount, raised_amount FROM projects WHERE id = ?', [projId]);
      if (!pRows.length) return res.status(400).json({ success: false, message: 'Selected project does not exist.' });
      targetProject = pRows[0];
    }

    const confirmedAtVal = isConfirmed ? new Date() : null;
    const createdAtVal = donation_date ? new Date(donation_date) : new Date();

    const verifierId = (isConfirmed && req.session.user) ? req.session.user.id : null;

    const [result] = await db.query(`
      INSERT INTO donations (
        donor_name, donor_email, donor_phone, amount, currency,
        payment_method, transaction_reference, project_id, notes, status, confirmed_at, created_at, verified_by_user_id
      ) VALUES (?, ?, ?, ?, 'PKR', ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      donor_name.trim(),
      donor_email ? donor_email.trim() : '',
      donor_phone ? donor_phone.trim() : '',
      cleanAmount,
      payment_method || 'Direct Bank Transfer',
      ref,
      projId,
      notes ? notes.trim() : '',
      cleanStatus,
      confirmedAtVal,
      createdAtVal,
      verifierId
    ]);

    // Automatically update target project's raised_amount if confirmed
    if (isConfirmed && projId) {
      await adjustProjectRaisedAmount(projId, +cleanAmount);
    }

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'MANUAL_DONATION_RECORD',
        'donation',
        String(result.insertId),
        JSON.stringify({ donor_name, amount: cleanAmount, project_id: projId, status: cleanStatus, transaction_reference: ref })
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      donationId: result.insertId,
      message: isConfirmed
        ? `Donation of PKR ${cleanAmount.toLocaleString()} confirmed and project progress automatically updated!`
        : `Donation recorded as pending verification.`
    });
  } catch (err) {
    console.error('[Admin Accounts Donation Create]', err);
    return res.status(500).json({ success: false, message: 'Failed to record donation.' });
  }
});

// PUT /api/admin/accounts/donations/:id/confirm (Confirm donation & increment project funding)
router.put('/accounts/donations/:id/confirm', requirePermission('accounts'), async (req, res) => {
  try {
    const donationId = req.params.id;
    const [rows] = await db.query('SELECT * FROM donations WHERE id = ?', [donationId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Donation not found.' });

    const donation = rows[0];
    if (isConfirmedStatus(donation.status)) {
      return res.status(400).json({ success: false, message: 'This donation is already confirmed.' });
    }

    const amount = parseFloat(donation.amount) || 0;
    const verifierId = req.session.user ? req.session.user.id : null;

    await db.query(
      "UPDATE donations SET status = 'confirmed', confirmed_at = NOW(), verified_by_user_id = ? WHERE id = ?",
      [verifierId, donationId]
    );

    // Automatically update project funding
    if (donation.project_id) {
      await adjustProjectRaisedAmount(donation.project_id, +amount);
    }

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'CONFIRM_DONATION',
        'donation',
        String(donationId),
        JSON.stringify({ previousStatus: donation.status, amount, project_id: donation.project_id })
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      message: `Donation #${donationId} confirmed successfully! Project funding target updated.`
    });
  } catch (err) {
    console.error('[Admin Accounts Confirm Error]', err);
    return res.status(500).json({ success: false, message: 'Error confirming donation.' });
  }
});

// PUT /api/admin/accounts/donations/:id/refund (Refund / Reverse donation & decrement project funding)
router.put('/accounts/donations/:id/refund', requirePermission('accounts'), async (req, res) => {
  try {
    const donationId = req.params.id;
    const { refund_reason } = req.body;

    const [rows] = await db.query('SELECT * FROM donations WHERE id = ?', [donationId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Donation not found.' });

    const donation = rows[0];
    const wasConfirmed = isConfirmedStatus(donation.status);
    const amount = parseFloat(donation.amount) || 0;

    const updatedNotes = donation.notes 
      ? `${donation.notes} [Refund Reason: ${refund_reason || 'Reversed by admin'}]`
      : `Refund Reason: ${refund_reason || 'Reversed by admin'}`;

    await db.query(
      "UPDATE donations SET status = 'refunded', notes = ? WHERE id = ?",
      [updatedNotes, donationId]
    );

    // Automatically deduct from project funding if it was confirmed
    if (wasConfirmed && donation.project_id) {
      await adjustProjectRaisedAmount(donation.project_id, -amount);
    }

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        req.session.user ? req.session.user.id : null,
        'REFUND_DONATION',
        'donation',
        String(donationId),
        JSON.stringify({ previousStatus: donation.status, amount, project_id: donation.project_id, reason: refund_reason })
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      message: `Donation #${donationId} refunded and project funding adjusted accordingly.`
    });
  } catch (err) {
    console.error('[Admin Accounts Refund Error]', err);
    return res.status(500).json({ success: false, message: 'Error refunding donation.' });
  }
});

// ==================== ORGANIZATION SETUP: DEPARTMENTS ====================
// GET /api/admin/departments
router.get('/departments', requirePermission('settings'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.*,
             (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) as staff_count,
             (SELECT COUNT(*) FROM volunteer_applications v WHERE v.department_id = d.id) as volunteer_count
      FROM departments d
      ORDER BY d.sort_order ASC, d.id ASC
    `);
    return res.json({ success: true, departments: rows });
  } catch (err) {
    console.error('[Departments GET]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
});

// GET /api/admin/departments/:id
router.get('/departments/:id', requirePermission('settings'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM departments WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Department not found.' });
    
    // Fetch assigned staff in this department
    const [staff] = await db.query(`
      SELECT id, full_name, username, email, role, designation, phone, photo_url, is_active 
      FROM users WHERE department_id = ?
      ORDER BY id ASC
    `, [req.params.id]);

    // Fetch assigned volunteers in this department
    const [volunteers] = await db.query(`
      SELECT id, full_name, email, phone, role, designation, photo_url, status 
      FROM volunteer_applications WHERE department_id = ?
      ORDER BY id ASC
    `, [req.params.id]);

    return res.json({
      success: true,
      department: {
        ...rows[0],
        staff_count: staff.length,
        volunteer_count: volunteers.length
      },
      staff,
      volunteers
    });
  } catch (err) {
    console.error('[Department GET ID]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve department.' });
  }
});

// POST /api/admin/departments
router.post('/departments', requirePermission('settings'), async (req, res) => {
  try {
    const { name_en, name_ur, code, description, sort_order, is_active } = req.body;
    if (!name_en || !name_ur) {
      return res.status(400).json({ success: false, message: 'Department name in English and Urdu are required.' });
    }

    const cleanCode = (code ? code.trim().toUpperCase() : name_en.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().slice(0, 20)) || 'DEPT';
    
    // Check duplicate code
    const [dup] = await db.query('SELECT id FROM departments WHERE code = ? LIMIT 1', [cleanCode]);
    if (dup.length > 0) {
      return res.status(400).json({ success: false, message: `Department code '${cleanCode}' is already in use.` });
    }

    const [result] = await db.query(`
      INSERT INTO departments (code, name_en, name_ur, description, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      cleanCode,
      name_en.trim(),
      name_ur.trim(),
      description ? description.trim() : '',
      parseInt(sort_order, 10) || 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    ]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'CREATE_DEPARTMENT', 'department', String(result.insertId), JSON.stringify({ code: cleanCode, name_en })]
    ).catch(() => {});

    return res.json({
      success: true,
      id: result.insertId,
      message: `Department '${name_en}' created successfully!`
    });
  } catch (err) {
    console.error('[Department POST]', err);
    return res.status(500).json({ success: false, message: 'Failed to create department.' });
  }
});

// PUT /api/admin/departments/:id
router.put('/departments/:id', requirePermission('settings'), async (req, res) => {
  try {
    const deptId = req.params.id;
    const { name_en, name_ur, code, description, sort_order, is_active } = req.body;

    const [rows] = await db.query('SELECT * FROM departments WHERE id = ?', [deptId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Department not found.' });

    if (code) {
      const cleanCode = code.trim().toUpperCase();
      const [dup] = await db.query('SELECT id FROM departments WHERE code = ? AND id != ? LIMIT 1', [cleanCode, deptId]);
      if (dup.length > 0) {
        return res.status(400).json({ success: false, message: `Department code '${cleanCode}' is already used by another department.` });
      }
    }

    await db.query(`
      UPDATE departments SET
        name_en = COALESCE(?, name_en),
        name_ur = COALESCE(?, name_ur),
        code = COALESCE(?, code),
        description = COALESCE(?, description),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
      WHERE id = ?
    `, [
      name_en ? name_en.trim() : null,
      name_ur ? name_ur.trim() : null,
      code ? code.trim().toUpperCase() : null,
      description !== undefined ? description.trim() : null,
      sort_order !== undefined ? parseInt(sort_order, 10) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      deptId
    ]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'UPDATE_DEPARTMENT', 'department', String(deptId), JSON.stringify({ name_en, code })]
    ).catch(() => {});

    return res.json({ success: true, message: 'Department updated successfully.' });
  } catch (err) {
    console.error('[Department PUT]', err);
    return res.status(500).json({ success: false, message: 'Failed to update department.' });
  }
});

// DELETE /api/admin/departments/:id
router.delete('/departments/:id', requirePermission('settings'), async (req, res) => {
  try {
    const deptId = req.params.id;
    const [rows] = await db.query('SELECT name_en FROM departments WHERE id = ?', [deptId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Department not found.' });

    // Set department_id = NULL on linked users and volunteers
    await db.query('UPDATE users SET department_id = NULL WHERE department_id = ?', [deptId]);
    await db.query('UPDATE volunteer_applications SET department_id = NULL WHERE department_id = ?', [deptId]);
    await db.query('UPDATE designations SET department_id = NULL WHERE department_id = ?', [deptId]);
    await db.query('DELETE FROM departments WHERE id = ?', [deptId]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'DELETE_DEPARTMENT', 'department', String(deptId), JSON.stringify({ name_en: rows[0].name_en })]
    ).catch(() => {});

    return res.json({ success: true, message: 'Department removed successfully.' });
  } catch (err) {
    console.error('[Department DELETE]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete department.' });
  }
});

// ==================== ORGANIZATION SETUP: USER ROLES ====================
// GET /api/admin/roles
router.get('/roles', requirePermission('settings'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ur.*,
             (SELECT COUNT(*) FROM users u WHERE u.role_id = ur.id OR u.role = ur.role_key) as staff_count,
             (SELECT COUNT(*) FROM volunteer_applications v WHERE v.role_id = ur.id OR v.role = ur.role_key) as volunteer_count
      FROM user_roles ur
      ORDER BY ur.id ASC
    `);
    return res.json({ success: true, roles: rows });
  } catch (err) {
    console.error('[Roles GET]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch roles.' });
  }
});

// GET /api/admin/roles/:id
router.get('/roles/:id', requirePermission('settings'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM user_roles WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Role not found.' });

    const roleObj = rows[0];

    // Fetch assigned staff
    const [staff] = await db.query(`
      SELECT id, full_name, username, email, role, designation, phone, photo_url, is_active 
      FROM users WHERE role_id = ? OR role = ?
      ORDER BY id ASC
    `, [req.params.id, roleObj.role_key]);

    // Fetch assigned volunteers
    const [volunteers] = await db.query(`
      SELECT id, full_name, email, phone, role, designation, photo_url, status 
      FROM volunteer_applications WHERE role_id = ? OR role = ?
      ORDER BY id ASC
    `, [req.params.id, roleObj.role_key]);

    return res.json({
      success: true,
      role: {
        ...roleObj,
        staff_count: staff.length,
        volunteer_count: volunteers.length,
        users_count: staff.length + volunteers.length
      },
      staff,
      volunteers
    });
  } catch (err) {
    console.error('[Role GET ID]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve role.' });
  }
});

// POST /api/admin/roles
router.post('/roles', requirePermission('settings'), async (req, res) => {
  try {
    const { role_key, name_en, name_ur, description, is_active } = req.body;
    if (!name_en || !name_ur) {
      return res.status(400).json({ success: false, message: 'Role name in English and Urdu are required.' });
    }

    const cleanKey = (role_key ? role_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') : name_en.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')) || 'role';
    
    // Check duplicates
    const [dup] = await db.query('SELECT id FROM user_roles WHERE role_key = ? LIMIT 1', [cleanKey]);
    if (dup.length > 0) {
      return res.status(400).json({ success: false, message: `Role key '${cleanKey}' is already in use.` });
    }

    const [result] = await db.query(`
      INSERT INTO user_roles (role_key, name_en, name_ur, description, is_system, is_active)
      VALUES (?, ?, ?, ?, 0, ?)
    `, [
      cleanKey,
      name_en.trim(),
      name_ur.trim(),
      description ? description.trim() : '',
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    ]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'CREATE_ROLE', 'role', String(result.insertId), JSON.stringify({ role_key: cleanKey, name_en })]
    ).catch(() => {});

    return res.json({
      success: true,
      id: result.insertId,
      message: `Role '${name_en}' created successfully!`
    });
  } catch (err) {
    console.error('[Role POST]', err);
    return res.status(500).json({ success: false, message: 'Failed to create role.' });
  }
});

// PUT /api/admin/roles/:id
router.put('/roles/:id', requirePermission('settings'), async (req, res) => {
  try {
    const roleId = req.params.id;
    const { name_en, name_ur, description, is_active } = req.body;

    const [rows] = await db.query('SELECT * FROM user_roles WHERE id = ?', [roleId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Role not found.' });

    await db.query(`
      UPDATE user_roles SET
        name_en = COALESCE(?, name_en),
        name_ur = COALESCE(?, name_ur),
        description = COALESCE(?, description),
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
      WHERE id = ?
    `, [
      name_en ? name_en.trim() : null,
      name_ur ? name_ur.trim() : null,
      description !== undefined ? description.trim() : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      roleId
    ]);

    return res.json({ success: true, message: 'User role updated successfully.' });
  } catch (err) {
    console.error('[Role PUT]', err);
    return res.status(500).json({ success: false, message: 'Failed to update role.' });
  }
});

// DELETE /api/admin/roles/:id
router.delete('/roles/:id', requirePermission('settings'), async (req, res) => {
  try {
    const roleId = req.params.id;
    const [rows] = await db.query('SELECT role_key, name_en, is_system FROM user_roles WHERE id = ?', [roleId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Role not found.' });

    if (rows[0].is_system === 1) {
      return res.status(400).json({ success: false, message: `System role '${rows[0].name_en}' cannot be deleted as it is vital for system permissions.` });
    }

    await db.query('UPDATE users SET role_id = NULL WHERE role_id = ?', [roleId]);
    await db.query('UPDATE volunteer_applications SET role_id = NULL WHERE role_id = ?', [roleId]);
    await db.query('DELETE FROM user_roles WHERE id = ?', [roleId]);

    return res.json({ success: true, message: 'Role deleted successfully.' });
  } catch (err) {
    console.error('[Role DELETE]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete role.' });
  }
});

// ==================== ORGANIZATION SETUP: DESIGNATIONS ====================
// GET /api/admin/designations
router.get('/designations', requirePermission('settings'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT des.*,
             des.name_en as title_en, des.name_ur as title_ur,
             d.name_en as department_name_en, d.name_ur as department_name_ur, d.code as department_code,
             (SELECT COUNT(*) FROM users u WHERE u.designation_id = des.id) as staff_count,
             (SELECT COUNT(*) FROM volunteer_applications v WHERE v.designation_id = des.id) as volunteer_count
      FROM designations des
      LEFT JOIN departments d ON des.department_id = d.id
      ORDER BY des.sort_order ASC, des.id ASC
    `);
    return res.json({ success: true, designations: rows });
  } catch (err) {
    console.error('[Designations GET]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch designations.' });
  }
});

// GET /api/admin/designations/:id
router.get('/designations/:id', requirePermission('settings'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT des.*,
             des.name_en as title_en, des.name_ur as title_ur,
             d.name_en as department_name_en, d.name_ur as department_name_ur
      FROM designations des
      LEFT JOIN departments d ON des.department_id = d.id
      WHERE des.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Designation not found.' });

    const desObj = rows[0];

    // Fetch assigned staff
    const [staff] = await db.query(`
      SELECT id, full_name, username, email, role, designation, phone, photo_url, is_active 
      FROM users WHERE designation_id = ? OR designation = ?
      ORDER BY id ASC
    `, [req.params.id, desObj.name_en]);

    // Fetch assigned volunteers
    const [volunteers] = await db.query(`
      SELECT id, full_name, email, phone, role, designation, photo_url, status 
      FROM volunteer_applications WHERE designation_id = ? OR designation = ?
      ORDER BY id ASC
    `, [req.params.id, desObj.name_en]);

    return res.json({
      success: true,
      designation: {
        ...desObj,
        users_count: staff.length,
        volunteers_count: volunteers.length,
        members_count: staff.length + volunteers.length
      },
      staff,
      volunteers
    });
  } catch (err) {
    console.error('[Designation GET ID]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve designation.' });
  }
});

// POST /api/admin/designations
router.post('/designations', requirePermission('settings'), async (req, res) => {
  try {
    const { name_en, name_ur, title_en, title_ur, department_id, description, sort_order, is_active } = req.body;
    const finalNameEn = (name_en || title_en || '').trim();
    const finalNameUr = (name_ur || title_ur || '').trim();
    if (!finalNameEn || !finalNameUr) {
      return res.status(400).json({ success: false, message: 'Designation title in English and Urdu are required.' });
    }

    const deptIdVal = department_id ? parseInt(department_id, 10) : null;

    const [result] = await db.query(`
      INSERT INTO designations (name_en, name_ur, department_id, description, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      finalNameEn,
      finalNameUr,
      deptIdVal,
      description ? description.trim() : '',
      parseInt(sort_order, 10) || 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    ]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'CREATE_DESIGNATION', 'designation', String(result.insertId), JSON.stringify({ name_en: finalNameEn, department_id: deptIdVal })]
    ).catch(() => {});

    return res.json({
      success: true,
      id: result.insertId,
      message: `Designation '${finalNameEn}' created successfully!`
    });
  } catch (err) {
    console.error('[Designation POST]', err);
    return res.status(500).json({ success: false, message: 'Failed to create designation.' });
  }
});

// PUT /api/admin/designations/:id
router.put('/designations/:id', requirePermission('settings'), async (req, res) => {
  try {
    const desId = req.params.id;
    const { name_en, name_ur, title_en, title_ur, department_id, description, sort_order, is_active } = req.body;
    const finalNameEn = (name_en !== undefined ? name_en : title_en);
    const finalNameUr = (name_ur !== undefined ? name_ur : title_ur);

    const [rows] = await db.query('SELECT * FROM designations WHERE id = ?', [desId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Designation not found.' });

    const deptIdVal = department_id !== undefined ? (department_id ? parseInt(department_id, 10) : null) : rows[0].department_id;

    await db.query(`
      UPDATE designations SET
        name_en = COALESCE(?, name_en),
        name_ur = COALESCE(?, name_ur),
        department_id = ?,
        description = COALESCE(?, description),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
      WHERE id = ?
    `, [
      finalNameEn ? String(finalNameEn).trim() : null,
      finalNameUr ? String(finalNameUr).trim() : null,
      deptIdVal,
      description !== undefined ? description.trim() : null,
      sort_order !== undefined ? parseInt(sort_order, 10) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      desId
    ]);

    return res.json({ success: true, message: 'Designation updated successfully.' });
  } catch (err) {
    console.error('[Designation PUT]', err);
    return res.status(500).json({ success: false, message: 'Failed to update designation.' });
  }
});

// DELETE /api/admin/designations/:id
router.delete('/designations/:id', requirePermission('settings'), async (req, res) => {
  try {
    const desId = req.params.id;
    const [rows] = await db.query('SELECT name_en FROM designations WHERE id = ?', [desId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Designation not found.' });

    await db.query('UPDATE users SET designation_id = NULL WHERE designation_id = ?', [desId]);
    await db.query('UPDATE volunteer_applications SET designation_id = NULL WHERE designation_id = ?', [desId]);
    await db.query('DELETE FROM designations WHERE id = ?', [desId]);

    return res.json({ success: true, message: 'Designation deleted successfully.' });
  } catch (err) {
    console.error('[Designation DELETE]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete designation.' });
  }
});

// ==================== ORGANIZATION SETUP: PROJECT CATEGORIES ====================
// GET /api/admin/categories
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*,
             c.icon as icon_class,
             (SELECT COUNT(*) FROM projects p WHERE p.category_id = c.id) as projects_count,
             (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) as articles_count
      FROM categories c
      ORDER BY c.sort_order ASC, c.id ASC
    `);
    return res.json({ success: true, categories: rows });
  } catch (err) {
    console.error('[Categories GET]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// GET /api/admin/categories/:id
router.get('/categories/:id', requirePermission('settings'), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, c.icon as icon_class,
             (SELECT COUNT(*) FROM projects p WHERE p.category_id = c.id) as projects_count,
             (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) as articles_count
      FROM categories c WHERE c.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found.' });

    // Fetch all linked projects
    const [projects] = await db.query(`
      SELECT p.id, p.title_en, p.title_ur, p.slug, p.status, p.goal_amount, p.raised_amount, p.image_url, p.created_at
      FROM projects p
      WHERE p.category_id = ?
      ORDER BY p.id DESC
    `, [req.params.id]);

    return res.json({
      success: true,
      category: {
        ...rows[0],
        projects_count: projects.length
      },
      projects
    });
  } catch (err) {
    console.error('[Category GET ID]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve category.' });
  }
});

// POST /api/admin/categories
router.post('/categories', requirePermission('settings'), async (req, res) => {
  try {
    const { name_en, name_ur, slug, icon, icon_class, image_url, description_en, description_ur, sort_order, is_active } = req.body;
    if (!name_en || !name_ur) {
      return res.status(400).json({ success: false, message: 'Category name in English and Urdu are required.' });
    }

    const finalIcon = (icon || icon_class || 'shapes').trim();

    let cleanSlug = (slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') : name_en.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')) || 'category';
    cleanSlug = cleanSlug.replace(/-+/g, '-').replace(/^-|-$/g, '');

    // Check duplicate slug
    const [dup] = await db.query('SELECT id FROM categories WHERE slug = ? LIMIT 1', [cleanSlug]);
    if (dup.length > 0) {
      cleanSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
    }

    const [result] = await db.query(`
      INSERT INTO categories (slug, icon, image_url, name_en, name_ur, description_en, description_ur, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cleanSlug,
      finalIcon,
      image_url ? image_url.trim() : null,
      name_en.trim(),
      name_ur.trim(),
      description_en ? description_en.trim() : '',
      description_ur ? description_ur.trim() : '',
      parseInt(sort_order, 10) || 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    ]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'CREATE_CATEGORY', 'category', String(result.insertId), JSON.stringify({ slug: cleanSlug, name_en })]
    ).catch(() => {});

    return res.json({
      success: true,
      id: result.insertId,
      message: `Project Category '${name_en}' created successfully!`
    });
  } catch (err) {
    console.error('[Category POST]', err);
    return res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
});

// PUT /api/admin/categories/:id
router.put('/categories/:id', requirePermission('settings'), async (req, res) => {
  try {
    const catId = req.params.id;
    const { name_en, name_ur, slug, icon, image_url, description_en, description_ur, sort_order, is_active } = req.body;

    const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [catId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found.' });

    let cleanSlug = slug ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') : null;
    if (cleanSlug) {
      const [dup] = await db.query('SELECT id FROM categories WHERE slug = ? AND id != ? LIMIT 1', [cleanSlug, catId]);
      if (dup.length > 0) {
        return res.status(400).json({ success: false, message: `Category slug '${cleanSlug}' is already used by another category.` });
      }
    }

    await db.query(`
      UPDATE categories SET
        name_en = COALESCE(?, name_en),
        name_ur = COALESCE(?, name_ur),
        slug = COALESCE(?, slug),
        icon = COALESCE(?, icon),
        image_url = COALESCE(?, image_url),
        description_en = COALESCE(?, description_en),
        description_ur = COALESCE(?, description_ur),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [
      name_en ? name_en.trim() : null,
      name_ur ? name_ur.trim() : null,
      cleanSlug,
      icon ? icon.trim() : null,
      image_url !== undefined ? (image_url ? image_url.trim() : null) : null,
      description_en !== undefined ? description_en.trim() : null,
      description_ur !== undefined ? description_ur.trim() : null,
      sort_order !== undefined ? parseInt(sort_order, 10) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      catId
    ]);

    return res.json({ success: true, message: 'Category updated successfully.' });
  } catch (err) {
    console.error('[Category PUT]', err);
    return res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
});

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', requirePermission('settings'), async (req, res) => {
  try {
    const catId = req.params.id;
    const [rows] = await db.query('SELECT name_en FROM categories WHERE id = ?', [catId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found.' });

    // Set category_id = NULL on linked projects and articles to maintain referential integrity
    await db.query('UPDATE projects SET category_id = NULL WHERE category_id = ?', [catId]);
    await db.query('UPDATE articles SET category_id = NULL WHERE category_id = ?', [catId]);
    await db.query('DELETE FROM categories WHERE id = ?', [catId]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'DELETE_CATEGORY', 'category', String(catId), JSON.stringify({ name_en: rows[0].name_en })]
    ).catch(() => {});

    return res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('[Category DELETE]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
});

// =========================================================================
// ANNOUNCEMENTS MANAGEMENT ENDPOINTS
// =========================================================================

// GET /api/admin/announcements
router.get('/announcements', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM announcements ORDER BY sort_order ASC, id ASC');
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[Admin Announcements GET]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve announcements.' });
  }
});

// POST /api/admin/announcements
router.post('/announcements', async (req, res) => {
  try {
    const { content_en, content_ur, link_url, is_active, sort_order } = req.body;
    if (!content_en || !content_en.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement content (English) is required.' });
    }

    const activeFlag = is_active === undefined || is_active === null ? 1 : (is_active ? 1 : 0);
    const orderVal = parseInt(sort_order, 10) || 0;

    const [result] = await db.query(
      `INSERT INTO announcements (content_en, content_ur, link_url, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [content_en.trim(), content_ur ? content_ur.trim() : null, link_url ? link_url.trim() : null, activeFlag, orderVal]
    );

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'CREATE_ANNOUNCEMENT', 'announcement', String(result.insertId), JSON.stringify({ content_en: content_en.trim() })]
    ).catch(() => {});

    cache.invalidateAll();

    return res.json({
      success: true,
      announcementId: result.insertId,
      message: 'Announcement created successfully.'
    });
  } catch (err) {
    console.error('[Admin Announcements POST]', err);
    return res.status(500).json({ success: false, message: 'Failed to create announcement.' });
  }
});

// PUT /api/admin/announcements/:id
router.put('/announcements/:id', async (req, res) => {
  try {
    const annId = req.params.id;
    const { content_en, content_ur, link_url, is_active, sort_order } = req.body;
    if (!content_en || !content_en.trim()) {
      return res.status(400).json({ success: false, message: 'Announcement content (English) is required.' });
    }

    const activeFlag = is_active === undefined || is_active === null ? 1 : (is_active ? 1 : 0);
    const orderVal = parseInt(sort_order, 10) || 0;

    await db.query(
      `UPDATE announcements 
       SET content_en = ?, content_ur = ?, link_url = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [content_en.trim(), content_ur ? content_ur.trim() : null, link_url ? link_url.trim() : null, activeFlag, orderVal, annId]
    );

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'UPDATE_ANNOUNCEMENT', 'announcement', String(annId), JSON.stringify({ content_en: content_en.trim() })]
    ).catch(() => {});

    cache.invalidateAll();

    return res.json({ success: true, message: 'Announcement updated successfully.' });
  } catch (err) {
    console.error('[Admin Announcements PUT]', err);
    return res.status(500).json({ success: false, message: 'Failed to update announcement.' });
  }
});

// PATCH /api/admin/announcements/:id/toggle
router.patch('/announcements/:id/toggle', async (req, res) => {
  try {
    const annId = req.params.id;
    const [rows] = await db.query('SELECT is_active FROM announcements WHERE id = ?', [annId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Announcement not found.' });

    const newStatus = rows[0].is_active ? 0 : 1;
    await db.query('UPDATE announcements SET is_active = ? WHERE id = ?', [newStatus, annId]);

    cache.invalidateAll();

    return res.json({ success: true, is_active: newStatus, message: `Announcement ${newStatus ? 'activated' : 'deactivated'} successfully.` });
  } catch (err) {
    console.error('[Admin Announcements TOGGLE]', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle announcement status.' });
  }
});

// DELETE /api/admin/announcements/:id
router.delete('/announcements/:id', async (req, res) => {
  try {
    const annId = req.params.id;
    await db.query('DELETE FROM announcements WHERE id = ?', [annId]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'DELETE_ANNOUNCEMENT', 'announcement', String(annId), JSON.stringify({ id: annId })]
    ).catch(() => {});

    cache.invalidateAll();

    return res.json({ success: true, message: 'Announcement deleted successfully.' });
  } catch (err) {
    console.error('[Admin Announcements DELETE]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete announcement.' });
  }
});

// =========================================================================
// DYNAMIC MENU MANAGEMENT ENDPOINTS
// =========================================================================

// GET /api/admin/menus
router.get('/menus', async (req, res) => {
  try {
    const [menus] = await db.query('SELECT * FROM header_menus ORDER BY sort_order ASC, id ASC');
    const [items] = await db.query('SELECT * FROM header_menu_items ORDER BY sort_order ASC, id ASC');

    menus.forEach(m => {
      m.items = items.filter(it => it.menu_id === m.id);
    });

    return res.json({ success: true, data: menus });
  } catch (err) {
    console.error('[Admin Menus GET]', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve menus.' });
  }
});

// POST /api/admin/menus
router.post('/menus', async (req, res) => {
  try {
    const { title_en, title_ur, row_num, col_side, is_active, sort_order, menu_key } = req.body;
    if (!title_en || !title_en.trim()) {
      return res.status(400).json({ success: false, message: 'Menu title (English) is required.' });
    }

    const rowVal = parseInt(row_num, 10) === 2 ? 2 : 1;
    const sideVal = col_side === 'right' ? 'right' : 'left';
    const activeFlag = is_active === undefined || is_active === null ? 1 : (is_active ? 1 : 0);
    const orderVal = parseInt(sort_order, 10) || 0;
    const keyVal = menu_key ? menu_key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') : `menu_${Date.now()}`;

    const [result] = await db.query(
      `INSERT INTO header_menus (menu_key, title_en, title_ur, row_num, col_side, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [keyVal, title_en.trim(), title_ur ? title_ur.trim() : null, rowVal, sideVal, activeFlag, orderVal]
    );

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'CREATE_MENU', 'menu', String(result.insertId), JSON.stringify({ title_en: title_en.trim() })]
    ).catch(() => {});

    cache.invalidateAll();

    return res.json({
      success: true,
      menuId: result.insertId,
      message: 'Menu created successfully.'
    });
  } catch (err) {
    console.error('[Admin Menus POST]', err);
    return res.status(500).json({ success: false, message: 'Failed to create menu.' });
  }
});

// PUT /api/admin/menus/:id
router.put('/menus/:id', async (req, res) => {
  try {
    const menuId = req.params.id;
    const { title_en, title_ur, row_num, col_side, is_active, sort_order } = req.body;
    if (!title_en || !title_en.trim()) {
      return res.status(400).json({ success: false, message: 'Menu title (English) is required.' });
    }

    const rowVal = parseInt(row_num, 10) === 2 ? 2 : 1;
    const sideVal = col_side === 'right' ? 'right' : 'left';
    const activeFlag = is_active === undefined || is_active === null ? 1 : (is_active ? 1 : 0);
    const orderVal = parseInt(sort_order, 10) || 0;

    await db.query(
      `UPDATE header_menus 
       SET title_en = ?, title_ur = ?, row_num = ?, col_side = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [title_en.trim(), title_ur ? title_ur.trim() : null, rowVal, sideVal, activeFlag, orderVal, menuId]
    );

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'UPDATE_MENU', 'menu', String(menuId), JSON.stringify({ title_en: title_en.trim() })]
    ).catch(() => {});

    cache.invalidateAll();

    return res.json({ success: true, message: 'Menu updated successfully.' });
  } catch (err) {
    console.error('[Admin Menus PUT]', err);
    return res.status(500).json({ success: false, message: 'Failed to update menu.' });
  }
});

// PATCH /api/admin/menus/:id/toggle
router.patch('/menus/:id/toggle', async (req, res) => {
  try {
    const menuId = req.params.id;
    const [rows] = await db.query('SELECT is_active FROM header_menus WHERE id = ?', [menuId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Menu not found.' });

    const newStatus = rows[0].is_active ? 0 : 1;
    await db.query('UPDATE header_menus SET is_active = ? WHERE id = ?', [newStatus, menuId]);

    cache.invalidateAll();

    return res.json({ success: true, is_active: newStatus, message: `Menu ${newStatus ? 'activated' : 'deactivated'} successfully.` });
  } catch (err) {
    console.error('[Admin Menus TOGGLE]', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle menu status.' });
  }
});

// DELETE /api/admin/menus/:id
router.delete('/menus/:id', async (req, res) => {
  try {
    const menuId = req.params.id;
    await db.query('DELETE FROM header_menus WHERE id = ?', [menuId]);

    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [req.session.user?.id, 'DELETE_MENU', 'menu', String(menuId), JSON.stringify({ id: menuId })]
    ).catch(() => {});

    cache.invalidateAll();

    return res.json({ success: true, message: 'Menu deleted successfully.' });
  } catch (err) {
    console.error('[Admin Menus DELETE]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete menu.' });
  }
});

// POST /api/admin/menus/:id/items
router.post('/menus/:id/items', async (req, res) => {
  try {
    const menuId = req.params.id;
    const { title_en, title_ur, page_url, open_new_tab, is_active, sort_order } = req.body;

    if (!title_en || !title_en.trim() || !page_url || !page_url.trim()) {
      return res.status(400).json({ success: false, message: 'Item title and page URL are required.' });
    }

    const activeFlag = is_active === undefined || is_active === null ? 1 : (is_active ? 1 : 0);
    const newTab = open_new_tab ? 1 : 0;
    const orderVal = parseInt(sort_order, 10) || 0;

    const [result] = await db.query(
      `INSERT INTO header_menu_items (menu_id, title_en, title_ur, page_url, open_new_tab, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [menuId, title_en.trim(), title_ur ? title_ur.trim() : null, page_url.trim(), newTab, activeFlag, orderVal]
    );

    cache.invalidateAll();

    return res.json({
      success: true,
      itemId: result.insertId,
      message: 'Page link added to menu successfully.'
    });
  } catch (err) {
    console.error('[Admin Menu Items POST]', err);
    return res.status(500).json({ success: false, message: 'Failed to add item to menu.' });
  }
});

// PUT /api/admin/menu-items/:id
router.put('/menu-items/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    const { title_en, title_ur, page_url, open_new_tab, is_active, sort_order } = req.body;

    if (!title_en || !title_en.trim() || !page_url || !page_url.trim()) {
      return res.status(400).json({ success: false, message: 'Item title and page URL are required.' });
    }

    const activeFlag = is_active === undefined || is_active === null ? 1 : (is_active ? 1 : 0);
    const newTab = open_new_tab ? 1 : 0;
    const orderVal = parseInt(sort_order, 10) || 0;

    await db.query(
      `UPDATE header_menu_items 
       SET title_en = ?, title_ur = ?, page_url = ?, open_new_tab = ?, is_active = ?, sort_order = ?
       WHERE id = ?`,
      [title_en.trim(), title_ur ? title_ur.trim() : null, page_url.trim(), newTab, activeFlag, orderVal, itemId]
    );

    cache.invalidateAll();

    return res.json({ success: true, message: 'Menu item updated successfully.' });
  } catch (err) {
    console.error('[Admin Menu Items PUT]', err);
    return res.status(500).json({ success: false, message: 'Failed to update menu item.' });
  }
});

// PATCH /api/admin/menu-items/:id/toggle
router.patch('/menu-items/:id/toggle', async (req, res) => {
  try {
    const itemId = req.params.id;
    const [rows] = await db.query('SELECT is_active FROM header_menu_items WHERE id = ?', [itemId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Menu item not found.' });

    const newStatus = rows[0].is_active ? 0 : 1;
    await db.query('UPDATE header_menu_items SET is_active = ? WHERE id = ?', [newStatus, itemId]);

    cache.invalidateAll();

    return res.json({ success: true, is_active: newStatus, message: `Menu item ${newStatus ? 'activated' : 'deactivated'} successfully.` });
  } catch (err) {
    console.error('[Admin Menu Items TOGGLE]', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle menu item.' });
  }
});

// DELETE /api/admin/menu-items/:id
router.delete('/menu-items/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    await db.query('DELETE FROM header_menu_items WHERE id = ?', [itemId]);

    cache.invalidateAll();

    return res.json({ success: true, message: 'Menu item deleted successfully.' });
  } catch (err) {
    console.error('[Admin Menu Items DELETE]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete menu item.' });
  }
});

// =========================================================================
// HERO SLIDER CRUD ENDPOINTS
// =========================================================================

// GET /api/admin/hero-slides
router.get('/hero-slides', async (req, res) => {
  try {
    const [slides] = await db.query(
      'SELECT * FROM hero_slides ORDER BY sort_order ASC, id ASC'
    );
    return res.json({ success: true, data: slides });
  } catch (err) {
    console.error('[Admin Hero Slides GET]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch hero slides.' });
  }
});

// POST /api/admin/hero-slides
router.post('/hero-slides', async (req, res) => {
  try {
    const {
      title_en, title_ur, eyebrow_en, eyebrow_ur, subtitle_en, subtitle_ur,
      description_en, description_ur, btn1_text_en, btn1_text_ur, btn1_link,
      btn2_text_en, btn2_text_ur, btn2_link, image_url, image_mobile_url,
      is_active, sort_order
    } = req.body;

    if (!image_url || !image_url.trim()) {
      return res.status(400).json({ success: false, message: 'Slide image URL is required.' });
    }

    const activeFlag = is_active === undefined || is_active === null ? 1 : (is_active ? 1 : 0);
    const orderVal = parseInt(sort_order, 10) || 0;

    const [result] = await db.query(`
      INSERT INTO hero_slides 
      (title_en, title_ur, eyebrow_en, eyebrow_ur, subtitle_en, subtitle_ur, description_en, description_ur, btn1_text_en, btn1_text_ur, btn1_link, btn2_text_en, btn2_text_ur, btn2_link, image_url, image_mobile_url, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title_en?.trim() || null, title_ur?.trim() || null,
      eyebrow_en?.trim() || null, eyebrow_ur?.trim() || null,
      subtitle_en?.trim() || null, subtitle_ur?.trim() || null,
      description_en?.trim() || null, description_ur?.trim() || null,
      btn1_text_en?.trim() || null, btn1_text_ur?.trim() || null, btn1_link?.trim() || null,
      btn2_text_en?.trim() || null, btn2_text_ur?.trim() || null, btn2_link?.trim() || null,
      image_url.trim(), image_mobile_url?.trim() || null,
      activeFlag, orderVal
    ]);

    if (cache && typeof cache.invalidateGroup === 'function') cache.invalidateGroup('public');

    return res.json({
      success: true,
      slideId: result.insertId,
      message: 'Hero slide created successfully.'
    });
  } catch (err) {
    console.error('[Admin Hero Slides POST]', err);
    return res.status(500).json({ success: false, message: 'Failed to create hero slide.' });
  }
});

// PUT /api/admin/hero-slides/:id
router.put('/hero-slides/:id', async (req, res) => {
  try {
    const slideId = req.params.id;
    const {
      title_en, title_ur, eyebrow_en, eyebrow_ur, subtitle_en, subtitle_ur,
      description_en, description_ur, btn1_text_en, btn1_text_ur, btn1_link,
      btn2_text_en, btn2_text_ur, btn2_link, image_url, image_mobile_url,
      is_active, sort_order
    } = req.body;

    if (!image_url || !image_url.trim()) {
      return res.status(400).json({ success: false, message: 'Slide image URL is required.' });
    }

    const activeFlag = is_active === undefined || is_active === null ? 1 : (is_active ? 1 : 0);
    const orderVal = parseInt(sort_order, 10) || 0;

    await db.query(`
      UPDATE hero_slides SET
        title_en = ?, title_ur = ?, eyebrow_en = ?, eyebrow_ur = ?,
        subtitle_en = ?, subtitle_ur = ?, description_en = ?, description_ur = ?,
        btn1_text_en = ?, btn1_text_ur = ?, btn1_link = ?,
        btn2_text_en = ?, btn2_text_ur = ?, btn2_link = ?,
        image_url = ?, image_mobile_url = ?, is_active = ?, sort_order = ?
      WHERE id = ?
    `, [
      title_en?.trim() || null, title_ur?.trim() || null,
      eyebrow_en?.trim() || null, eyebrow_ur?.trim() || null,
      subtitle_en?.trim() || null, subtitle_ur?.trim() || null,
      description_en?.trim() || null, description_ur?.trim() || null,
      btn1_text_en?.trim() || null, btn1_text_ur?.trim() || null, btn1_link?.trim() || null,
      btn2_text_en?.trim() || null, btn2_text_ur?.trim() || null, btn2_link?.trim() || null,
      image_url.trim(), image_mobile_url?.trim() || null,
      activeFlag, orderVal, slideId
    ]);

    if (cache && typeof cache.invalidateGroup === 'function') cache.invalidateGroup('public');

    return res.json({ success: true, message: 'Hero slide updated successfully.' });
  } catch (err) {
    console.error('[Admin Hero Slides PUT]', err);
    return res.status(500).json({ success: false, message: 'Failed to update hero slide.' });
  }
});

// PATCH /api/admin/hero-slides/:id/toggle
router.patch('/hero-slides/:id/toggle', async (req, res) => {
  try {
    const slideId = req.params.id;
    const [rows] = await db.query('SELECT is_active FROM hero_slides WHERE id = ?', [slideId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Slide not found.' });

    const newStatus = rows[0].is_active ? 0 : 1;
    await db.query('UPDATE hero_slides SET is_active = ? WHERE id = ?', [newStatus, slideId]);

    if (cache && typeof cache.invalidateGroup === 'function') cache.invalidateGroup('public');

    return res.json({ success: true, is_active: newStatus, message: `Slide ${newStatus ? 'activated' : 'deactivated'} successfully.` });
  } catch (err) {
    console.error('[Admin Hero Slides TOGGLE]', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle slide status.' });
  }
});

// DELETE /api/admin/hero-slides/:id
router.delete('/hero-slides/:id', async (req, res) => {
  try {
    const slideId = req.params.id;
    await db.query('DELETE FROM hero_slides WHERE id = ?', [slideId]);

    cache.invalidateAll();

    return res.json({ success: true, message: 'Hero slide deleted successfully.' });
  } catch (err) {
    console.error('[Admin Hero Slides DELETE]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete hero slide.' });
  }
});

// =========================================================================
// WEBSITE PAGES MANAGEMENT CRUD ENDPOINTS
// =========================================================================

// GET /api/admin/pages
router.get('/pages', async (req, res) => {
  try {
    const [pages] = await db.query(`
      SELECT p.*, 
             m.title_en as menu_title_en,
             m.row_num as menu_row_num,
             m.col_side as menu_col_side,
             m.is_active as menu_is_active
      FROM pages p
      LEFT JOIN header_menus m ON p.menu_id = m.id
      ORDER BY p.sort_order ASC, p.id ASC
    `);
    return res.json({ success: true, data: pages });
  } catch (err) {
    console.error('[Admin Pages GET]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch pages.' });
  }
});

// POST /api/admin/pages
router.post('/pages', async (req, res) => {
  try {
    const {
      title_en, title_ur, slug, page_type, target_url,
      meta_description_en, meta_description_ur,
      content_en, content_ur, banner_image_url,
      is_published, menu_id, sort_order
    } = req.body;

    if (!title_en || !title_en.trim()) {
      return res.status(400).json({ success: false, message: 'Page title (English) is required.' });
    }

    const cleanSlug = (slug || title_en).trim().toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!cleanSlug) {
      return res.status(400).json({ success: false, message: 'Valid page slug is required.' });
    }

    const [existing] = await db.query('SELECT id FROM pages WHERE slug = ?', [cleanSlug]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'A page with this slug already exists.' });
    }

    const pType = page_type === 'core' ? 'core' : 'custom';
    const pUrl = target_url && target_url.trim() ? target_url.trim() : (pType === 'core' ? `/${cleanSlug}` : `/page/${cleanSlug}`);
    const pubFlag = is_published === undefined || is_published === null ? 1 : (is_published ? 1 : 0);
    const menuIdVal = menu_id ? parseInt(menu_id, 10) : null;
    const orderVal = parseInt(sort_order, 10) || 0;

    const [result] = await db.query(`
      INSERT INTO pages 
      (title_en, title_ur, slug, page_type, target_url, meta_description_en, meta_description_ur, content_en, content_ur, banner_image_url, is_published, menu_id, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title_en.trim(), title_ur?.trim() || null, cleanSlug, pType, pUrl,
      meta_description_en?.trim() || null, meta_description_ur?.trim() || null,
      content_en || null, content_ur || null, banner_image_url?.trim() || null,
      pubFlag, menuIdVal, orderVal
    ]);

    const newPageId = result.insertId;

    if (menuIdVal) {
      await db.query(`
        INSERT INTO header_menu_items (menu_id, title_en, title_ur, page_url, open_new_tab, is_active, sort_order)
        VALUES (?, ?, ?, ?, 0, ?, ?)
      `, [menuIdVal, title_en.trim(), title_ur?.trim() || null, pUrl, pubFlag, orderVal]);
    }

    cache.invalidateAll();

    return res.json({
      success: true,
      pageId: newPageId,
      message: 'Page created successfully.'
    });
  } catch (err) {
    console.error('[Admin Pages POST]', err);
    return res.status(500).json({ success: false, message: 'Failed to create page.' });
  }
});

// PUT /api/admin/pages/:id
router.put('/pages/:id', async (req, res) => {
  try {
    const pageId = req.params.id;
    const [existingPage] = await db.query('SELECT * FROM pages WHERE id = ?', [pageId]);
    if (!existingPage.length) return res.status(404).json({ success: false, message: 'Page not found.' });

    const oldPage = existingPage[0];
    const {
      title_en, title_ur, slug, page_type, target_url,
      meta_description_en, meta_description_ur,
      content_en, content_ur, banner_image_url,
      is_published, menu_id, sort_order
    } = req.body;

    if (!title_en || !title_en.trim()) {
      return res.status(400).json({ success: false, message: 'Page title (English) is required.' });
    }

    const cleanSlug = (slug || oldPage.slug).trim().toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (cleanSlug !== oldPage.slug) {
      const [conflict] = await db.query('SELECT id FROM pages WHERE slug = ? AND id != ?', [cleanSlug, pageId]);
      if (conflict.length > 0) {
        return res.status(400).json({ success: false, message: 'A page with this slug already exists.' });
      }
    }

    const pType = oldPage.page_type === 'core' ? 'core' : (page_type || 'custom');
    const pUrl = target_url && target_url.trim() ? target_url.trim() : oldPage.target_url;
    const pubFlag = is_published === undefined || is_published === null ? oldPage.is_published : (is_published ? 1 : 0);
    const menuIdVal = menu_id !== undefined && menu_id !== '' && menu_id !== null ? parseInt(menu_id, 10) : null;
    const orderVal = parseInt(sort_order, 10) || 0;

    await db.query(`
      UPDATE pages SET
        title_en = ?, title_ur = ?, slug = ?, page_type = ?, target_url = ?,
        meta_description_en = ?, meta_description_ur = ?,
        content_en = ?, content_ur = ?, banner_image_url = ?,
        is_published = ?, menu_id = ?, sort_order = ?
      WHERE id = ?
    `, [
      title_en.trim(), title_ur?.trim() || null, cleanSlug, pType, pUrl,
      meta_description_en?.trim() || null, meta_description_ur?.trim() || null,
      content_en || null, content_ur || null, banner_image_url?.trim() || null,
      pubFlag, menuIdVal, orderVal, pageId
    ]);

    // Synchronize header menu items
    if (menuIdVal) {
      const [existingItems] = await db.query('SELECT id FROM header_menu_items WHERE page_url = ?', [oldPage.target_url]);
      if (existingItems.length > 0) {
        await db.query(`
          UPDATE header_menu_items SET
            menu_id = ?, title_en = ?, title_ur = ?, page_url = ?, is_active = ?, sort_order = ?
          WHERE id = ?
        `, [menuIdVal, title_en.trim(), title_ur?.trim() || null, pUrl, pubFlag, orderVal, existingItems[0].id]);
      } else {
        await db.query(`
          INSERT INTO header_menu_items (menu_id, title_en, title_ur, page_url, open_new_tab, is_active, sort_order)
          VALUES (?, ?, ?, ?, 0, ?, ?)
        `, [menuIdVal, title_en.trim(), title_ur?.trim() || null, pUrl, pubFlag, orderVal]);
      }
    } else {
      await db.query('UPDATE header_menu_items SET is_active = 0 WHERE page_url = ?', [oldPage.target_url]);
    }

    cache.invalidateAll();

    return res.json({ success: true, message: 'Page updated successfully.' });
  } catch (err) {
    console.error('[Admin Pages PUT]', err);
    return res.status(500).json({ success: false, message: 'Failed to update page.' });
  }
});

// PATCH /api/admin/pages/:id/toggle
router.patch('/pages/:id/toggle', async (req, res) => {
  try {
    const pageId = req.params.id;
    const [rows] = await db.query('SELECT target_url, is_published FROM pages WHERE id = ?', [pageId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Page not found.' });

    const newStatus = rows[0].is_published ? 0 : 1;
    await db.query('UPDATE pages SET is_published = ? WHERE id = ?', [newStatus, pageId]);

    // Sync header_menu_items
    await db.query('UPDATE header_menu_items SET is_active = ? WHERE page_url = ?', [newStatus, rows[0].target_url]);

    cache.invalidateAll();

    return res.json({ success: true, is_published: newStatus, message: `Page ${newStatus ? 'published' : 'unpublished'} successfully.` });
  } catch (err) {
    console.error('[Admin Pages TOGGLE]', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle page status.' });
  }
});

// DELETE /api/admin/pages/:id
router.delete('/pages/:id', async (req, res) => {
  try {
    const pageId = req.params.id;
    const [rows] = await db.query('SELECT page_type, target_url FROM pages WHERE id = ?', [pageId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Page not found.' });

    if (rows[0].page_type === 'core') {
      return res.status(400).json({ success: false, message: 'Core system pages cannot be deleted. You can unpublish them instead.' });
    }

    await db.query('DELETE FROM header_menu_items WHERE page_url = ?', [rows[0].target_url]);
    await db.query('DELETE FROM pages WHERE id = ?', [pageId]);

    cache.invalidateAll();

    return res.json({ success: true, message: 'Page deleted successfully.' });
  } catch (err) {
    console.error('[Admin Pages DELETE]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete page.' });
  }
});

module.exports = router;


