const pool = require('../config/db');

async function check() {
  const [cats] = await pool.query('SELECT id, name_en, name_ur, slug FROM categories ORDER BY id ASC');
  console.log(`Total Categories: ${cats.length}`);
  console.table(cats);

  const [schema] = await pool.query('DESCRIBE projects');
  console.log('Projects Schema:');
  console.table(schema.map(s => ({ Field: s.Field, Type: s.Type, Null: s.Null })));

  const [projs] = await pool.query('SELECT * FROM projects');
  console.log(`Total Projects: ${projs.length}`);
  console.table(projs.map(p => ({
    id: p.id,
    category_id: p.category_id,
    title_en: p.title_en,
    status: p.status,
    goal_amount: p.goal_amount,
    raised_amount: p.raised_amount
  })));

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
