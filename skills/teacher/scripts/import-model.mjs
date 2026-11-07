#!/usr/bin/env node
import {
  readFile,
  mkdir,
  writeFile,
  rename,
  rm,
  realpath,
} from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import {
  parseDot,
  parseViolation,
  parseTlcConfig,
  stateKey,
  boundedText,
} from './tlc-evidence.mjs';

const fail = (message) => {
  throw new TypeError(`Teacher model: ${message}`);
};
const hash = (s) => createHash('sha256').update(s).digest('hex');
const safeId = (s) =>
  typeof s === 'string' &&
  /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(s) &&
  !['constructor', 'prototype', '__proto__'].includes(s);
const label = (s) =>
  typeof s === 'string' && s.trim()
    ? s
    : fail('view labels must be nonempty strings');
// Encode Mermaid syntax characters, not just HTML, so source labels remain text.
const mermaidText = (s) =>
  String(s).replace(/[\\&<>"#\[\]{}|\r\n]/g, (c) =>
    c === '\n' || c === '\r' ? '\\n' : `#${c.codePointAt(0)};`,
  );
const clone = (v) => JSON.parse(JSON.stringify(v));

function codeOnly(text) {
  let depth = 0,
    string = false,
    line = false,
    out = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i],
      pair = text.slice(i, i + 2);
    if (c === '\n') {
      line = false;
      out += '\n';
      continue;
    }
    if (line) {
      out += ' ';
      continue;
    }
    if (depth) {
      if (pair === '(*') {
        depth++;
        i++;
        out += '  ';
      } else if (pair === '*)') {
        depth--;
        i++;
        out += '  ';
      } else out += ' ';
      continue;
    }
    if (string) {
      if (c === '\\') {
        out += text[i + 1] === '\n' ? ' \n' : '  ';
        i++;
      } else {
        if (c === '"') string = false;
        out += ' ';
      }
      continue;
    }
    if (pair === '(*') {
      depth++;
      i++;
      out += '  ';
    } else if (pair === '\\*') {
      line = true;
      i++;
      out += '  ';
    } else if (c === '"') {
      string = true;
      out += ' ';
    } else out += c;
  }
  return out;
}

function viewPath(value) {
  if (typeof value === 'string') return { kind: 'flat', path: [label(value)] };
  if (Array.isArray(value) && value.length && value.length <= 8)
    return { kind: 'nested', path: value.map(label) };
  if (value && typeof value === 'object' && Object.keys(value).length) {
    const regions = Object.entries(value).map(([name, state]) => [
      label(name),
      label(state),
    ]);
    // Keep exact combinations: independent region drawings could invent combinations.
    return {
      kind: 'parallel-combinations',
      path: [regions.map(([name, state]) => `${name}: ${state}`).join(' · ')],
      regions,
    };
  }
  fail(
    'state(vars) must return a string, nonempty string array, or region object',
  );
}

function definitionRanges(text, file) {
  const lines = codeOnly(text).split('\n'),
    defs = [];
  lines.forEach((line, i) => {
    const m = /^\s*([A-Za-z_]\w*)(?:\s*\([^\n]*?\))?\s*==/.exec(line);
    if (m) defs.push({ name: m[1], start: i + 1 });
  });
  return Object.fromEntries(
    defs.map((d, i) => [
      d.name,
      {
        file,
        start: d.start,
        end: (defs[i + 1]?.start || lines.length + 1) - 1,
      },
    ]),
  );
}

