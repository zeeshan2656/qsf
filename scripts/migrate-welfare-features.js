const db = require('../config/db');

async function migrate() {
  console.log('--- Migrating Database for Welfare Projects & Accounts Enhancements ---');

  // 1. Alter projects.status to VARCHAR(50) to support 'active', 'completed', 'closed', 'draft'
  try {
    await db.query(`
      ALTER TABLE projects 
      MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'active'
    `);
    console.log('✓ projects.status modified to VARCHAR(50) DEFAULT "active"');
  } catch (err) {
    console.warn('projects.status alter notice:', err.message);
  }

  // Update existing 'published' status to 'active' for consistency
  try {
    const [res] = await db.query(`UPDATE projects SET status = 'active' WHERE status = 'published'`);
    console.log(`✓ Updated ${res.affectedRows} project(s) with status 'published' to 'active'`);
  } catch (err) {
    console.warn('Status update notice:', err.message);
  }

  // 2. Add start_date, end_date, expected_completion_date, notes, completed_at, closed_at to projects
  const columnsToAdd = [
    { name: 'start_date', type: 'DATE NULL' },
    { name: 'end_date', type: 'DATE NULL' },
    { name: 'expected_completion_date', type: 'DATE NULL' },
    { name: 'notes', type: 'TEXT NULL' },
    { name: 'completed_at', type: 'TIMESTAMP NULL' },
    { name: 'closed_at', type: 'TIMESTAMP NULL' }
  ];

  for (const col of columnsToAdd) {
    try {
      await db.query(`ALTER TABLE projects ADD COLUMN ${col.name} ${col.type}`);
      console.log(`✓ Added column projects.${col.name}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`- Column projects.${col.name} already exists.`);
      } else {
        console.warn(`Column add warning (${col.name}):`, err.message);
      }
    }
  }

  // Populate default timeline dates for existing projects if null
  try {
    await db.query(`
      UPDATE projects 
      SET start_date = COALESCE(start_date, '2026-01-01'),
          expected_completion_date = COALESCE(expected_completion_date, '2026-12-31'),
          notes = COALESCE(notes, 'Official community welfare initiative overseen by Qasr-e-Shabbir Foundation.')
      WHERE start_date IS NULL
    `);
    console.log('✓ Populated timeline defaults for existing projects');
  } catch (err) {
    console.warn('Default population warning:', err.message);
  }

  // 3. Add helpful indexes to donations if not already present
  try {
    await db.query(`CREATE INDEX idx_donations_project_id ON donations(project_id)`);
    console.log('✓ Created index idx_donations_project_id');
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME') {
      console.log('- Index idx_donations_project_id already exists.');
    }
  }

  try {
    await db.query(`CREATE INDEX idx_donations_status ON donations(status)`);
    console.log('✓ Created index idx_donations_status');
  } catch (err) {
    if (err.code === 'ER_DUP_KEYNAME') {
      console.log('- Index idx_donations_status already exists.');
    }
  }

  console.log('--- Database Migration Completed Successfully ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
