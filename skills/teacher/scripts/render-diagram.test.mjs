import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { renderTeacherDiagram } from './render-diagram.mjs';

const flow = `flowchart LR
  accTitle: 缓存查询的两条路径
  accDescr: 先检查已有副本，有则返回，没有才读取数据。
  start[查询编号为42的书籍] --> cached{缓存里有副本吗}
  cached -->|有| hit[返回已有副本]
  cached -->|没有| load[读取原始数据]`;
const box = (svg) =>
  svg
    .match(/viewBox="([^"]+)"/)[1]
    .split(' ')
    .map(Number);
const ids = (svg) =>
  [...svg.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);

test('real Pele lays out one Chinese graph at desktop and narrow widths', () => {
  const wide = renderTeacherDiagram(flow, {
    width: 740,
    idPrefix: 'lesson-flow-wide',
  });
  const narrow = renderTeacherDiagram(flow, {
    width: 320,
    idPrefix: 'lesson-flow-narrow',
  });
  assert.ok(
    box(narrow)[3] > box(wide)[3],
    'The narrow graph should reflow vertically',
  );
  assert.ok(box(narrow)[2] <= 320);
  for (const id of ['start', 'cached', 'hit', 'load']) {
    assert.ok(wide.includes(`data-id="${id}"`));
    assert.ok(narrow.includes(`data-id="${id}"`));
  }
  assert.ok(wide.includes('data-teacher-renderer="pele"'));
  assert.ok(wide.includes('data-pele-version="1.9.0"'));
  assert.ok(wide.includes('aria-labelledby="lesson-flow-wide-title"'));
});

test('separate mounts retain semantic node IDs without sharing document IDs', () => {
  const a = renderTeacherDiagram(flow, { idPrefix: 'reader-figure' });
  const b = renderTeacherDiagram(flow, { idPrefix: 'comparison-figure' });
  const documentIds = [...ids(a), ...ids(b)];
  assert.ok(
    documentIds.length >= 4,
    'Titles and descriptions must have scoped IDs',
  );
  assert.equal(new Set(documentIds).size, documentIds.length);
  assert.ok(a.includes('data-id="cached"') && b.includes('data-id="cached"'));
});

test('hierarchical and parallel state diagrams render with guards intact', () => {
  const source = `stateDiagram-v2
    accTitle: 阅读会话和本机保存
    accDescr: 阅读状态与保存状态分别变化，保存失败不阻止继续阅读。
    state "同一会话" as all {
      state "阅读" as reading {
        [*] --> opened
        opened: 正在阅读
        source: 对照源码
        opened --> source: 打开源码
        source --> opened: 返回阅读
      }
      --
      state "本机保存" as saving {
        [*] --> available
        available: 可以保存
        unavailable: 本机保存不可用
        available --> unavailable: 保存被拒绝
        unavailable --> available: 再试一次 [浏览器允许]
      }
    }`;
  const svg = renderTeacherDiagram(source, {
    width: 740,
    idPrefix: 'reader-states',
  });
  assert.ok(svg.includes('pele-state'));
  assert.ok(svg.includes('浏览器允许'));
  assert.ok(svg.includes('正在阅读'));
  assert.ok(svg.includes('本机保存不可用'));
});

test('sequence diagrams retain independent branches and return messages', () => {
  const source = `sequenceDiagram
    accTitle: 显示步骤与保存位置
    accDescr: 显示当前步骤和保存位置可以分别完成。
    participant R as 读者
    participant C as 课程
    participant S as 本机保存
    R->>C: 打开下一步
    par 阅读路径
      C-->>R: 显示当前步骤
    and 保存路径
      C->>S: 保存阅读位置
    end`;
  const svg = renderTeacherDiagram(source, { idPrefix: 'reader-sequence' });
  assert.ok(svg.includes('pele-sequence'));
  assert.ok(svg.includes('阅读路径') && svg.includes('保存路径'));
});

test('state arrow identities retain nested endpoints, parallel labels and self loops for playback', () => {
  const svg = renderTeacherDiagram(
    `stateDiagram-v2
    state "父层" as p {
      a --> b: 完成 [A & B]
    }
    [*] --> a
    a --> b: 再试一次
    b --> b: 保持不变`,
    { idPrefix: 'motion-edges' },
  );
  const tags = [...svg.matchAll(/<g\b[^>]*data-from="[^"]+"[^>]*>/g)].map(
    (m) => m[0],
  );
  assert.equal(tags.length, 4);
  assert(
    tags.some(
      (t) =>
        t.includes('data-id="edge0"') &&
        t.includes('data-from="a" data-to="b"') &&
        t.includes('A &amp; B'),
    ),
  );
  assert(
    tags.some(
      (t) => t.includes('data-from="a" data-to="b"') && t.includes('再试一次'),
    ),
  );
  assert(tags.some((t) => t.includes('data-from="b" data-to="b"')));
});

test('embedded diagrams disable external navigation and reject unsafe adapter options', () => {
  const svg = renderTeacherDiagram(
    flow + '\n  click start "https://example.com/"',
    { idPrefix: 'no-network' },
  );
  assert.doesNotMatch(svg, /<a\b|<image\b|<script\b|\sonload=/i);
  assert.throws(
    () => renderTeacherDiagram(flow, { idPrefix: 'x" onload="bad' }),
    TypeError,
  );
  assert.throws(
    () => renderTeacherDiagram(flow, { idPrefix: 'bad-width', width: NaN }),
    RangeError,
  );
});

test('reader palettes retain contrast for reading, controls, code and feedback', async () => {
  const config = JSON.parse(
    await readFile(
      new URL('../assets/reader-themes.json', import.meta.url),
      'utf8',
    ),
  );
  const luminance = (hex) => {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return rgb.reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
  };
  for (const [name, { tokens }] of Object.entries(config.themes)) {
    for (const [foreground, background] of [
      ['ink', 'canvas'],
      ['muted', 'canvas'],
      ['muted', 'surface'],
      ['accent', 'accentSoft'],
      ['codeKeyword', 'surface'],
      ['codeString', 'surface'],
      ['codeNumber', 'surface'],
      ['good', 'goodSoft'],
      ['bad', 'badSoft'],
    ]) {
      const [a, b] = [
        luminance(tokens[foreground]),
        luminance(tokens[background]),
      ].sort((x, y) => x - y);
      assert.ok(
        (b + 0.05) / (a + 0.05) >= 4.5,
        `${name}: ${foreground} on ${background}`,
      );
    }
  }
});

test('CLI handles spaced paths and preserves output on a diagram error', async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), 'teacher-pele-cli-'));
  try {
    const input = path.join(scratch, '中文 lesson.mmd');
    const output = path.join(scratch, 'rendered lesson.svg');
    const cli = fileURLToPath(new URL('./render-diagram.mjs', import.meta.url));
    const run = () =>
      spawnSync(
        process.execPath,
        [
          cli,
          input,
          '--out',
          output,
          '--width',
          '320',
          '--id-prefix',
          'cli-lesson',
        ],
        { encoding: 'utf8', timeout: 10_000 },
      );
    await writeFile(input, flow);
    const good = run();
    assert.equal(good.status, 0, good.stderr);
    const previous = await readFile(output, 'utf8');
    assert.ok(previous.includes('data-teacher-renderer="pele"'));
    await writeFile(input, 'flowchart LR\n broken[unclosed');
    const bad = run();
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /Diagram rendering failed/);
    assert.equal(await readFile(output, 'utf8'), previous);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
