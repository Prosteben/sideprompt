const { spawnSync } = require('child_process');
const path = require('path');
for (const f of ['unit.js', 'e2e.js']) {
  console.log(`\n▶ ${f}`);
  const r = spawnSync(process.execPath, [path.join(__dirname, f), ...process.argv.slice(2)], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status || 1);
}
console.log('\nAll test suites passed.');
