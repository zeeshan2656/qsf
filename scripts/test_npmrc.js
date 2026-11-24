const cp = require('child_process');
const fs = require('fs');

fs.writeFileSync('.npmrc.test', 'onnxruntime-node-install=skip\nonnxruntime-node-install-cuda=skip\n');
try {
  const res = cp.spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['--userconfig=.npmrc.test', 'run', '-s', 'env'],
    { encoding: 'utf8', shell: true }
  );
  const lines = (res.stdout || '').split('\n').filter(l => l.toLowerCase().includes('onnxruntime'));
  console.log('Stdout matching onnxruntime:', lines);
  console.log('Stderr:', res.stderr);
} finally {
  fs.unlinkSync('.npmrc.test');
}
