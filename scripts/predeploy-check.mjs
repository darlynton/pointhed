import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function assertFile(path, label) {
  if (!existsSync(path)) fail(`${label} missing: ${path}`);
}

function assertNoTodo(path) {
  const content = readFileSync(path, 'utf8');
  if (/TODO/.test(content)) {
    fail(`Found TODO marker in ${path}`);
  }
}

console.log('🔎 Running predeploy checks...');

assertFile(join(root, 'index.html'), 'Frontend entry');
assertFile(join(root, 'backend/.env.example'), 'Backend env example');
assertFile(join(root, 'backend/src/config/env.js'), 'Backend env validator');

assertNoTodo(join(root, 'backend/src/routes/tenant.routes.js'));
assertNoTodo(join(root, 'backend/src/routes/analytics.routes.js'));

console.log('🏗️ Building frontend...');
const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
if (build.status !== 0) fail('Frontend build failed');

console.log('✅ Predeploy checks passed');
