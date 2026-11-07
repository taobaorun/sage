import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  parseTlcValue,
  parseState,
  parseDot,
  parseViolation,
  parseTlcConfig,
  stateKey,
} from './tlc-evidence.mjs';
import {
  importModel,
  projectGraph,
  mergeModelFragments,
} from './import-model.mjs';
import { buildReader } from './build-reader.mjs';
import { normalizeCourse } from './reader-contract.mjs';

const exec = promisify(execFile),
  jar = process.env.TLA2TOOLS;
const checker = fileURLToPath(new URL('./check-model.mjs', import.meta.url));
const importer = fileURLToPath(new URL('./import-model.mjs', import.meta.url));
const builder = fileURLToPath(new URL('./build-reader.mjs', import.meta.url));
async function fixture(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'teacher-import-'));
  try {
    await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
const course = (id) => ({
  version: 1,
  id: 'model-lesson',
  title: '理解行为',
  language: 'zh-CN',
  sections: [
    {
      id: 'start',
      title: '预测下一步',
      body: '<p>选择一个动作，然后对照源码。</p>',
      graph: id,
    },
  ],
});
const tiny = `---------------- MODULE Tiny ----------------
EXTENDS Naturals
VARIABLE n
vars == <<n>>
Init == n = 0
Inc == n < 1 /\\ n' = n + 1
Done == n = 1 /\\ UNCHANGED vars
Next == Inc \\/ Done
Spec == Init /\\ [][Next]_vars
Safe == n <= 1
Wrong == n < 1
InitiallyWrong == n > 0
Live == <>(n = 1)
==============================================
`;
async function checked(root, name, spec = tiny, checks = 'INVARIANT Safe') {
  const folder = path.join(root, name);
  await fs.mkdir(folder);
  const file = path.join(folder, 'Tiny.tla'),
    cfg = path.join(folder, 'Tiny.cfg');
  await fs.writeFile(file, spec);
  await fs.writeFile(cfg, `SPECIFICATION Spec\n${checks}\n`);
  const out = path.join(folder, 'evidence');
  try {
    await exec(
      process.execPath,
      [checker, file, '--config', cfg, '--out', out],
      { timeout: 40000 },
    );
  } catch (e) {
    if (e.code !== 1)
      throw new Error(
        await fs
          .readFile(path.join(out, 'tlc.out'), 'utf8')
          .catch(() => e.message),
      );
  }
  return out;
}
const view = {
  title: '计数过程',
  state: (v) => `计数 ${v.n}`,
  step: (a) =>
    ({ Inc: '增加一次', Done: '保持完成', Stuttering: '暂不前进' })[a] || a,
};

test('TLC values retain distinctions between strings, model values, sets, tuples and function domains', () => {
  assert.deepEqual(
    parseTlcValue(
      '[name |-> "🐦\\n\\\"", values |-> <<-1, TRUE, {r1, "r1"}>>]',
    ),
    {
      name: '🐦\n"',
      values: [-1, true, { $set: [{ $modelValue: 'r1' }, 'r1'] }],
    },
  );
  assert.deepEqual(parseTlcValue('(1 :> "number" @@ "1" :> "string")'), {
    $function: [
      [1, 'number'],
      ['1', 'string'],
    ],
  });
  assert.deepEqual(parseTlcValue('()'), { $function: [] });
  assert.notEqual(
    stateKey(parseTlcValue('{1}')),
    stateKey(parseTlcValue('<<1>>')),
  );
  assert.notEqual(
    stateKey(parseTlcValue('r1')),
    stateKey(parseTlcValue('"r1"')),
  );
  assert.deepEqual(
    parseState('/\\ second = [ok |-> FALSE]\n/\\ first = <<1, 2>>'),
    { second: { ok: false }, first: [1, 2] },
  );
  for (const input of [
    '1 + 1',
    '[a |-> 1, a |-> 2]',
    '(1 :> 2 @@ 1 :> 3)',
    '"unterminated',
    '9007199254740993',
    '<<1,>>',
    '<<'.repeat(101) + '0' + '>>'.repeat(101),
  ])
    assert.throws(() => parseTlcValue(input), /TLC import/);
});

test('DOT import preserves actions, all initial states and actual stuttering edges; rejects lossy input', () => {
  const dot =
    'strict digraph DiskGraph {\n-1 [label="n = 0",style = filled]\n2 [label="n = 1",style = filled]\n-1 -> 2 [label="Inc"];\n2 -> 2 [style="dashed"];\n}';
  const parsed = parseDot(dot);
  assert.deepEqual(parseDot(dot.replaceAll('\n', '\r\n')), parsed);
  assert.equal(parsed.states.filter((s) => s.initial).length, 2);
  assert.equal(parsed.edges[1].action, 'Stuttering');
  for (const bad of [
    dot.slice(0, -1),
    dot.replace('label="Inc"', 'color="black"'),
    dot.replace('-1 -> 2', '-1 -> 3'),
    dot.replaceAll('style = filled', 'color="white"'),
    dot.replace('n = 0', 'n = 0\\n/\\\\ n = 1'),
  ])
    assert.throws(() => parseDot(bad), /TLC import/);
});

function graph() {
  return {
    states: [
      { id: 's0', variables: { n: 0 }, violations: [] },
      { id: 's1', variables: { n: 1 }, violations: ['Wrong'] },
    ],
    edges: [{ id: 'e0', from: 's0', to: 's1', action: 'Inc' }],
    initialStates: ['s0'],
    traces: [],
  };
}
test('projection keeps exact concrete members and reports mixed marks without widening allowed actions', () => {
  const g = graph();
  let states = 0,
    steps = 0;
  const p = projectGraph(g, {
    state(v) {
      states++;
      v.n = 99;
      return '同一个标签';
    },
    step(a, from) {
      steps++;
      from.n = 99;
      return '增加';
    },
  });
  assert.equal(states, 2);
  assert.equal(steps, 1);
  assert.equal(p.nodes.length, 1);
  assert.equal(p.nodes[0].mark, 'mixed');
  assert.deepEqual(p.nodes[0].members, ['s0', 's1']);
  assert.equal(g.states[0].variables.n, 0);
  assert.deepEqual(
    g.edges.map((e) => [e.from, e.to]),
    [['s0', 's1']],
  );
  assert.match(p.source, /teacherMixed/);
});
test('nested and parallel-dimension projections are deterministic and preserve only observed combinations', () => {
  const g = graph(),
    nested = projectGraph(g, { state: (v) => ['请求', `阶段 ${v.n}`] });
  assert.match(nested.source, /state "请求" as p[\da-f]+ \{/);
  const parallel = projectGraph(graph(), {
    state: (v) => ({ 缓存: v.n ? '就绪' : '空', 网络: '在线' }),
  });
  assert.equal(parallel.kind, 'parallel-combinations');
  assert.equal(parallel.nodes.length, 2);
  assert(!parallel.source.includes('\n--\n'));
  assert.equal(
    parallel.source,
    projectGraph(graph(), {
      state: (v) => ({ 缓存: v.n ? '就绪' : '空', 网络: '在线' }),
    }).source,
  );
  assert.throws(
    () =>
      projectGraph(graph(), {
        state: (v) => (v.n ? 'flat' : ['parent', 'child']),
      }),
    /same view form/,
  );
});
test('projection treats Mermaid control characters as label text', async () => {
  const g = graph(),
    p = projectGraph(g, {
      state: (v) => `状态 ${v.n} "\n[*] --> injected: <script>#`,
    });
  assert(!p.source.includes('<script>'));
  assert(!p.source.includes('\n[*] --> injected'));
  const { renderTeacherDiagram } = await import('./render-diagram.mjs');
  const svg = renderTeacherDiagram(p.source, {
    idPrefix: 'escaping',
    width: 700,
  });
  assert(!svg.includes('<script>'));
});
test('fragment merges fail on collisions and keep course inputs immutable', () => {
  const input = course('x'),
    fragment = {
      format: 'teacher-tlc-import',
      version: 1,
      sources: {},
      runs: {},
      graphs: { x: {} },
      diagrams: {},
    };
  assert(mergeModelFragments(input, [fragment]).graphs.x);
  assert(!input.graphs);
  assert.throws(
    () => mergeModelFragments(input, [fragment, fragment]),
    /duplicate imported/,
  );
  assert.throws(
    () => mergeModelFragments(input, [{ ...fragment, version: 2 }]),
    /format\/version/,
  );
});
test('a temporal log without a loop is not converted into a finite counterexample', () => {
  assert.throws(
    () =>
      parseViolation(
        'Error: Temporal properties were violated.\nState 1: <Initial predicate>\nn = 0\n\n',
      ),
    /loop or stuttering/,
  );
});

test('configuration directives are tokens across line layouts, comments and quoted/model values', () => {
  for (const config of [
    'SPECIFICATION Spec PROPERTIES Foo Bar CHECK_DEADLOCK FALSE',
    'SPECIFICATION Spec\nPROPERTIES\nFoo\nBar\n',
    'SPECIFICATION Spec\nPROPERTY Foo\nBar\n',
    'SPECIFICATION Spec\nPROPERTY Foo (* outer (* VIEW Hidden *) PROPERTIES Fake *) Bar\n',
  ])
    assert.deepEqual(parseTlcConfig(config).properties, ['Foo', 'Bar']);
  assert.deepEqual(
    parseTlcConfig(
      'SPECIFICATION Spec VIEW ModelView SYMMETRY Symm',
    ).reductions.map((r) => r.kind),
    ['VIEW', 'SYMMETRY'],
  );
  assert.deepEqual(
    parseTlcConfig(
      'CONSTANTS Label = "VIEW" Flag = SYMMETRY Values = {PROPERTY, "PROPERTIES"}\n\\* VIEW Hidden\n(* SYMMETRY Hidden *)\nSPECIFICATION Spec PROPERTY Live',
    ).reductions,
    [],
  );
  assert.deepEqual(
    parseTlcConfig(
      'CONSTANTS Label = "VIEW" Flag = SYMMETRY Values = {PROPERTY, "PROPERTIES"}\nSPECIFICATION Spec PROPERTY Live',
    ).properties,
    ['Live'],
  );
  const log =
    'Error: Temporal properties were violated.\nState 1: <Initial predicate>\nn = 0\n\nState 2: Stuttering\n';
  assert.equal(
    parseViolation(log, 'SPECIFICATION Spec PROPERTIES\nFoo\nBar').property,
    'TemporalProperties (see configuration)',
  );
  for (const invalid of [
    '(* unterminated',
    'CONSTANT A = "unterminated',
    'SPECIFICATION',
  ]) {
    assert.throws(() => parseTlcConfig(invalid), /TLC import/);
  }
});

test(
  'real TLC imports normal paths, exact invariant traces, initial violations, deadlock and stuttering liveness',
  { skip: !jar },
  async () =>
    fixture(async (root) => {
      const cases = [
        ['safe', tiny, 'INVARIANT Safe', 'holds'],
        ['wrong', tiny, 'INVARIANT Wrong', 'invariant'],
        ['initial', tiny, 'INVARIANT InitiallyWrong', 'invariant'],
        [
          'dead',
          tiny.replace('Next == Inc \\/ Done', 'Next == Inc'),
          'INVARIANT Safe',
          'deadlock',
        ],
        ['live', tiny, 'PROPERTY Live', 'liveness'],
      ];
      for (const [id, spec, checks, kind] of cases) {
        const out = await checked(root, id, spec, checks),
          fragment = await importModel(out, { id, view });
        const g = fragment.graphs[id],
          trace = g.traces.find((t) => t.type === 'counterexample');
        assert.equal(
          fragment.runs[g.runId].outcome,
          kind === 'holds' ? 'holds' : 'violated',
        );
        if (kind === 'holds') {
          assert(!trace);
          assert(g.traces.length >= 2);
          assert.deepEqual(g.traces[0].edges, ['e0']);
        } else {
          assert.equal(trace.kind, kind);
          assert.equal(trace.states.length, trace.edges.length + 1);
        }
        if (id === 'initial') assert.equal(trace.states.length, 1);
        if (id === 'live') {
          assert.equal(trace.loopStart, 0);
          assert.equal(trace.states[0], trace.states.at(-1));
          assert.equal(trace.property, 'Live');
        }
        for (const e of g.edges.filter((e) => e.action === 'Inc'))
          assert.deepEqual(e.source, {
            file: `${id}/Tiny.tla`,
            start: 6,
            end: 6,
          });
        const normalized = normalizeCourse(
          mergeModelFragments(course(id), [fragment]),
        );
        assert.equal(normalized.graphs[id].states.length, g.states.length);
        const html = await buildReader(course(id), { models: [fragment] });
        assert(html.includes('data-teacher-renderer=\\"pele\\"'));
        assert(html.includes('"model":{"wide":'));
      }
    }),
);

test(
  'real liveness cycle closes through the log-reported action rather than a made-up edge',
  { skip: !jar },
  async () =>
    fixture(async (root) => {
      const spec = tiny
        .replace(
          "Inc == n < 1 /\\ n' = n + 1",
          "Inc == n' = IF n = 0 THEN 1 ELSE 0",
        )
        .replace('Next == Inc \\/ Done', 'Next == Inc')
        .replace('Live == <>(n = 1)', 'Live == <>(n = 2)');
      const out = await checked(root, 'cycle', spec, 'PROPERTY Live');
      const fragment = await importModel(out, { id: 'cycle', view }),
        g = fragment.graphs.cycle,
        t = g.traces[0];
      assert.equal(t.type, 'counterexample');
      assert(t.loopStart != null);
      assert.equal(t.states[t.loopStart], t.states.at(-1));
      assert(
        g.edges.some(
          (e) => e.id === t.edges.at(-1) && e.to === t.states[t.loopStart],
        ),
      );
      normalizeCourse(mergeModelFragments(course('cycle'), [fragment]));
    }),
);

test(
  'fingerprints detect evidence edits and a failed import/build preserves existing output',
  { skip: !jar },
  async () =>
    fixture(async (root) => {
      const out = await checked(root, 'tamper');
      const fragment = await importModel(out, { id: 'proof', view });
      const evidenceBefore = await fs.readFile(
        path.join(out, 'result.json'),
        'utf8',
      );
      await assert.rejects(
        exec(process.execPath, [
          importer,
          out,
          '--id',
          'proof',
          '--out',
          path.join(out, 'result.json'),
        ]),
      );
      assert.equal(
        await fs.readFile(path.join(out, 'result.json'), 'utf8'),
        evidenceBefore,
      );
      const model = path.join(root, 'model.json'),
        source = path.join(root, 'course.json'),
        html = path.join(root, 'index.html');
      await fs.writeFile(model, JSON.stringify(fragment));
      await fs.writeFile(source, JSON.stringify(course('proof')));
      await fs.writeFile(html, 'previous lesson');
      await assert.rejects(
        exec(process.execPath, [
          builder,
          source,
          '--model',
          model,
          '--out',
          model,
        ]),
      );
      assert.equal(
        JSON.parse(await fs.readFile(model, 'utf8')).format,
        'teacher-tlc-import',
      );
      await assert.rejects(
        exec(process.execPath, [
          builder,
          source,
          '--model',
          model,
          '--model',
          model,
          '--out',
          html,
        ]),
      );
      assert.equal(await fs.readFile(html, 'utf8'), 'previous lesson');
      await fs.appendFile(path.join(out, 'tlc.out'), 'edited');
      await assert.rejects(
        importModel(out, { id: 'proof' }),
        /fingerprint mismatch/,
      );
      await fs.writeFile(model, 'previous fragment');
      await assert.rejects(
        exec(process.execPath, [
          importer,
          out,
          '--id',
          'proof',
          '--out',
          model,
        ]),
      );
      assert.equal(await fs.readFile(model, 'utf8'), 'previous fragment');
    }),
);

test(
  'real multi-initial-state DOT preserves nested printed values and definition snapshots',
  { skip: !jar },
  async () =>
    fixture(async (root) => {
      const spec = `---------------- MODULE Tiny ----------------
EXTENDS Naturals, TLC
VARIABLES n, data
vars == <<n, data>>
Init == /\\ n \\in {0, 1}
        /\\ data = [items |-> <<1, TRUE, "bird">>, members |-> {1, 2}, mapping |-> ("x-y" :> "first" @@ "z-w" :> "second")]
Next == UNCHANGED vars
Spec == Init /\\ [][Next]_vars
Safe == n \\in 0..1
==============================================
`;
      const out = await checked(root, 'values', spec),
        fragment = await importModel(out, { id: 'values' }),
        g = fragment.graphs.values;
      assert.equal(g.initialStates.length, 2);
      assert.deepEqual(g.states[0].variables.data.items, [1, true, 'bird']);
      assert.deepEqual(g.states[0].variables.data.members, { $set: [1, 2] });
      assert.equal(g.states[0].variables.data.mapping.$function.length, 2);
      normalizeCourse(mergeModelFragments(course('values'), [fragment]));
    }),
);

test(
  'bundled learning example completes the real checker/importer/view/reader CLI pipeline',
  { skip: !jar },
  async () =>
    fixture(async (root) => {
      const example = fileURLToPath(
        new URL('../assets/model-learning-example/', import.meta.url),
      );
      const folder = path.join(root, 'input');
      await fs.mkdir(folder);
      const modelText = await fs.readFile(
        path.join(example, 'Counter.tla'),
        'utf8',
      );
      const out = await checked(
        folder,
        'counter',
        modelText.replace('MODULE Counter', 'MODULE Tiny'),
        'INVARIANT TypeOK',
      );
      const model = path.join(root, 'counter.json'),
        html = path.join(root, 'index.html');
      await exec(process.execPath, [
        importer,
        out,
        '--id',
        'counter',
        '--view',
        path.join(example, 'view.mjs'),
        '--out',
        model,
      ]);
      const fragment = JSON.parse(await fs.readFile(model, 'utf8')),
        g = fragment.graphs.counter;
      assert.equal(g.states.length, 13);
      assert.equal(g.projection.nodes.length, 10);
      assert(
        g.traces.some(
          (t) =>
            g.states.find((s) => s.id === t.states.at(-1)).variables.n === 2,
        ),
      );
      assert(
        g.traces.some((t) => {
          const v = g.states.find((s) => s.id === t.states.at(-1)).variables;
          return v.n === 1 && v.pc.every((p) => p === 'done');
        }),
      );
      const data = course('counter'),
        json = path.join(root, 'course.json');
      await fs.writeFile(json, JSON.stringify(data));
      await exec(process.execPath, [
        builder,
        json,
        '--model',
        model,
        '--out',
        html,
      ]);
      const rendered = await fs.readFile(html, 'utf8');
      assert(rendered.includes('is-model-current'));
      assert(rendered.includes('data-teacher-renderer=\\"pele\\"'));
    }),
);

test(
  'reduced TLC graphs are rejected instead of presenting representative edges as exact concrete actions',
  { skip: !jar },
  async () =>
    fixture(async (root) => {
      for (const [name, spec, config] of [
        [
          'view',
          tiny.replace('Safe ==', 'ModelView == n\nSafe =='),
          'INVARIANT Safe\nVIEW ModelView',
        ],
        [
          'inline',
          tiny.replace('Safe ==', 'ModelView == n\nSafe =='),
          'INVARIANT Safe VIEW ModelView',
        ],
        [
          'symmetry',
          tiny
            .replace(
              'EXTENDS Naturals',
              'EXTENDS Naturals, TLC\nCONSTANTS Nodes',
            )
            .replace('Safe ==', 'Symm == Permutations(Nodes)\nSafe =='),
          'CONSTANTS Nodes = {a,b}\nINVARIANT Safe SYMMETRY Symm',
        ],
      ]) {
        const out = await checked(root, name, spec, config);
        await assert.rejects(
          importModel(out, { id: name }),
          /VIEW\/SYMMETRY reductions/,
        );
      }
    }),
);

test(
  'real multi-property temporal failures stay collective for multiline and inline configuration',
  { skip: !jar },
  async () =>
    fixture(async (root) => {
      const spec = tiny.replace('Live ==', 'AlwaysOK == []Safe\nLive ==');
      for (const [name, config] of [
        ['multiline', 'PROPERTIES\nAlwaysOK\nLive'],
        ['inline', 'PROPERTY AlwaysOK Live'],
      ]) {
        const out = await checked(root, name, spec, config),
          fragment = await importModel(out, { id: name, view });
        assert.equal(
          fragment.graphs[name].traces[0].property,
          'TemporalProperties (see configuration)',
        );
        normalizeCourse(mergeModelFragments(course(name), [fragment]));
      }
    }),
);

test(
  'import CLI preserves original inputs and their aliases, and remains portable without those originals',
  { skip: !jar },
  async () =>
    fixture(async (root) => {
      const out = await checked(root, 'originals'),
        metadataPath = path.join(out, 'result.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      for (const kind of ['spec', 'config']) {
        const original = metadata.inputs[kind].path,
          before = await fs.readFile(original);
        await assert.rejects(
          exec(process.execPath, [
            importer,
            out,
            '--id',
            'originals',
            '--out',
            original,
          ]),
          /original model-checking input/,
        );
        assert.deepEqual(await fs.readFile(original), before);
        const alias = path.join(root, kind + '-alias');
        await fs.symlink(original, alias);
        await assert.rejects(
          exec(process.execPath, [
            importer,
            out,
            '--id',
            'originals',
            '--out',
            alias,
          ]),
          /original model-checking input/,
        );
        assert.deepEqual(await fs.readFile(original), before);
        assert((await fs.lstat(alias)).isSymbolicLink());
      }
      for (const input of Object.values(metadata.inputs))
        input.path = path.join(root, 'unavailable', path.basename(input.path));
      await fs.writeFile(metadataPath, JSON.stringify(metadata));
      const output = path.join(root, 'portable.json');
      await fs.writeFile(output, 'previous output');
      await exec(process.execPath, [
        importer,
        out,
        '--id',
        'portable',
        '--out',
        output,
      ]);
      assert.equal(
        JSON.parse(await fs.readFile(output, 'utf8')).format,
        'teacher-tlc-import',
      );
    }),
);
