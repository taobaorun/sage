import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillRoot = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
let output, title = '力与运动';
for (let i = 0; i < args.length; i += 2) {
  if (!args[i + 1] || !['--out', '--title'].includes(args[i])) throw new Error('Usage: node create-book.mjs --out NEW_DIRECTORY [--title TITLE]');
  if (args[i] === '--out') output = path.resolve(args[i + 1]);
  else title = args[i + 1];
}
if (!output) throw new Error('--out must name a new directory; existing directories are never overwritten.');
await mkdir(path.dirname(output), { recursive: true });
await mkdir(output); // EEXIST is intentional, including an existing empty directory.
const template = path.join(skillRoot, 'assets/three-book-starter');
for (const entry of await readdir(template)) {
  await cp(path.join(template, entry), path.join(output, entry), { recursive: true, force: false, errorOnExist: true });
}
await cp(path.join(skillRoot, 'assets/book-core/page-turn.mjs'), path.join(output, 'src/page-turn.mjs'));
await writeFile(path.join(output, 'src/book-title.json'), JSON.stringify({ title }, null, 2) + '\n');
const escape = value => value.replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const index = await readFile(path.join(output, 'index.html'), 'utf8');
await writeFile(path.join(output, 'index.html'), index.replace(/<title>.*?<\/title>/, `<title>${escape(title)} · 立体交互书</title>`));
console.log(`Created ${output}\nNext: install the pinned dependencies, then npm run dev.\nThis is a local starter; no deployment or sharing changes were made.`);
