const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

function loadEnvFiles() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../../../.env'),
    '/home/u434697879/domains/freehub.live/.env',
    '/home/u434697879/.env'
  ];

  const seen = new Set();
  for (const envPath of candidates) {
    if (seen.has(envPath)) continue;
    seen.add(envPath);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, quiet: true });
    }
  }
}

loadEnvFiles();

function parseDatabaseUrl(rawUrl) {
  if (!rawUrl) return {};
  try {
    const parsed = new URL(rawUrl);
    return {
      host: parsed.hostname || undefined,
      port: parsed.port ? parseInt(parsed.port, 10) : undefined,
      user: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : undefined
    };
  } catch (e) {
    return {};
  }
}

const urlCfg = parseDatabaseUrl(process.env.DATABASE_URL);
const dbConfig = {
  host: process.env.DB_HOST || urlCfg.host || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || urlCfg.port || 3306,
  user: process.env.DB_USER || urlCfg.user || 'root',
  password: process.env.DB_PASS ?? process.env.DB_PASSWORD ?? urlCfg.password ?? '',
  database: process.env.DB_NAME || urlCfg.database || 'qasreshabbir'
};

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 20,
  maxIdle: 10,
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  queueLimit: 0,
  charset: 'utf8mb4'
});

const DB_CONNECTION_ERROR_CODES = new Set([
  'ER_ACCESS_DENIED_ERROR',
  'ER_DBACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'ER_NOT_SUPPORTED_AUTH_MODE',
  'ECONNREFUSED',
  'ECONNRESET',
  'PROTOCOL_CONNECTION_LOST',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN'
]);

function classifyDbError(err) {
  const code = err && err.code ? String(err.code) : '';
  return {
    code,
    isMissingTable: code === 'ER_NO_SUCH_TABLE',
    isDbError: DB_CONNECTION_ERROR_CODES.has(code)
  };
}

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Database] Connected successfully to MySQL database: ${dbConfig.database}`);
    connection.release();
    return true;
  } catch (err) {
    console.error(`[Database] Connection failed (${err.code || 'ERROR'}):`, err.message);
    return false;
  }
}

module.exports = {
  pool,
  query: (sql, params) => pool.query(sql, params),
  execute: (sql, params) => pool.execute(sql, params),
  testConnection,
  classifyDbError
};
