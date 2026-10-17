const { exec } = require('child_process');
const fs = require('fs');

const url = process.argv[2] || 'https://freehub.live';
const outPath = process.argv[3] || './before.json';

console.log(`Starting Lighthouse on ${url}...`);

const cmd = `npx.cmd lighthouse ${url} --form-factor=mobile --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" --output=json --output-path=${outPath} --quiet`;

const p = exec(cmd, (err, stdout, stderr) => {
  if (err) {
    console.error('Lighthouse error:', err.message);
  }
  if (fs.existsSync(outPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      if (data.runtimeError) {
        console.error('Runtime error in report:', data.runtimeError);
      } else {
        console.log('--- Scores ---');
        for (const [k, v] of Object.entries(data.categories)) {
          console.log(`  ${k}: ${Math.round(v.score * 100)}`);
        }
        console.log('--- Metrics ---');
        const metrics = ['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift'];
        for (const m of metrics) {
          if (data.audits[m]) {
            console.log(`  ${m}: ${data.audits[m].displayValue} (${data.audits[m].score})`);
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse json:', e.message);
    }
  }
});

p.stdout.pipe(process.stdout);
p.stderr.pipe(process.stderr);
