/**
 * Isolated Child-Process Worker for Background Removal
 * Runs @imgly/background-removal-node in its own Node.js process so its bundled
 * sharp/libvips native binaries never conflict with the main server's sharp/libvips.
 *
 * Usage: node services/cutoutWorker.js <inputAbsPath> <outputAbsPath>
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function run() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error('Usage: node cutoutWorker.js <inputPath> <outputPath>');
    process.exit(2);
  }
  if (!fs.existsSync(inputPath)) {
    console.error('Input file does not exist:', inputPath);
    process.exit(3);
  }

  const { removeBackground } = require('@imgly/background-removal-node');
  const fileUrl = pathToFileURL(path.resolve(inputPath)).href;
  const blob = await removeBackground(fileUrl);
  const buffer = Buffer.from(await blob.arrayBuffer());

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  console.log(JSON.stringify({ success: true, bytes: buffer.length }));
}

run().catch(err => {
  console.error('[cutoutWorker Error]', err && err.message ? err.message : err);
  process.exit(1);
});
