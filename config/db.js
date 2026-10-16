require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'qasreshabbir',
  waitForConnections: true,
  connectionLimit: 20,
  maxIdle: 10,
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL database: ${process.env.DB_NAME || 'qasreshabbir'}`);
    connection.release();
    return true;
  } catch (err) {
    console.error('[Database] Connection failed:', err.message);
    return false;
  }
}

module.exports = {
  pool,
  query: (sql, params) => pool.query(sql, params),
  execute: (sql, params) => pool.execute(sql, params),
  testConnection
};
