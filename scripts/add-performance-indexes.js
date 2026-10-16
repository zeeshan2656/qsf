require('dotenv').config();
const { pool } = require('../config/db');

async function addIndexIfNotExists(connection, table, indexName, columnsSql) {
  const [rows] = await connection.query(
    `SELECT INDEX_NAME FROM information_schema.statistics 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  if (rows.length === 0) {
    console.log(`[Index] Creating index ${indexName} on ${table}(${columnsSql})...`);
    await connection.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columnsSql})`);
    console.log(`[Index] ✓ Index ${indexName} created.`);
  } else {
    console.log(`[Index] Index ${indexName} already exists on ${table}.`);
  }
}

async function run() {
  const conn = await pool.getConnection();
  try {
    console.log('[DB Optimization] Adding high-performance compound indexes...');

    // Projects indexes
    await addIndexIfNotExists(conn, 'projects', 'idx_projects_status_featured_sort', '`status`, `is_featured`, `sort_order`, `id`');
    await addIndexIfNotExists(conn, 'projects', 'idx_projects_category_status_sort', '`category_id`, `status`, `sort_order`');
    await addIndexIfNotExists(conn, 'projects', 'idx_projects_slug_status', '`slug`, `status`');

    // Articles indexes
    await addIndexIfNotExists(conn, 'articles', 'idx_articles_status_published', '`status`, `published_at` DESC, `id` DESC');
    await addIndexIfNotExists(conn, 'articles', 'idx_articles_slug_status', '`slug`, `status`');
    await addIndexIfNotExists(conn, 'articles', 'idx_articles_category_status', '`category_id`, `status`');

    // Categories indexes
    await addIndexIfNotExists(conn, 'categories', 'idx_categories_active_sort', '`is_active`, `sort_order`');

    // Donations indexes
    await addIndexIfNotExists(conn, 'donations', 'idx_donations_status_created', '`status`, `created_at` DESC');
    await addIndexIfNotExists(conn, 'donations', 'idx_donations_project_status', '`project_id`, `status`');

    // Impact stats
    await addIndexIfNotExists(conn, 'impact_stats', 'idx_impact_stats_active_sort', '`is_active`, `sort_order`');

    // Audit logs if table exists
    const [tables] = await conn.query("SHOW TABLES LIKE 'audit_logs'");
    if (tables.length > 0) {
      await addIndexIfNotExists(conn, 'audit_logs', 'idx_audit_logs_created', '`created_at` DESC');
    }

    console.log('[DB Optimization] All performance indexes verified and applied.');
  } catch (err) {
    console.error('[DB Optimization Error]', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();
