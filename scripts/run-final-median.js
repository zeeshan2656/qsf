const { execSync } = require('child_process');
const fs = require('fs');

const url = 'http://localhost:3000';
const runs = [1, 2, 3];
const results = [];

console.log('=======================================================');
console.log('RUNNING 3 CONSECUTIVE LIGHTHOUSE AUDITS FOR MEDIAN EVALUATION');
console.log('=======================================================');

for (const run of runs) {
  const outPath = `./final_run_${run}.json`;
  console.log(`\n--- Launching Run ${run}/3 ---`);
  const cmd = `npx.cmd lighthouse ${url} --form-factor=mobile --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" --output=json --output-path=${outPath} --quiet`;
  try {
    execSync(cmd, { stdio: 'inherit' });
    const data = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    const perf = Math.round(data.categories.performance.score * 100);
    const a11y = Math.round(data.categories.accessibility.score * 100);
    const bp = Math.round(data.categories['best-practices'].score * 100);
    const seo = Math.round(data.categories.seo.score * 100);
    const fcp = data.audits['first-contentful-paint'].numericValue;
    const lcp = data.audits['largest-contentful-paint'].numericValue;
    const si = data.audits['speed-index'].numericValue;
    const tbt = data.audits['total-blocking-time'].numericValue;
    const cls = data.audits['cumulative-layout-shift'].numericValue;

    console.log(`Run ${run} Scores: Performance: ${perf} | Accessibility: ${a11y} | Best Practices: ${bp} | SEO: ${seo}`);
    console.log(`Run ${run} Metrics: FCP: ${(fcp/1000).toFixed(2)}s | LCP: ${(lcp/1000).toFixed(2)}s | SI: ${(si/1000).toFixed(2)}s | TBT: ${Math.round(tbt)}ms | CLS: ${cls.toFixed(4)}`);

    results.push({ perf, a11y, bp, seo, fcp, lcp, si, tbt, cls });
  } catch (err) {
    console.error(`Error in run ${run}:`, err.message);
  }
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

if (results.length > 0) {
  const medPerf = median(results.map(r => r.perf));
  const medA11y = median(results.map(r => r.a11y));
  const medBp = median(results.map(r => r.bp));
  const medSeo = median(results.map(r => r.seo));
  const medFcp = median(results.map(r => r.fcp));
  const medLcp = median(results.map(r => r.lcp));
  const medSi = median(results.map(r => r.si));
  const medTbt = median(results.map(r => r.tbt));
  const medCls = median(results.map(r => r.cls));

  console.log('\n=======================================================');
  console.log('FINAL MEDIAN RESULTS (Mobile, Lighthouse 13.5)');
  console.log('=======================================================');
  console.log(`Performance:    ${medPerf} / 100`);
  console.log(`Accessibility:  ${medA11y} / 100`);
  console.log(`Best Practices: ${medBp} / 100`);
  console.log(`SEO:            ${medSeo} / 100`);
  console.log('-------------------------------------------------------');
  console.log(`First Contentful Paint:  ${(medFcp / 1000).toFixed(2)} s`);
  console.log(`Largest Contentful Paint: ${(medLcp / 1000).toFixed(2)} s`);
  console.log(`Speed Index:             ${(medSi / 1000).toFixed(2)} s`);
  console.log(`Total Blocking Time:     ${Math.round(medTbt)} ms`);
  console.log(`Cumulative Layout Shift: ${medCls.toFixed(4)}`);
  console.log('=======================================================');

  fs.writeFileSync('./final_median.json', JSON.stringify({
    scores: { performance: medPerf, accessibility: medA11y, bestPractices: medBp, seo: medSeo },
    metrics: { fcp: medFcp, lcp: medLcp, si: medSi, tbt: medTbt, cls: medCls },
    allRuns: results
  }, null, 2));
}
