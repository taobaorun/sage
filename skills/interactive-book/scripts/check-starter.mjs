import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const create = fileURLToPath(new URL('./create-book.mjs', import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), 'interactive-book-scaffold-check-'));
try {
  const destination = path.join(temporary, 'book'), title = '小书 & "练习" <一>';
  const run = () => spawnSync(process.execPath, [create, '--out', destination, '--title', title], { encoding: 'utf8', timeout: 10000 });
  const result = run(); assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(await readFile(path.join(destination, 'src/book-title.json'), 'utf8')).title, title);
  const index = await readFile(path.join(destination, 'index.html'), 'utf8');
  assert.ok(index.includes('小书 &amp; &quot;练习&quot; &lt;一&gt;'));
  const manifest = JSON.parse(await readFile(path.join(destination, 'package.json'), 'utf8'));
  assert.equal(manifest.dependencies.three, '0.180.0');
  for (const relative of ['src/book-viewer.js', 'src/demo-models.js', 'src/felt-mat.js', 'src/main.js', 'src/page-turn.mjs', 'scripts/export-standalone.mjs']) {
    const target = path.join(destination, relative);
    assert.ok((await readFile(target, 'utf8')).length > 0);
    const checked = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8', timeout: 10000 });
    assert.equal(checked.status, 0, checked.stderr);
  }
  const repeated = run(); assert.notEqual(repeated.status, 0, 'An existing output directory must be refused');
  assert.equal(await readFile(path.join(destination, 'index.html'), 'utf8'), index, 'Refused invocation must not overwrite the project');
  console.log('Starter scaffold passed: runnable source files, escaped title, syntax, and no-overwrite behavior. Browser quality is a separate check.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