function pathsOf(graph, limit = 80) {
  const byFrom = new Map(graph.states.map((s) => [s.id, []]));
  graph.edges.forEach((e) => byFrom.get(e.from).push(e));
  const parents = new Map(graph.initialStates.map((s) => [s, null]));
  const treeEdges = new Set();
  const queue = [...graph.initialStates];
  for (let i = 0; i < queue.length; i++) {
    const from = queue[i];
    for (const edge of byFrom.get(from))
      if (!parents.has(edge.to)) {
        parents.set(edge.to, edge);
        treeEdges.add(edge.id);
        queue.push(edge.to);
      }
  }
  if (parents.size !== graph.states.length)
    fail('imported graph has states unreachable from its initial states');
  function route(to) {
    const states = [to],
      edges = [];
    for (let edge = parents.get(to); edge; edge = parents.get(edge.from)) {
      states.push(edge.from);
      edges.push(edge.id);
    }
    return { states: states.reverse(), edges: edges.reverse() };
  }
  const targets = queue.filter((id) => parents.get(id));
  const alternates = graph.edges.filter((e) => !treeEdges.has(e.id));
  const candidates = targets.slice(0, limit).map(route);
  // Also expose alternate interleavings, including legal loops and parallel actions.
  for (const edge of alternates.slice(
    0,
    Math.max(0, limit - candidates.length),
  )) {
    const path = route(edge.from);
    candidates.push({
      states: [...path.states, edge.to],
      edges: [...path.edges, edge.id],
    });
  }
  const stateById = new Map(graph.states.map((s) => [s.id, s]));
  return {
    traces: candidates.slice(0, limit).map((p, i) => ({
      id: `path-${i + 1}`,
      type: 'example',
      title: `学习路径 ${i + 1}：${stateById.get(p.states.at(-1)).label}`,
      ...p,
      generated: true,
    })),
    omitted: Math.max(0, targets.length + alternates.length - limit),
  };
}

export function projectGraph(graph, view = {}) {
  const nodes = new Map(),
    byState = new Map(),
    kinds = new Set();
  for (const state of graph.states) {
    const projected = viewPath(
      view.state ? view.state(clone(state.variables)) : state.id,
    );
    kinds.add(projected.kind);
    const key = stateKey(projected),
      nodeId = `v${hash(key).slice(0, 16)}`;
    if (!nodes.has(nodeId))
      nodes.set(nodeId, {
        id: nodeId,
        ...projected,
        members: [],
        violations: [],
      });
    const node = nodes.get(nodeId);
    node.members.push(state.id);
    node.violations.push(...(state.violations || []));
    state.label = projected.path.join(' / ');
    state.diagramNode = nodeId;
    byState.set(state.id, node);
  }
  if (kinds.size !== 1)
    fail('state(vars) must return the same view form for every state');
  if (nodes.size > 200)
    fail(
      'projection exceeds 200 visible states; coarsen state(vars) or use a smaller model',
    );
  const nodeList = [...nodes.values()];
  for (const node of nodeList) {
    node.violations = [...new Set(node.violations)];
    node.mark = node.violations.length
      ? node.members.every(
          (id) =>
            (graph.states.find((s) => s.id === id).violations || []).length,
        )
        ? 'observed-violation'
        : 'mixed'
      : 'unmarked';
  }
  const edges = new Map();
  for (const edge of graph.edges) {
    const from = byState.get(edge.from),
      to = byState.get(edge.to);
    const name = label(
      view.step
        ? view.step(
            edge.action,
            clone(graph.states.find((s) => s.id === edge.from).variables),
            clone(graph.states.find((s) => s.id === edge.to).variables),
          )
        : edge.action,
    );
    edge.label = name;
    const key = stateKey([from.id, to.id, name]);
    if (!edges.has(key))
      edges.set(key, { from: from.id, to: to.id, label: name, members: [] });
    edges.get(key).members.push(edge.id);
  }
  if (edges.size > 500)
    fail('projection exceeds 500 visible arrows; use a focused teaching model');
  const lines = ['stateDiagram-v2', '  direction TB'];
  const emit = (parent, depth) => {
    const leaves = nodeList.filter(
      (n) =>
        n.path.length === parent.length + 1 &&
        parent.every((p, i) => n.path[i] === p),
    );
    const groups = [
      ...new Set(
        nodeList
          .filter(
            (n) =>
              n.path.length > parent.length + 1 &&
              parent.every((p, i) => n.path[i] === p),
          )
          .map((n) => n.path[parent.length]),
      ),
    ];
    if (leaves.some((n) => groups.includes(n.path.at(-1))))
      fail('a projected state cannot also be a parent state');
    for (const node of leaves)
      lines.push(
        `${'  '.repeat(depth)}state "${mermaidText(node.path.at(-1))}" as ${node.id}`,
      );
    for (const group of groups) {
      const path = [...parent, group],
        id = `p${hash(stateKey(path)).slice(0, 16)}`;
      lines.push(
        `${'  '.repeat(depth)}state "${mermaidText(group)}" as ${id} {`,
      );
      emit(path, depth + 1);
      lines.push(`${'  '.repeat(depth)}}`);
    }
  };
  emit([], 1);
  for (const node of new Set(
    graph.initialStates.map((id) => byState.get(id).id),
  ))
    lines.push(`  [*] --> ${node}`);
  for (const edge of edges.values())
    lines.push(`  ${edge.from} --> ${edge.to}: ${mermaidText(edge.label)}`);
  for (const node of nodeList) {
    if (node.mark !== 'unmarked')
      lines.push(
        `  class ${node.id} ${node.mark === 'mixed' ? 'teacherMixed' : 'teacherViolation'}`,
      );
    if (
      node.members.some((id) =>
        graph.traces.some(
          (t) =>
            t.loopStart != null && t.states.slice(t.loopStart).includes(id),
        ),
      )
    )
      lines.push(`  class ${node.id} teacherRepeats`);
  }
  const kind = [...kinds][0];
  return {
    kind,
    nodes: nodeList,
    edges: [...edges.values()],
    source: lines.join('\n'),
    note:
      kind === 'parallel-combinations'
        ? '并行维度按实际出现的状态组合投影，未假定任意组合都可达。'
        : '概览可合并多个具体状态；可选动作与路径回放始终使用当前具体状态。',
  };
}

