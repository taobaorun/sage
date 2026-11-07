import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as callbackExec } from 'node:child_process';
import { promisify } from 'node:util';
import { Script } from 'node:vm';
import { createHash } from 'node:crypto';
import { buildReader } from './build-reader.mjs';
import { normalizeCourse, scopeSVG } from './reader-contract.mjs';
const exec = promisify(callbackExec);
const skill = fileURLToPath(new URL('../', import.meta.url));
const minimal = () => ({
  version: 1,
  id: 'plain-topic',
  title: '通用主题',
  sections: [
    { id: 'start', title: '一个问题', body: '<p>从具体例子开始。</p>' },
  ],
});
const embedded = (html) =>
  JSON.parse(
    html.match(
      /<script id="course-data" type="application\/json">([\s\S]*?)<\/script>/,
    )[1],
  );
async function temporary(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'teacher-build-test-'));
  try {
    return await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('plain lessons build deterministically without sources, model tools or fixed course names', async () => {
  const data = minimal(),
    html = await buildReader(data);
  assert.equal(html, await buildReader(data));
  const course = embedded(html);
  assert.equal(course.id, 'plain-topic');
  assert.deepEqual(course.sources, {});
  assert.deepEqual(course.graphs, {});
  assert(!html.includes('teacher-reader.tla-tlc.v1'));
  assert(!html.includes('/Users/'));
  assert(html.includes("connect-src 'none'"));
  new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
});

test('every accepted course slug remains separate from shared appearance storage', async () => {
  const keys = [];
  for (const slug of [
    'appearance',
    'course-appearance',
    'course',
    'plain-topic',
  ]) {
    const data = minimal();
    data.id = slug;
    const course = embedded(await buildReader(data));
    assert.notEqual(course.storageKey, 'teacher-reader.appearance.v1');
    keys.push(course.storageKey);
  }
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(keys.at(-1), 'teacher-reader.plain-topic.v1');
});

test('same-line jumps resolve in textual order and cannot silently overlap or run out', () => {
  const data = minimal();
  const target = { file: 'calls.js', start: 1, end: 1 };
  data.sources = {
    'calls.js': {
      text: 'first(); second();',
      links: [
        { line: 1, token: 'second', target },
        { line: 1, token: 'first', target },
      ],
    },
  };
  assert.deepEqual(
    normalizeCourse(data).sources['calls.js'].links.map((link) => link.token),
    ['first', 'second'],
  );
  data.sources['calls.js'].links = [
    { line: 1, token: 'first', target },
    { line: 1, token: 'first()', target },
  ];
  assert.throws(() => normalizeCourse(data), /overlapping or exhausted/);
  data.sources['calls.js'].links = [
    { line: 1, token: 'first', target },
    { line: 1, token: 'first', target },
  ];
  assert.throws(() => normalizeCourse(data), /overlapping or exhausted/);
  data.sources['calls.js'].text = 'first(); first();';
  assert.equal(normalizeCourse(data).sources['calls.js'].links.length, 2);
});

test('prepared SVG whitespace, entities and literal label examples remain correctly scoped', () => {
  const svg = `<svg aria-labelledby = "label"><title id = "label">A</title><defs><marker id = 'arrow'/></defs><path id = "shape" marker-end = "url( '#arrow' )"/><use href = "&#35;shape"/><text>id = "literal"</text><!-- id="comment" --></svg>`;
  const outputs = [
    'main-wide',
    'main-narrow',
    'compare-wide',
    'compare-narrow',
  ].map((prefix) => scopeSVG(svg, prefix));
  const ids = outputs
    .flatMap((value) => [...value.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
    .filter((value) => value !== 'comment');
  assert.equal(new Set(ids).size, ids.length);
  for (const [i, value] of outputs.entries()) {
    const prefix = [
      'main-wide',
      'main-narrow',
      'compare-wide',
      'compare-narrow',
    ][i];
    assert(value.includes(`aria-labelledby="${prefix}-label"`));
    assert(value.includes(`href="#${prefix}-shape"`));
    assert(value.includes(`url(#${prefix}-arrow)`));
    assert(value.includes('<text>id = "literal"</text>'));
  }
});
test('raw repository text cannot close the JSON script or execute markup', async () => {
  const data = minimal(),
    raw =
      '</script><script>globalThis.pwned = true</script>\n<button onclick="steal()">';
  data.sources = { 'untrusted.txt': { text: raw } };
  data.sections[0].source = { file: 'untrusted.txt', start: 1, end: 2 };
  const html = await buildReader(data);
  assert.equal(embedded(html).sources['untrusted.txt'].text, raw);
  assert(!html.includes('<script>globalThis.pwned'));
  assert.equal(embedded(html).sources['untrusted.txt'].sha256.length, 64);
});

test('CRLF and supplementary Unicode retain exact content hashes and line targets', async () => {
  const data = minimal();
  const raw =
    'const label = "🐦"; get(42);\r\nfunction get(id) {\r\n  return id;\r\n}\r\n';
  data.sources = {
    'unicode.js': {
      text: raw,
      links: [
        {
          line: 1,
          token: 'get',
          target: { file: 'unicode.js', start: 2, end: 4 },
        },
      ],
    },
  };
  data.sections[0].source = { file: 'unicode.js', start: 1, end: 4 };
  const source = embedded(await buildReader(data)).sources['unicode.js'];
  assert.equal(source.text, raw);
  assert.equal(source.sha256, createHash('sha256').update(raw).digest('hex'));
  assert.deepEqual(source.links[0].target, {
    file: 'unicode.js',
    start: 2,
    end: 4,
  });
});
test('bundled authoring example uses actual Pele and keeps snapshots, jumps and illustrative labels', async () => {
  const data = JSON.parse(
    await fs.readFile(
      new URL('../assets/example-course.json', import.meta.url),
      'utf8',
    ),
  );
  const output = embedded(await buildReader(data));
  assert.equal(output.sections.length, 2);
  assert.equal(output.graphs['cache-path'].basis, 'illustrative');
  assert.equal(output.sources['run.mjs'].links[0].target.file, 'cache.mjs');
  assert.equal(output.sources['cache.mjs'].symbols[0].label, 'get · 缓存读取');
  const ids = [];
  for (const mount of ['main', 'compare'])
    for (const view of ['wide', 'narrow']) {
      const svg = output.diagrams['cache-flow'][mount][view];
      assert.match(svg, /data-teacher-renderer="pele"/);
      const local = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      ids.push(...local);
      for (const m of svg.matchAll(
        /aria-(?:labelledby|describedby)="([^"]+)"/g,
      ))
        for (const id of m[1].split(' ')) assert(local.includes(id));
    }
  assert.equal(new Set(ids).size, ids.length);
});
test('invalid section, quiz, source and jump references fail at the authoring boundary', () => {
  const bad = [
    (d) => d.sections.push({ ...d.sections[0] }),
    (d) => (d.sections[0].id = 'constructor'),
    (d) => (d.sections[0].source = { file: 'missing', start: 1, end: 1 }),
    (d) => {
      d.sources = { a: { text: 'one' } };
      d.sections[0].source = { file: 'a', start: 1, end: 2 };
    },
    (d) =>
      (d.sections[0].quiz = [
        {
          id: 'q',
          prompt: '?',
          explanation: 'why',
          options: [
            { id: 'a', text: 'a' },
            { id: 'b', text: 'b' },
          ],
          answer: 'c',
        },
      ]),
    (d) => {
      d.sources = {
        a: {
          text: 'x',
          links: [
            {
              line: 1,
              token: 'absent',
              target: { file: 'a', start: 1, end: 1 },
            },
          ],
        },
      };
    },
    (d) => {
      d.sources = { a: { text: 'x', sha256: 'bad' } };
    },
  ];
  for (const mutate of bad) {
    const data = minimal();
    mutate(data);
    assert.throws(() => normalizeCourse(data), /Teacher course:/);
  }
});
test('reader rejects executable prose, external assets and malformed figure slots', () => {
  for (const body of [
    '<img src="https://example.com/x.png">',
    '<p onclick="x()">x</p>',
    '<script>x()</script>',
    '<a href="javascript:evil()">x</a>',
    '<a href="java&#x73;cript:evil()">x</a>',
    '<h2 id="repeat">x</h2>',
    '<button data-source="missing">x</button>',
  ]) {
    const data = minimal();
    data.sections[0].body = body;
    assert.throws(() => normalizeCourse(data), /Teacher course:/);
  }
  const data = minimal();
  data.diagrams = { f: {} };
  data.sections[0].body = '<span data-teacher-diagram="f"></span>';
  assert.throws(() => normalizeCourse(data), /empty div/);
});
test('paths require real declared edges and a counterexample cannot borrow a passing export result', () => {
  const make = () => ({
    ...minimal(),
    graphs: {
      g: {
        initialState: 'a',
        states: [
          { id: 'a', variables: {} },
          { id: 'b', variables: {} },
        ],
        edges: [{ id: 'e', from: 'a', to: 'b', action: 'go' }],
        traces: [
          { id: 't', type: 'example', states: ['a', 'b'], edges: ['e'] },
        ],
      },
    },
  });
  normalizeCourse(make());
  let data = make();
  data.graphs.g.traces[0].states = ['b', 'a'];
  assert.throws(() => normalizeCourse(data), /initial state/);
  data = make();
  data.graphs.g.traces[0].edges = ['unknown'];
  assert.throws(() => normalizeCourse(data), /legal edge/);
  data = make();
  data.graphs.g.edges.push({
    id: 'other',
    from: 'a',
    to: 'b',
    action: 'another',
  });
  delete data.graphs.g.traces[0].edges;
  assert.throws(() => normalizeCourse(data), /ambiguous/);
  data = make();
  data.graphs.g.traces[0].type = 'counterexample';
  assert.throws(() => normalizeCourse(data), /actual violating run/);
  data = make();
  data.sources = {
    'fixture.log': 'Synthetic unit-test fixture, not real TLC evidence.',
  };
  data.runs = {
    export: {
      outcome: 'holds',
      toolVersion: 'unit-test fixture',
      logSource: 'fixture.log',
    },
  };
  Object.assign(data.graphs.g, { basis: 'tlc', runId: 'export' });
  Object.assign(data.graphs.g.traces[0], {
    type: 'counterexample',
    runId: 'export',
    property: 'P',
  });
  assert.throws(() => normalizeCourse(data), /actual violating run/);
  data = make();
  data.graphs.g.traces[0].loopStart = 0;
  assert.throws(() => normalizeCourse(data), /loop must close/);
});
test('SVG isolation covers quoted ids, accessible labels and local paint references, and rejects active content', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" aria-labelledby="label"><title id=\'label\'>A</title><defs><marker id="arrow"/></defs><path marker-end="url(\'\x23arrow\')"/></svg>';
  const out = scopeSVG(svg, 'mount');
  assert.match(out, /aria-labelledby="mount-label"/);
  assert.match(out, /url\(#mount-arrow\)/);
  for (const unsafe of [
    '<svg><script>x()</script></svg>',
    '<svg><image href="https://example.com/x"/></svg>',
    '<svg><path style="fill:url(https://example.com/x)"/></svg>',
    '<svg><title id="x"/><path id="x"/></svg>',
    '<svg aria-labelledby="absent"></svg>',
    `<svg id='x" onload="evil()'></svg>`,
  ])
    assert.throws(() => scopeSVG(unsafe, 'm'), /Teacher course:/);
});
test('portable CLI works outside the repository without node_modules; invalid rebuild preserves existing output', async () =>
  temporary(async (root) => {
    const copy = path.join(root, 'copied skill');
    await fs.mkdir(copy);
    for (const entry of ['scripts', 'assets', 'package.json'])
      await fs.cp(path.join(skill, entry), path.join(copy, entry), {
        recursive: true,
      });
    const input = path.join(root, 'lesson with spaces.json'),
      output = path.join(root, '讲义.html');
    await fs.writeFile(input, JSON.stringify(minimal()));
    await exec(
      process.execPath,
      [path.join(copy, 'scripts/build-reader.mjs'), input, '--out', output],
      { cwd: root },
    );
    const before = await fs.readFile(output, 'utf8');
    assert.equal(embedded(before).id, 'plain-topic');
    const data = minimal();
    data.sections[0].source = { file: 'absent', start: 1, end: 1 };
    await fs.writeFile(input, JSON.stringify(data));
    await assert.rejects(
      exec(
        process.execPath,
        [path.join(copy, 'scripts/build-reader.mjs'), input, '--out', output],
        { cwd: root },
      ),
    );
    assert.equal(await fs.readFile(output, 'utf8'), before);
    assert(!(await fs.readdir(root)).some((name) => name.endsWith('.tmp')));
  }));
