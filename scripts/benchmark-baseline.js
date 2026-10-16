const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOST = '127.0.0.1';

function fetchTiming(urlPath) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();
    const req = http.get({
      host: HOST,
      port: PORT,
      path: urlPath,
      headers: { 'Accept-Encoding': 'gzip, deflate' }
    }, (res) => {
      let size = 0;
      res.on('data', chunk => size += chunk.length);
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;
        resolve({
          path: urlPath,
          statusCode: res.statusCode,
          sizeBytes: size,
          durationMs: parseFloat(durationMs.toFixed(2)),
          encoding: res.headers['content-encoding'] || 'none',
          contentType: res.headers['content-type']
        });
      });
    });
    req.on('error', reject);
  });
}

async function runBenchmark(name) {
  console.log(`\n================== ${name} ==================`);
  const endpoints = [
    '/',
    '/api/public/bootstrap',
    '/projects',
    '/about',
    '/css/style.css',
    '/css/admin.css',
    '/js/admin.js',
    '/js/main.js',
    '/media/branding/logo.svg'
  ];

  const results = [];
  // Warmup
  for (const ep of endpoints) {
    try { await fetchTiming(ep); } catch (e) {}
  }

  // 3-iteration average
  for (const ep of endpoints) {
    try {
      const runs = [];
      for (let i = 0; i < 3; i++) {
        runs.push(await fetchTiming(ep));
      }
      const avgDuration = parseFloat((runs.reduce((acc, r) => acc + r.durationMs, 0) / runs.length).toFixed(2));
      results.push({
        path: ep,
        statusCode: runs[0].statusCode,
        sizeBytes: runs[0].sizeBytes,
        avgMs: avgDuration,
        encoding: runs[0].encoding
      });
      console.log(`[${runs[0].statusCode}] ${ep.padEnd(28)} -> ${avgDuration.toString().padStart(6)} ms | ${(runs[0].sizeBytes / 1024).toFixed(1).padStart(6)} KB | ${runs[0].encoding}`);
    } catch (e) {
      console.error(`Error benchmarking ${ep}:`, e.message);
    }
  }

  return results;
}

if (require.main === module) {
  runBenchmark('BASELINE MEASUREMENT');
}

module.exports = { runBenchmark, fetchTiming };