export async function importModel(folder, { id, view = {} } = {}) {
  if (!safeId(id))
    fail('id needs letters/digits/-/_ and must start with a letter or digit');
  const root = resolve(folder);
  const read = async (file) => {
    const bytes = await readFile(resolve(root, file));
    boundedText(bytes.toString('utf8'), file);
    return bytes;
  };
  const resultBytes = await read('result.json'),
    result = JSON.parse(resultBytes);
  if (
    !['holds', 'violated'].includes(result.outcome) ||
    !result.toolVersion ||
    !result.inputs?.spec?.sha256 ||
    !result.inputs?.config?.sha256
  )
    fail(
      'requires a completed or violating check-model run with input provenance',
    );
  const specName = basename(result.inputs.spec.path),
    specBytes = await read(specName),
    configBytes = await read('model.cfg');
  if (
    hash(specBytes) !== result.inputs.spec.sha256 ||
    hash(configBytes) !== result.inputs.config.sha256
  )
    fail('saved specification/configuration fingerprint mismatch');
  const logBytes = await read('tlc.out'),
    dotBytes = await read('states.dot');
  for (const [file, bytes] of [
    ['tlc.out', logBytes],
    ['states.dot', dotBytes],
  ]) {
    if (
      result.artifacts?.[file] &&
      hash(bytes) !== result.artifacts[file].sha256
    )
      fail(`${file} fingerprint mismatch`);
  }
  const log = logBytes.toString('utf8'),
    spec = specBytes.toString('utf8'),
    config = configBytes.toString('utf8');
  if (parseTlcConfig(config).reductions.length)
    fail(
      'VIEW/SYMMETRY reductions need a separate refinement mapping; rerun an unreduced teaching model',
    );
  if (!log.includes(result.toolVersion))
    fail('TLC version in result does not match its log');
  if (
    result.outcome === 'holds' &&
    (!/Model checking completed\. No error has been found\./.test(log) ||
      /Error:/.test(log))
  )
    fail('holds result does not match log');
  const violation = parseViolation(log, config);
  if ((result.outcome === 'violated') !== !!violation)
    fail('result outcome does not match the TLC violation log');
  const dot = dotBytes.toString('utf8');
  // TLC exits before closing/writing its DOT when an initial invariant fails.
  // In that specific case, the printed initial state is the entire trace evidence.
  const initialOnly =
    violation?.kind === 'invariant' &&
    violation.states.length === 1 &&
    /is violated by the initial state/.test(log) &&
    /^strict digraph DiskGraph\s*\{/.test(dot) &&
    !/^\s*-?\d+\s*(?:\[|->)/m.test(dot);
  const parsed = initialOnly ? { states: [], edges: [] } : parseDot(dot);
  const states = parsed.states.map((s) => ({
    id: `s${s.fingerprint.replace('-', 'n')}`,
    variables: s.variables,
    fingerprint: s.fingerprint,
    violations: [],
    initial: s.initial,
  }));
  const fp = new Map(states.map((s) => [s.fingerprint, s.id]));
  const edges = parsed.edges.map((e, i) => ({
    ...e,
    id: `e${i}`,
    from: fp.get(e.from),
    to: fp.get(e.to),
  }));
  const graph = {
    title: view.title || id,
    basis: 'tlc',
    runId: `${id}-run`,
    states,
    edges,
    initialStates: states.filter((s) => s.initial).map((s) => s.id),
    traces: [],
  };
  const notes = [
    result.outcome === 'holds' && result.graphComplete
      ? '本次完整检查的导出图。'
      : '本次检查因性质违反停止或完整性未确认；导出图可能不完整。',
    '仅标注日志实际报告的违反，不把未标注状态视为已逐项证明。',
  ];
  if (!result.artifacts?.['tlc.out'] || !result.artifacts?.['states.dot'])
    notes.push('旧版检查记录未包含日志和图的内容指纹；已核对模型与配置指纹。');
  if (violation) {
    const ids = [],
      traceEdges = [];
    for (const [i, item] of violation.states.entries()) {
      let state = states.find(
        (s) => stateKey(s.variables) === stateKey(item.variables),
      );
      if (!state) {
        state = {
          id: `t${hash(stateKey(item.variables)).slice(0, 16)}`,
          variables: item.variables,
          violations: [],
          origin: 'trace',
          initial: i === 0,
        };
        states.push(state);
        notes.push('日志轨迹包含图导出之外的状态，已按实际日志保留。');
      }
      ids.push(state.id);
      if (i === 0 && !graph.initialStates.includes(state.id))
        graph.initialStates.push(state.id);
      if (i > 0) {
        const candidates = edges.filter(
          (e) =>
            e.from === ids[i - 1] &&
            e.to === state.id &&
            (!item.action || e.action === item.action),
        );
        if (!item.action && candidates.length !== 1)
          fail('loop-closing action is absent or ambiguous in the dump');
        let edge = candidates[0];
        if (!edge) {
          edge = {
            id: `e${edges.length}`,
            from: ids[i - 1],
            to: state.id,
            action: label(item.action),
            origin: 'trace',
          };
          edges.push(edge);
        }
        traceEdges.push(edge.id);
      }
    }
    if (violation.kind !== 'liveness')
      states
        .find((s) => s.id === ids.at(-1))
        .violations.push(violation.property);
    graph.traces.push({
      id: 'counterexample',
      type: 'counterexample',
      kind: violation.kind,
      title: `TLC 路径：${violation.property}`,
      property: violation.property,
      runId: graph.runId,
      states: ids,
      edges: traceEdges,
      ...(violation.loopStart == null
        ? {}
        : { loopStart: violation.loopStart }),
    });
  }
  const modelFile = `${id}/${specName}`,
    defs = definitionRanges(spec, modelFile);
  for (const edge of edges) {
    const explicit = view.source?.(edge.action);
    const definition = defs[edge.action.replace(/\(.*/, '')];
    if (explicit || definition) edge.source = explicit || definition;
  }
  // Projection and generated paths share the concrete graph; no authored reconstruction.
  const projection = projectGraph(graph, view),
    examples = pathsOf(graph);
  graph.traces.push(...examples.traces);
  if (examples.omitted)
    notes.push(
      `另有 ${examples.omitted} 条自动候选学习路径未列出；具体状态和边仍可自由探索。`,
    );
  graph.projection = {
    kind: projection.kind,
    nodes: projection.nodes,
    edges: projection.edges,
  };
  graph.diagram = `${id}-diagram`;
  graph.note = [...new Set([...notes, projection.note])].join(' ');
  const source = (text, language, path) => ({
    text,
    language,
    origin: { kind: 'tlc-evidence', path, revision: result.inputs.spec.sha256 },
  });
  const logSource = `${id}/tlc.out`;
  return {
    format: 'teacher-tlc-import',
    version: 1,
    sources: {
      [modelFile]: {
        ...source(spec, 'tla', specName),
        symbols: Object.entries(defs).map(([name, range]) => ({
          id: name,
          label: name,
          start: range.start,
          end: range.end,
        })),
      },
      [`${id}/model.cfg`]: source(config, 'text', 'model.cfg'),
      [logSource]: source(log, 'text', 'tlc.out'),
      [`${id}/states.dot`]: source(
        dotBytes.toString('utf8'),
        'text',
        'states.dot',
      ),
      [`${id}/result.json`]: source(
        resultBytes.toString('utf8'),
        'json',
        'result.json',
      ),
    },
    runs: {
      [graph.runId]: {
        outcome: result.outcome,
        toolVersion: result.toolVersion,
        logSource,
        command: result.command,
        counts: result.counts,
        limitations: graph.note,
      },
    },
    graphs: { [id]: graph },
    diagrams: {
      [graph.diagram]: {
        source: projection.source,
        readingCue:
          '先观察当前状态的高亮，再选择下一步；变量表保留具体状态，概览可能合并多个状态。',
        caption:
          projection.note +
          ' 红色实线为日志报告的状态违反，虚线为合并标签中部分状态报告违反，点线为日志中的循环段；未标注不代表已证明。',
      },
    },
  };
}

export function mergeModelFragments(input, fragments = []) {
  const course = clone(input);
  for (const fragment of fragments) {
    if (fragment?.format !== 'teacher-tlc-import' || fragment.version !== 1)
      fail('unsupported model fragment format/version');
    for (const kind of ['sources', 'runs', 'graphs', 'diagrams']) {
      if (
        !fragment[kind] ||
        typeof fragment[kind] !== 'object' ||
        Array.isArray(fragment[kind])
      )
        fail(`fragment requires ${kind}`);
      course[kind] ||= {};
      for (const [key, value] of Object.entries(fragment[kind])) {
        if (Object.hasOwn(course[kind], key))
          fail(`duplicate imported ${kind} key ${key}`);
        Object.defineProperty(course[kind], key, {
          value: clone(value),
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
    }
  }
  return course;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      id: { type: 'string' },
      view: { type: 'string' },
      out: { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  const usage =
    'node import-model.mjs EVIDENCE_DIR --id MODEL --out MODEL.json [--view VIEW.mjs]';
  if (values.help) {
    console.log(usage);
    return;
  }
  if (positionals.length !== 1 || !values.id || !values.out) fail(usage);
  const output = resolve(values.out),
    root = await realpath(positionals[0]);
  const metadata = JSON.parse(
    await readFile(resolve(root, 'result.json'), 'utf8'),
  );
  const parent = await realpath(dirname(output)).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (
    parent === root &&
    [
      'result.json',
      'states.dot',
      'tlc.out',
      'model.cfg',
      basename(metadata.inputs.spec.path),
    ].includes(basename(output))
  )
    fail('output must not replace TLC evidence or the specification');
  const existingOutput = await realpath(output).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existingOutput) {
    for (const input of Object.values(metadata.inputs)) {
      if (typeof input?.path !== 'string') continue;
      const original = await realpath(input.path).catch((error) => {
        if (['ENOENT', 'ENOTDIR'].includes(error.code)) return null;
        throw error;
      });
      if (original === existingOutput)
        fail('output must not replace an original model-checking input');
    }
  }
  if (values.view && existingOutput === (await realpath(values.view)))
    fail('output must not replace the view module');
  const view = values.view
    ? await import(pathToFileURL(resolve(values.view)).href)
    : {};
  const fragment = await importModel(root, { id: values.id, view });
  await mkdir(dirname(output), { recursive: true });
  const temp = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(fragment, null, 2) + '\n', {
      flag: 'wx',
    });
    await rename(temp, output);
  } finally {
    await rm(temp, { force: true });
  }
  console.log(`Imported TLC evidence for ${values.id}: ${output}`);
}
if (
  process.argv[1] &&
  (await realpath(process.argv[1]).catch(() => null)) ===
    fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
