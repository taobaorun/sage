// Rebuild the two local Teacher review artifacts with real Pele SVG.
// Generated illustrations: Pele 1.9.0 by kepano / Obsidian, MIT.
// https://github.com/obsidianmd/pele — no renderer bundle ships in the HTML.
// Meaning is authored as states, events, guards and projections; Pele owns layout.
// These are teaching fixtures, not a TLA+/TLC model or verification result.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderTeacherDiagram } from '../../skills/teacher/scripts/render-diagram.mjs';
import { spawnSync } from 'node:child_process';
import { integrateTeachingMotion } from './teacher-reader-motion.mjs';

const directory = new URL('./', import.meta.url);
const widths = { wide: 700, narrow: 300 };
const readerThemeConfig = JSON.parse(await readFile(new URL('../../skills/teacher/assets/reader-themes.json', import.meta.url), 'utf8'));
const cacheScene = {
  title: '同一个问题，两条缓存路径',
  description: '从查询开始，先检查副本。未命中时读取、保存后返回，命中时直接返回。仅展示顺序查询，假设副本仍然可用。',
  nodes: [
    ['query', '1 查询书籍 42', 'shared'],
    ['cache', '2 有副本吗？', 'shared', 'decision'],
    ['load', '3 读取书籍<br/>findBook', 'miss'],
    ['save', '4 保存副本', 'miss'],
    ['result', '5 返回结果', 'miss'],
    ['hit', '3 直接返回副本', 'hit'],
  ],
  edges: [
    ['query', 'cache', '', 'shared'],
    ['cache', 'load', '没有副本', 'miss'],
    ['load', 'save', '', 'miss'],
    ['save', 'result', '', 'miss'],
    ['cache', 'hit', '有副本', 'hit'],
  ],
  captions: {
    all: '从查询开始，先检查副本。沿“没有副本”走一遍，再沿“有副本”走一遍，比较哪一步被省掉。',
    miss: '第一次查询：缓存里还没有 book:42。读取书籍、保存副本，再返回结果。',
    hit: '第二次查询：第一次已经留下 book:42。直接返回副本，没有再次调用 findBook。',
  },
};
const flowScene = {
  title: '缓存查询的成功与错误分支',
  description: '命中时返回副本；未命中时读取原始书籍。找到后保存并返回，找不到则报告错误，不缓存错误结果。',
  nodes: [
    ['query', '查询书籍', 'shared'],
    ['cache', '已有副本？', 'shared', 'decision'],
    ['hit', '返回副本', 'success'],
    ['load', 'findBook 读取', 'shared'],
    ['found', '找到书？', 'shared', 'decision'],
    ['saved', '保存并返回', 'success'],
    ['error', '报告错误<br/>不缓存', 'failure'],
  ],
  edges: [
    ['query', 'cache', '', 'shared'],
    ['cache', 'hit', '有', 'success'],
    ['cache', 'load', '没有', 'shared'],
    ['load', 'found', '', 'shared'],
    ['found', 'saved', '找到', 'success'],
    ['found', 'error', '未找到', 'failure'],
  ],
  captions: {
    all: '从查询出发，先读条件，再追到成功或错误出口。命中和未命中成功是两条不同的成功路径。',
    success: '命中直接返回副本；未命中但找到书时，先保存再返回。两条成功路径都保留完整前提。',
    failure: '没有副本且 findBook 找不到书时，示例报告错误；没有把错误结果保存成有效副本。',
  },
};
const stateScene = {
  title: '处理、失败、重试与终态',
  description: '等待后开始处理。成功进入完成终态；失败可在尚有次数时重试，或放弃并终止。重试次数为教学设定。',
  states: [
    ['waiting', '等待', 'shared'],
    ['processing', '处理中', 'shared'],
    ['failed', '失败', 'retry'],
    ['done', '完成', 'done'],
    ['stopped', '终止', 'done'],
  ],
  events: [
    ['[*]', 'waiting', '', 'shared'],
    ['waiting', 'processing', '开始', 'shared'],
    ['processing', 'done', '成功', 'done'],
    ['processing', 'failed', '出错', 'retry'],
    ['failed', 'processing', '重试 [有次数]', 'retry'],
    ['failed', 'stopped', '放弃或次数用尽', 'done'],
    ['done', '[*]', '', 'done'],
    ['stopped', '[*]', '', 'done'],
  ],
  captions: {
    all: '读取状态之间的事件与条件。失败仍可能重试；完成和终止结束这次流程。',
    retry: '发生错误后，尚有次数时可点击重试，重新进入处理中。次数限制是本图的教学设定。',
    done: '成功进入完成，放弃或次数用尽进入终止。两者都是终态，但结果不同。',
  },
};
const architectureScene = {
  title: '订单服务的职责与边界',
  description: '浏览器提交订单。订单接口保存订单并发布事件；worker 从队列消费事件并通知。职责图不表示固定运行顺序。',
  nodes: [
    ['browser', '浏览器<br/>提交订单', 'request'],
    ['api', '订单接口<br/>接住请求', 'shared'],
    ['store', '订单存储<br/>保存订单', 'data', 'store'],
    ['queue', '队列<br/>保留事件', 'data'],
    ['worker', '后台 worker<br/>调用邮件服务', 'data'],
  ],
  edges: [
    ['browser', 'api', '提交', 'request'],
    ['api', 'store', '保存', 'data'],
    ['api', 'queue', '发布事件', 'data'],
    ['queue', 'worker', '消费', 'data'],
  ],
  boundary: { id: 'server', label: '服务端职责边界', nodes: ['api', 'store', 'queue', 'worker'] },
  captions: {
    all: '浏览器发起请求；订单接口负责接单与保存，后台 worker 负责通知。组成位置不是执行时间。',
    request: '请求侧说明浏览器与订单接口的职责。不能从接口位于图中间推断所有后台工作都已完成。',
    data: '存储保留订单，队列保留事件，worker 负责通知；这是三种不同职责。',
  },
};
const sequenceScene = {
  title: '同步返回与异步通知的独立分支',
  description: '发布事件后，入队确认与接口返回构成 A 分支；worker 消费并通知构成 B 分支。两者没有声明固定总顺序。',
  actors: [
    ['Browser', '浏览器', 'api'],
    ['API', '订单接口', 'shared'],
    ['Queue', '队列', 'shared'],
    ['Worker', 'worker', 'worker'],
    ['Mail', '邮件服务', 'worker'],
  ],
  items: [
    { from: 'Browser', to: 'API', arrow: '->>', label: '提交订单', part: 'shared' },
    { from: 'API', to: 'Queue', arrow: '->>', label: '发布事件', part: 'shared' },
    { control: 'par A 接口返回' },
    { from: 'Queue', to: 'API', arrow: '-->>', label: '入队确认', part: 'api' },
    { from: 'API', to: 'Browser', arrow: '-->>', label: '返回 202', part: 'api' },
    { control: 'and B 后台通知' },
    { from: 'Queue', to: 'Worker', arrow: '-)', label: '消费事件', part: 'worker' },
    { from: 'Worker', to: 'Mail', arrow: '->>', label: '调用邮件服务', part: 'worker' },
    { control: 'end' },
  ],
  captions: {
    all: 'A 分支等待入队确认后返回 202；B 分支消费事件并通知。par 表示独立分支，不把图上高低当成跨分支总顺序。',
    api: 'A 分支只等待入队确认再返回 202，没有等待邮件完成。202 不是邮件发送确认。',
    worker: 'B 分支独立消费并通知；不能据此保证邮件早于或晚于浏览器收到响应。',
  },
};

function projectFlow(scene, ids, title) {
  const selected = new Set(ids);
  return {
    ...scene, title,
    nodes: scene.nodes.filter(node => selected.has(node[0])),
    edges: scene.edges.filter(edge => selected.has(edge[0]) && selected.has(edge[1])),
    boundary: scene.boundary ? { ...scene.boundary, nodes: scene.boundary.nodes.filter(id => selected.has(id)) } : undefined,
  };
}
function comparisonScene(after) {
  const reads = [1, after ? 0 : 1], count = reads.reduce((sum, value) => sum + value, 0);
  return {
    title: after ? '使用缓存：相同输入的路径' : '未使用缓存：相同输入的路径',
    description: '两次顺序查询都请求 book:42，只改变第二次是否复用第一次的结果；不代表历史提交或性能测量。',
    nodes: [
      ['first', '第一次查询<br/>book:42', 'shared'],
      ['firstRead', 'findBook 读取', 'shared'],
      ['second', '第二次查询<br/>book:42', 'shared'],
      ['secondPath', after ? '返回缓存副本' : '再次 findBook', 'shared'],
      ['count', 'findBook 共 ' + count + ' 次', 'shared'],
    ],
    edges: [
      ['first', 'firstRead', '', 'shared'], ['firstRead', 'second', '随后', 'shared'],
      ['second', 'secondPath', '', 'shared'], ['secondPath', 'count', '', 'shared'],
    ],
    emphasis: ['secondPath'],
    captions: { all: '相同的两次 book:42 查询，' + (after ? '第二次复用副本' : '没有复用结果') + '，findBook 合计调用 ' + count + ' 次。这是路径对照，不是耗时测量。' },
  };
}
function algorithmScene(index) {
  const values = [8, 3, 6, 1], target = 6, current = values[index], found = current === target;
  const caption = '当前索引 ' + index + '，值为 ' + current + '，' + (found ? '与目标 6 相等，在这里找到目标。' : '与目标 6 不相等，还不能宣布找到。');
  return {
    title: '线性查找快照 ' + (index + 1),
    description: '输入为 8、3、6、1，目标为 6。按索引顺序观察，每一帧仅表达当前元素与目标的比较，不是程序运行日志。',
    nodes: values.map((value, i) => ['a' + i, '索引 ' + i + '<br/>值 ' + value + (i === index ? '<br/>当前观察' : ''), 'shared']),
    edges: values.slice(1).map((value, i) => ['a' + i, 'a' + (i + 1), '相邻索引', 'shared']),
    emphasis: ['a' + index],
    captions: { all: caption },
    globalTakeaway: '线性查找按索引逐个比较；只有看到与目标相等的当前元素，才有找到的证据。',
  };
}

function flowSource(scene, direction) {
  const source = ['flowchart ' + direction, 'accTitle: ' + scene.title, 'accDescr: ' + scene.description];
  const nodeLine = ([id, label, , shape]) => id + (shape === 'decision' ? '{"' + label + '"}' : shape === 'store' ? '[("' + label + '")]' : '["' + label + '"]');
  const inBoundary = new Set(scene.boundary?.nodes || []);
  for (const node of scene.nodes.filter(node => !inBoundary.has(node[0]))) source.push(nodeLine(node));
  if (scene.boundary && inBoundary.size) {
    source.push('subgraph ' + scene.boundary.id + '["' + scene.boundary.label + '"]', 'direction ' + direction);
    for (const node of scene.nodes.filter(node => inBoundary.has(node[0]))) source.push(nodeLine(node));
    source.push('end');
  }
  for (const [from, to, event] of scene.edges) {
    source.push(from + ' -->' + (event ? '|' + event + '|' : '') + ' ' + to);
  }
  return source.join('\n');
}
function sequenceSource(scene) {
  const source = ['sequenceDiagram', 'accTitle: ' + scene.title, 'accDescr: ' + scene.description];
  for (const [id, label] of scene.actors) source.push('participant ' + id + ' as ' + label);
  for (const item of scene.items) source.push(item.control || item.from + item.arrow + item.to + ': ' + item.label);
  return source.join('\n');
}
function stateSource(scene) {
  const source = ['stateDiagram-v2', 'direction TB', 'accTitle: ' + scene.title, 'accDescr: ' + scene.description];
  for (const [id, label] of scene.states) source.push('state "' + label + '" as ' + id);
  for (const [from, to, event] of scene.events) source.push(from + ' --> ' + to + (event ? ': ' + event : ''));
  return source.join('\n');
}
function partsForFlow(scene) {
  const parts = Object.fromEntries(scene.nodes.map(([id, , part]) => [id, part]));
  if (scene.boundary) parts[scene.boundary.id] = 'shared';
  const counts = new Map();
  for (const [from, to, , part] of scene.edges) {
    const pair = from + '_' + to, index = counts.get(pair) || 0;
    counts.set(pair, index + 1);
    parts['L_' + pair + '_' + index] = part;
  }
  return parts;
}
function partsForSequence(scene) {
  const parts = Object.fromEntries(scene.actors.map(([id, , part]) => [id, part]));
  scene.items.forEach((item, index) => { if (!item.control) parts['i' + index] = item.part; });
  return parts;
}
function partsForState(scene) {
  const parts = Object.fromEntries(scene.states.map(([id, , part]) => [id, part]));
  scene.events.forEach((event, index) => { parts['edge' + index] = event[3]; });
  parts.root_start = 'shared'; parts.root_end = 'done';
  return parts;
}
function renderFixture(source, parts, prefix, width, cssClass, observed = []) {
  let svg = renderTeacherDiagram(source, { width, idPrefix: prefix });
  svg = svg.replace(/class="([^"]*)"/, (_, value) => 'class="' + value + ' ' + cssClass + '"');
  svg = svg.replace(/<([A-Za-z][\w:-]*)\b([^>]*\bdata-id="([^"]+)"[^>]*)>/g,
    (tag, element, attrs, id) => {
      if (!parts[id] && !observed.includes(id)) return tag;
      const selfClosing = /\/\s*$/.test(attrs);
      const attributes = selfClosing ? attrs.replace(/\/\s*$/, '') : attrs;
      const semanticAttributes = (parts[id] ? ' data-teacher-part="' + parts[id] + '"' : '') + (observed.includes(id) ? ' data-teacher-observed="true"' : '');
      return '<' + element + attributes + semanticAttributes + (selfClosing ? '/>' : '>');
    });
  svg = svg.replace(/(<svg\b[^>]*>)/, '$1<metadata>Generated by Pele 1.9.0, kepano / Obsidian, MIT; https://github.com/obsidianmd/pele. Teaching projection, not a verified runtime trace.</metadata>');
  return svg;
}
function actualWidth(svg) {
  return Number(svg.match(/viewBox="0 0 ([\d.]+) [\d.]+"/)?.[1] || Infinity);
}
function flowLayout(scene, prefix, width, mode) {
  let best;
  for (const direction of mode === 'wide' ? ['LR', 'TB'] : ['TB', 'LR']) {
    const source = flowSource(scene, direction);
    const svg = renderFixture(source, partsForFlow(scene), prefix, width, mode, scene.emphasis || []);
    if (!best || actualWidth(svg) < actualWidth(best.svg)) best = { source, svg };
    if (actualWidth(svg) <= width) break;
  }
  if (actualWidth(best.svg) > width + 1) console.warn(prefix + ': actual width ' + actualWidth(best.svg) + ' exceeds requested ' + width);
  return best;
}
function buildFlow(scene, id, modes = widths) {
  const result = { captions: scene.captions, globalTakeaway: scene.globalTakeaway, source: {}, layouts: {} };
  for (const [mode, width] of Object.entries(modes)) {
    const { source, svg } = flowLayout(scene, id + '-' + mode, width, mode);
    result.source[mode] = source;
    result.layouts[mode] = svg;
  }
  return result;
}
function buildState(scene, id) {
  const source = stateSource(scene), result = { captions: scene.captions, source, layouts: {} };
  for (const [mode, width] of Object.entries(widths)) result.layouts[mode] = renderFixture(source, partsForState(scene), id + '-' + mode, width, mode);
  return result;
}
function composeProjections(items) {
  return '<div class="teacher-pele-projections">' + items.map(item => '<section class="teacher-pele-projection"><p>' + item.label + '</p>' + item.svg + '</section>').join('') + '</div>';
}
function addFlowProjection(result, focus, scenes, id) {
  result.focusLayouts ||= {};
  const slices = scenes.map((scene, index) => {
    const { svg } = flowLayout(scene, id + '-projection-' + focus + '-' + index, widths.narrow, 'narrow');
    return { label: scene.title, svg };
  });
  result.focusLayouts[focus] = { narrow: composeProjections(slices) };
}
function buildSequence(scene, id) {
  const source = sequenceSource(scene), result = { source, captions: scene.captions, layouts: {}, focusLayouts: {} };
  result.layouts.wide = renderFixture(source, partsForSequence(scene), id + '-wide', widths.wide, 'wide');
  const api = { ...scene, title: 'A：接口返回分支', actors: scene.actors.filter(actor => ['Browser', 'API', 'Queue'].includes(actor[0])), items: scene.items.filter(item => !item.control && item.part !== 'worker') };
  const worker = { ...scene, title: 'B：后台通知分支', actors: scene.actors.filter(actor => ['API', 'Queue', 'Worker', 'Mail'].includes(actor[0])), items: scene.items.filter(item => !item.control && item.from !== 'Browser' && item.part !== 'api') };
  const projections = [api, worker].map((projected, index) => ({ label: projected.title + '（两图不表示执行先后）', svg: renderFixture(sequenceSource(projected), partsForSequence(projected), id + '-narrow-' + index, widths.narrow, 'narrow') }));
  result.layouts.narrow = composeProjections(projections);
  result.focusLayouts.api = { narrow: composeProjections([projections[0]]) };
  result.focusLayouts.worker = { narrow: composeProjections([projections[1]]) };
  return result;
}
function flowTrace(scene, key, title, ids) {
  const nodes = new Map(scene.nodes.map(node => [node[0], node]));
  const plain = label => label.replace(/<br\s*\/?>/g, ' · ').replace(/^\d+\s*/, '');
  const sentence = text => /[。！？!?]$/.test(text) ? text : text + '。';
  const frames = ids.map((id, index) => {
    if (!nodes.has(id)) throw new Error('Unknown teaching trace node: ' + id);
    if (!index) return { node: id, edge: null, text: sentence(plain(nodes.get(id)[1])) };
    const from = ids[index - 1], edgeIndex = scene.edges.findIndex(edge => edge[0] === from && edge[1] === id);
    if (edgeIndex < 0) throw new Error('Undeclared teaching transition: ' + from + ' -> ' + id);
    const edge = scene.edges[edgeIndex], duplicate = scene.edges.slice(0, edgeIndex).filter(prior => prior[0] === from && prior[1] === id).length;
    return { node: id, edge: 'L_' + from + '_' + id + '_' + duplicate, text: sentence((edge[2] ? edge[2] + '：' : '') + plain(nodes.get(id)[1])) };
  });
  return { key, title, mode: 'request', frames, teachingOnly: true };
}
function stateTrace(scene, key, title, ids) {
  const states = new Map(scene.states.map(state => [state[0], state[1]]));
  const frames = ids.map((id, index) => {
    if (!states.has(id)) throw new Error('Unknown trace state: ' + id);
    if (!index) return { node: id, edge: null, text: '当前状态：' + states.get(id) + '。' };
    const from = ids[index - 1], event = scene.events.findIndex(item => item[0] === from && item[1] === id);
    if (event < 0) throw new Error('Undeclared state event: ' + from + ' -> ' + id);
    return { node: id, edge: 'edge' + event, text: scene.events[event][2] + '：进入“' + states.get(id) + '”。' };
  });
  return { key, title, mode: 'state', frames, teachingOnly: true };
}
function teacherFocusPele(markup, focus) {
  if (markup.startsWith('<div')) {
    const parsed = new DOMParser().parseFromString(markup, 'text/html');
    parsed.body.querySelectorAll('svg').forEach(function (svg) {
      svg.querySelectorAll('[data-teacher-part]').forEach(function (element) {
        const part = element.getAttribute('data-teacher-part'), active = focus === 'all' || part === 'shared' || part === focus;
        element.classList.toggle('teacher-focus-muted', !active);
        element.classList.toggle('teacher-focus-active', active);
      });
    });
    return parsed.body.innerHTML;
  }
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml'), svg = parsed.documentElement;
  svg.querySelectorAll('[data-teacher-part]').forEach(function (element) {
    const part = element.getAttribute('data-teacher-part'), active = focus === 'all' || part === 'shared' || part === focus;
    element.classList.toggle('teacher-focus-muted', !active);
    element.classList.toggle('teacher-focus-active', active);
  });
  return new XMLSerializer().serializeToString(svg);
}
function diagramSVG(prefix, narrow) {
  const layout = PELE_CACHE.layouts[prefix] || PELE_CACHE.layouts.read;
  return teacherFocusPele(layout[narrow ? 'narrow' : 'wide'], diagramPath);
}
function diagramExplanation() {
  return PELE_CACHE.captions[diagramPath] || PELE_CACHE.captions.all;
}
function visualSVG(narrow) {
  const scene = teacherSceneEntry(), mode = narrow ? 'narrow' : 'wide', focus = effectiveVisualFocus();
  return teacherFocusPele(scene.focusLayouts?.[focus]?.[mode] || scene.layouts[mode], focus);
}
function effectiveVisualFocus() {
  return currentCase === 4 && visualFocus === 'all' ? 'before' : visualFocus;
}
function teacherSceneEntry() {
  const scene = PELE_WORKBENCH.scenes[currentCase];
  const variant = currentCase === 0 && longLabels ? 'long' : currentCase === 4 ? effectiveVisualFocus() : currentCase === 5 ? 'frame' + visualStep : 'default';
  return scene.variants?.[variant] || scene;
}
function visualTakeaway() {
  const scene = teacherSceneEntry();
  if (currentCase === 5 && scene.globalTakeaway) return scene.globalTakeaway;
  return scene.captions[effectiveVisualFocus()] || scene.captions.all;
}

function jsonBlock(id, value) {
  return '<script id="' + id + '" type="application/json">' + JSON.stringify(value).replace(/</g, '\\u003c') + '</script>';
}
function readerThemeCSS(config) {
  const declarations = tokens => Object.entries(tokens).map(([name, value]) => '--reader-' + name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()) + ':' + value).join(';');
  const fonts = Object.entries(config.fonts).map(([name, value]) => '--reader-font-' + name + ':' + value).join(';');
  return [
    ':root{' + declarations(config.themes[config.default].tokens) + ';' + fonts + ';color-scheme:light;--paper:var(--reader-canvas);--white:var(--reader-surface);--surface:var(--reader-surface);--ink:var(--reader-ink);--muted:var(--reader-muted);--soft:var(--reader-muted);--line:var(--reader-line);--accent:var(--reader-accent);--green:var(--reader-accent);--wash:var(--reader-accent-soft);--ui:var(--reader-font-ui);--reading:var(--reader-font-reading);--book:var(--reader-font-reading);--mono:var(--reader-font-mono)}',
    ...Object.entries(config.themes).map(([id, theme]) => ':root[data-reader-theme="' + id + '"]{' + declarations(theme.tokens) + ';color-scheme:' + theme.scheme + '}'),
    'html,body,.app-header,header,footer,.reader,.reader-view,.reading-footer,.source-mode,.outline-dialog,dialog,.explanation,.explanation-pane,.workspace{background:var(--reader-canvas);color:var(--reader-ink)}',
    '.sidebar,.mobile-head,.source-toolbar,.comparison-toolbar,.mobile-tabs,.source-demo-head,.sample-label,.source-tools,.demo-source-nav{background:var(--reader-surface-alt);color:var(--reader-muted)}',
    '.source-panel,.source-pane,.sample-frame,.sample-body,.source-demo,.type-popover,.demo-source-viewport,.qa-workshop textarea,.reader-settings-dialog{background:var(--reader-surface);color:var(--reader-ink)}',
    '.lesson h1,.lesson h2,.lesson .prose h2,.page-head h1,.sample-body h2,.sample-body h3,.outline-course h3,.reader-settings-dialog h2{font-family:var(--reader-font-reading);font-weight:500;color:var(--reader-ink);letter-spacing:0}',
    '.lesson .prose,.lesson .lede,.lesson .thought,.reader-copy{font-family:var(--reader-font-reading);font-weight:400;color:var(--reader-ink)}',
    '.lesson .prose strong,.reader-copy strong,.sample-notes strong{font-weight:500;color:var(--reader-ink)}',
    '.lesson .prose h2{font-size:23px}.lesson h1{font-weight:500}.lesson .lede{color:var(--reader-muted)}',
    '.thought,.key-thought,.instruction,.source-callout,.sample-frame{border-left:0}.thought,.key-thought,.instruction{padding-left:0;color:var(--reader-ink)}.sample-frame{border-top:0}.sample-label{border-bottom:1px solid var(--reader-line);background:transparent}.diagram-heading strong{font-weight:500}',
    '.eyebrow,.step-eyebrow,.step-eyebrow b,.eyebrow b,.step-count,.count,.course,.course-name,.header-label,.prototype-note,.footer-note,.note,.endnote,.lesson-end,.annotation,.source-hint,.source-callout p,.request .sub,.request-note .request-small,.request small,.outline-end p,.outline-course p,.outline-step span:first-child,.outline-step span:last-child,.source-location,.anchor-description,.source-origin,.source-orientation,.snapshot,.source-snapshot,.source-bottom,.reading-cue,.footnote,.sample-notes,.sample-notes dt,.sample-notes h2,.acceptance,.page-head>p,.workshop-label,.sidebar-sub,.sidebar-foot,.scenario-row p,.scope-note,.future-list,.cache-figure figcaption,.figure figcaption,.viz-frame figcaption,.diagram-heading span,.cache-figure .path-explanation,.viz-takeaway,.explanation-label,.source-demo-head,.source-demo-head .source-step,.demo-source-path small,.qa-hint-line,.qa-state,.qa-hints,.qa-workshop details,.lesson details,.demo-source-status,.source-tools [role=status],.diagram-provenance,.teacher-diagram-credit{color:var(--reader-muted)!important}',
    'h1,h2,h3,.lesson strong,.filename,.file-name,.source-demo-head strong,.source-current p,.diagram-heading strong,.sample-body th,.source-toolbar .label strong,.comparison-title strong,.qa-fieldset legend,.qa-workshop legend{color:var(--reader-ink)}',
    '.source-toolbar>span:last-child,.comparison-toolbar>span:last-child{color:var(--reader-muted)!important}',
    '.brand-mark,.brand-sign,.mark,.source-button,.source-entry,.source-home,.demo-source-nav button,.history button,.source-history .plain,.small-button,.sample-button,.design-controls button,.next,.next:not(:disabled),.qa-check,.qa-retry:not(:disabled),.qa-actions button,.source-tools button,.path-selector button,.long-label-control,.outline-reset,.reset,.reset-confirm button,.return-reader,.source-inline,.symbol,.code-symbol,.lesson summary,.sample-body summary,.source-demo-head strong,a{color:var(--reader-accent)}',
    '.plain,.sample-button.secondary,.qa-retry,.design-controls button,.file-button,.source-file,.demo-file-tabs button,.source-inline,.symbol,.code-symbol,.path-selector button{background:transparent}',
    '.plain:not(:disabled):hover,.sample-button.secondary:not(:disabled):hover,.qa-retry:not(:disabled):hover,.file-button:hover,.source-file:hover,.demo-file-tabs button:hover,.path-selector button:hover,.source-tools button:hover,.source-inline:hover,.symbol:hover,.code-symbol:hover,.design-controls button:hover{background:var(--reader-surface-alt)}',
    '.next,.sample-button.primary,.qa-check,.source-home,.source-context,.source-state-label,.source-tools button[aria-pressed=true],.component-nav button[aria-current=page],.case-switcher button[aria-pressed=true],.path-selector button[aria-pressed=true],.design-controls button[aria-pressed=true],.small-button[aria-pressed=true],.outline-step[aria-current=step],.file-button[aria-pressed=true],.source-file[aria-pressed=true],.demo-file-tabs button[aria-pressed=true],.mobile-tabs button[aria-selected=true],.mobile-compare-tabs button[aria-selected=true],.type-option[aria-pressed=true]{background:var(--reader-accent-soft);border-color:var(--reader-figure-border);color:var(--reader-accent);font-weight:500}',
    '.next:not(:disabled):hover,.sample-button.primary:not(:disabled):hover,.qa-check:not(:disabled):hover{background:var(--reader-accent-soft);color:var(--reader-accent)}',
    '.file-button[aria-pressed=true],.demo-file-tabs button[aria-pressed=true]{box-shadow:inset 0 -2px var(--reader-accent)}.source-context[data-exploring=true]{background:var(--reader-surface-alt);border-color:var(--reader-line);color:var(--reader-ink)}',
    '.code-line code,.demo-code-line code,.code-scroll,.demo-source-viewport,.qa-workshop pre,.lesson pre{color:var(--reader-ink);background:var(--reader-surface)}.code-key,.source-key{color:var(--reader-code-keyword)}.code-string,.source-string{color:var(--reader-code-string)}.code-number{color:var(--reader-code-number)}.line-number,.demo-line-number,.code-comment{color:var(--reader-muted)}',
    '.code-line.focused,.demo-code-line.target{background:var(--reader-accent-soft);border-left-color:var(--reader-accent)}.code-line.focused .line-number{color:var(--reader-accent);font-weight:500}',
    '.code-line>code,.demo-code-line>code{background:transparent}',
    '.prose code,.reader-copy code,.inline-code,.qa-workshop pre,.lesson pre{background:var(--reader-surface-alt);color:var(--reader-ink)}',
    '.qa-component .choice,.qa-choice,.question-choice,.choice{background:var(--reader-surface);border-color:var(--reader-line);color:var(--reader-ink)}.qa-component .choice[data-selected=true],.qa-choice:has(input:checked),.question-choice[aria-pressed=true],.choice[aria-pressed=true]{background:var(--reader-accent-soft);border-color:var(--reader-accent)}.qa-component .choice[data-evaluated=true][data-correct=false]{background:var(--reader-bad-soft);border-color:var(--reader-bad)}',
    '.qa-feedback,.qa-output{background:var(--reader-surface-alt);border-left:0;color:var(--reader-ink)}.qa-feedback strong,.qa-feedback p,.qa-output strong{color:var(--reader-ink)}.choice-index{color:var(--reader-muted)}input{accent-color:var(--reader-accent)}',
    '.figure,.request,.request-note,.definition,.source-callout,.source-navigation,.source-current,.source-bottom,.source-tools,.source-heading,.source-orientation,.files,.source-files,.source-demo,.demo-source-head,.demo-file-tabs,.demo-source-nav,.demo-source-status,.demo-source-path,.qa-workshop textarea,.qa-choice,.choice,.question-choice,.outline-step,.scenario-row,.scope-note,.sample-frame,.case-switcher,.mobile-head,header,footer,.sidebar,.comparison-toolbar,.source-toolbar,.explanation,.explanation-pane,.reading-divider:before,.reading-divider:after,.sample-body td,.sample-body th,.source-tools{border-color:var(--reader-line)}',
    '.sample-body th,.source-demo-head,.mobile-tabs,.mobile-compare-tabs,.design-controls,.missing-source{background:var(--reader-surface-alt)}.missing-source h3,.missing-source p{color:var(--reader-ink)}.source-home,.small-button,.sample-button,.design-controls button,.case-switcher button{border-color:var(--reader-line)}',
    '.plain:disabled,.next:disabled,.qa-actions button:disabled,.sample-button:disabled,.source-tools button:disabled,.demo-source-nav button:disabled{background:transparent!important;color:var(--reader-muted)!important;border-color:var(--reader-line);opacity:.48}.plain:disabled:hover{background:transparent}',
    '.step-dot,.dot{background:var(--reader-line)}.step-dot.current,.dot.current,.header-progress,.progress-line,.step-dot.read,.dot.read{background:var(--reader-accent)}.eyebrow i,.small-line,.step-eyebrow .small-line,.endline,.end-mark,.hairline{background:var(--reader-line)}',
    'button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible,summary:focus-visible,[tabindex]:focus-visible,.qa-component .choice:focus-within,.qa-choice:focus-within{outline-color:var(--reader-accent)}.source-inline,.symbol,.code-symbol,.source-button,.source-entry{border-bottom-color:var(--reader-figure-border)}',
    '.notice,.resume-notice{background:var(--reader-ink);color:var(--reader-canvas)}.notice button,.resume-notice button{color:var(--reader-canvas)}.warning,.storage-warning{background:var(--reader-bad-soft);color:var(--reader-bad)}',
    'svg[data-teacher-renderer="pele"] [data-teacher-observed="true"]>:is(rect,path,polygon,ellipse,circle){fill:var(--reader-accent-soft)!important;stroke:var(--reader-accent)!important;stroke-width:2px}',
    'dialog.reader-settings-dialog{margin:auto;inset:0;width:min(440px,calc(100vw - 32px));height:auto;max-height:calc(100dvh - 40px);padding:27px;border:1px solid var(--reader-line);border-radius:8px;background:var(--reader-surface);color:var(--reader-ink)}.reader-settings-dialog::backdrop{background:#14141366;backdrop-filter:blur(2px)}',
    '.reader-settings-head{display:flex;align-items:center;justify-content:space-between;gap:20px}.reader-settings-head h2{font-size:27px;line-height:1.6;margin:0}.reader-settings-close{min-width:42px;min-height:42px;border:0;background:transparent;color:var(--reader-muted);font-size:18px}.reader-settings-dialog p{font:14px/1.95 var(--reader-font-ui);color:var(--reader-muted);margin:16px 0 21px}.reader-settings-dialog fieldset{border:0;margin:0;padding:0;min-width:0}.reader-settings-dialog legend{font:12px/1.8 var(--reader-font-ui);color:var(--reader-muted);margin-bottom:12px}.reader-theme-choice{display:flex;align-items:center;gap:14px;min-height:72px;padding:12px 14px;margin:8px 0;border:1px solid var(--reader-line);border-radius:5px;cursor:pointer}.reader-theme-choice:has(input:checked){border-color:var(--reader-accent);background:var(--reader-accent-soft)}.reader-theme-choice input{width:18px;height:18px;flex:none;margin:0;accent-color:var(--reader-accent)}.reader-theme-choice strong{font:500 21px/1.5 var(--reader-font-reading);color:var(--reader-ink);display:block}.reader-theme-choice small{font:12px/1.8 var(--reader-font-ui);color:var(--reader-muted);display:block}.reader-theme-swatch{width:31px;height:42px;border:1px solid var(--reader-line);border-radius:2px;margin-left:auto;flex:none;font:18px/40px var(--reader-font-reading);text-align:center}.teacher-settings-trigger{min-height:42px;border:0;background:transparent;color:var(--reader-muted);padding:9px 11px;font:13px var(--reader-font-ui)}.teacher-settings-trigger:hover{background:var(--reader-surface-alt)}.reader-settings-status{font-size:12px!important;margin-bottom:0!important;min-height:22px}.workshop-label .teacher-settings-trigger{margin-left:auto;white-space:nowrap}',
    '@media(max-width:520px){.teacher-settings-trigger{font-size:12px;padding-inline:9px}.reader-settings-dialog{padding:22px!important}.lesson .prose h2{font-size:22px}.reader-theme-choice{min-height:76px}.reader-settings-head h2{font-size:26px}.workshop-label{align-items:center}.source-heading .source-home{background:var(--reader-accent-soft)}}',
  ].join('\n');
}
function readerSettingsHTML(config) {
  return '<dialog id="reader-settings" class="reader-settings-dialog" aria-labelledby="reader-settings-title"><div class="reader-settings-head"><h2 id="reader-settings-title">阅读设置</h2><button type="button" class="reader-settings-close" data-reader-settings-close aria-label="关闭阅读设置">×</button></div><p>选择适合此刻的纸面。课程内容、阅读位置和已答问题会保持不变。</p><fieldset><legend>纸面主题</legend>' + Object.entries(config.themes).map(([id, theme]) => '<label class="reader-theme-choice"><input type="radio" name="teacher-reader-theme" value="' + id + '" data-reader-theme-choice><span><strong>' + theme.name + '</strong><small>' + theme.description + '</small></span><span class="reader-theme-swatch" aria-hidden="true" style="background:' + theme.tokens.canvas + ';color:' + theme.tokens.ink + '">阅</span></label>').join('') + '</fieldset><p class="reader-settings-status" id="reader-settings-status" role="status">外观设置独立于学习进度保存在当前浏览器。</p></dialog>';
}
function initializeReaderAppearance() {
  const config = JSON.parse(document.getElementById('teacher-reader-theme-data').textContent);
  const key = 'teacher-reader.appearance.v1', root = document.documentElement, dialog = document.getElementById('reader-settings');
  const choiceSelector = 'input[type="radio"][name="teacher-reader-theme"][data-reader-theme-choice]';
  let chosen = config.default, opener = null;
  try { const saved = JSON.parse(localStorage.getItem(key) || 'null'); if (saved && Object.hasOwn(config.themes, saved.theme)) chosen = saved.theme; } catch (error) {}
  function apply(id, persist) {
    if (!Object.hasOwn(config.themes, id)) return;
    chosen = id; root.dataset.readerTheme = id; root.style.colorScheme = config.themes[id].scheme;
    dialog.querySelectorAll(choiceSelector).forEach(input => { input.checked = input.value === id; });
    if (persist) {
      try { localStorage.setItem(key, JSON.stringify({ theme: id })); document.getElementById('reader-settings-status').textContent = '已保存外观设置，学习位置保持不变。'; }
      catch (error) { document.getElementById('reader-settings-status').textContent = '主题仅在本次打开中生效；浏览器未允许保存设置。'; }
    }
  }
  function close() { dialog.close(); if (opener && opener.isConnected) opener.focus({ preventScroll: true }); }
  apply(chosen, false);
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const trigger = target.closest('[data-reader-settings]');
    if (trigger) { opener = trigger; dialog.showModal(); return; }
    if (target.closest('[data-reader-settings-close]')) close();
  });
  dialog.addEventListener('change', event => {
    const input = event.target;
    if (input instanceof HTMLInputElement && dialog.contains(input) && input.matches(choiceSelector) && input.checked && Object.hasOwn(config.themes, input.value)) apply(input.value, true);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && dialog.open) { event.preventDefault(); event.stopImmediatePropagation(); close(); } }, true);
}
function applyReaderAppearance(html, kind) {
  html = replaceBlock(html, 'teacher-reader-appearance-data', jsonBlock('teacher-reader-theme-data', readerThemeConfig) + '\n' + readerSettingsHTML(readerThemeConfig));
  const style = '<style id="teacher-reader-theme-style">\n' + readerThemeCSS(readerThemeConfig) + '\n</style>';
  const stylePattern = /<style id="teacher-reader-theme-style">[\s\S]*?<\/style>/;
  html = stylePattern.test(html) ? html.replace(stylePattern, style) : html.replace('</head>', style + '\n</head>');
  const runtime = '/* teacher-reader-appearance:start */\n' + initializeReaderAppearance.toString() + '\ninitializeReaderAppearance();\n/* teacher-reader-appearance:end */';
  const runtimePattern = /\/\* teacher-reader-appearance:start \*\/[\s\S]*?\/\* teacher-reader-appearance:end \*\//;
  html = runtimePattern.test(html) ? html.replace(runtimePattern, runtime) : html.replace('"use strict";', '"use strict";\n' + runtime);
  if (!html.includes('class="teacher-settings-trigger"')) {
    const button = '<button class="teacher-settings-trigger" data-reader-settings aria-haspopup="dialog">阅读设置</button>';
    html = kind === 'course' ? html.replace('<button class="plain" id="outline-open"', button + '<button class="plain" id="outline-open"') : html.replace('</span></div><section class="page-head">', '</span>' + button + '</div><section class="page-head">');
  }
  return html;
}
function replaceBlock(html, id, body) {
  const start = '<!-- ' + id + ':start -->', end = '<!-- ' + id + ':end -->';
  const a = html.indexOf(start), b = html.indexOf(end);
  if (a >= 0 && b >= a) return html.slice(0, a) + start + '\n' + body + '\n' + end + html.slice(b + end.length);
  return html.replace('<script>\n"use strict";', start + '\n' + body + '\n' + end + '\n<script>\n"use strict";');
}
const sharedStyle = '.teacher-focus-muted{opacity:.22}.teacher-focus-active{opacity:1}.cache-figure svg[data-teacher-renderer="pele"],.viz-frame svg[data-teacher-renderer="pele"]{width:auto;max-width:100%;height:auto;margin-inline:auto;font-size:16px}.teacher-diagram-credit{font:11px/1.8 var(--ui);color:#536e7b;margin-top:12px}.teacher-pele-projection{margin:24px 0 30px}.teacher-pele-projection>p{font:13px/1.9 var(--ui);color:#536e7b;margin:0 0 12px}.teacher-pele-projections{display:none}@media(max-width:760px){.viz-frame>.teacher-pele-projections{display:block}}';
function insertStyle(html) {
  const marker = '/* teacher-pele-style */', start = html.indexOf(marker);
  if (start >= 0) {
    const end = html.indexOf('/* /teacher-pele-style */', start);
    return html.slice(0, start) + marker + '\n' + sharedStyle + '\n/* /teacher-pele-style */' + html.slice(end + '/* /teacher-pele-style */'.length);
  }
  return html.replace('</style>', marker + '\n' + sharedStyle + '\n/* /teacher-pele-style */\n</style>');
}
function scopeLegacyStyles(html) {
  // Keep temporary legacy figures readable without styling Pele's node classes.
  return html.replace(/\.viz-frame \.(node|node-strong|edge|node-text|node-sub|edge-text|boundary|boundary-text|node-number|dim|active)(?=[\s{.])/g, '.viz-frame svg.teacher-legacy .$1')
    .replace(/\.cache-figure \.diagram-node/g, '.cache-figure svg.teacher-legacy .diagram-node');
}
function checkGeneratedXML(values) {
  // Optional authoring regression gate; normal generation needs only Node.
  // ElementTree is a real XML parser, including for the composed projection roots.
  const documents = [], seen = new Set();
  function collect(value, location) {
    if (typeof value === 'string' && (value.startsWith('<svg ') || value.startsWith('<div class="teacher-pele-projections"'))) {
      if (!seen.has(value)) { seen.add(value); documents.push({ location, xml: value }); }
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) collect(child, location + '.' + key);
    }
  }
  values.forEach((value, index) => collect(value, 'bank' + index));
  const regression = [
    'import json,sys,xml.etree.ElementTree as ET',
    'documents=json.load(sys.stdin)',
    'for item in documents:',
    '    try: ET.fromstring(item["xml"])',
    '    except ET.ParseError as error: raise SystemExit(item["location"]+": "+str(error))',
    'bad=\'<svg xmlns="http://www.w3.org/2000/svg"><path data-id="Browser"/ data-teacher-part="api"></svg>\'',
    'try: ET.fromstring(bad)',
    'except ET.ParseError: pass',
    'else: raise SystemExit("Regression control failed: malformed self-closing attribute was accepted")',
    'print("Real XML parser passed "+str(len(documents))+" generated SVG/projection variants; malformed-attribute control rejected.")',
  ].join('\n');
  const result = spawnSync('python3', ['-c', regression], { input: JSON.stringify(documents), encoding: 'utf8', maxBuffer: 4_000_000 });
  if (result.error || result.status !== 0) throw new Error('XML regression check failed: ' + (result.error?.message || result.stderr || result.stdout));
  process.stdout.write(result.stdout);
}

const cacheData = { captions: cacheScene.captions, source: {}, layouts: {} };
for (const prefix of ['read', 'compare']) {
  cacheData.layouts[prefix] = {};
  for (const [mode, width] of Object.entries(widths)) {
    const { source, svg } = flowLayout(cacheScene, 'teacher-course-' + prefix + '-' + mode, width, mode);
    cacheData.source[mode] = source;
    cacheData.layouts[prefix][mode] = svg.replace(' ' + mode + '"', ' diagram-' + mode + '"');
  }
}
const architecture = buildFlow(architectureScene, 'teacher-workbench-architecture');
addFlowProjection(architecture, 'all', [
  projectFlow(architectureScene, ['browser', 'api', 'store'], '请求与保存职责'),
  projectFlow(architectureScene, ['api', 'queue', 'worker'], '事件与后台职责'),
], 'teacher-workbench-architecture');
addFlowProjection(architecture, 'request', [projectFlow(architectureScene, ['browser', 'api'], '请求侧职责')], 'teacher-workbench-architecture');
addFlowProjection(architecture, 'data', [projectFlow(architectureScene, ['api', 'store', 'queue', 'worker'], '数据与后台职责')], 'teacher-workbench-architecture');
const longArchitectureScene = { ...architectureScene, nodes: architectureScene.nodes.map(node => node[0] === 'api' ? [node[0], '订单接入与请求校验<br/>Order API', ...node.slice(2)] : node) };
const longArchitecture = buildFlow(longArchitectureScene, 'teacher-workbench-architecture-long');
addFlowProjection(longArchitecture, 'all', [
  projectFlow(longArchitectureScene, ['browser', 'api', 'store'], '请求与保存职责'),
  projectFlow(longArchitectureScene, ['api', 'queue', 'worker'], '事件与后台职责'),
], 'teacher-workbench-architecture-long');
architecture.variants = { long: longArchitecture };
const flow = buildFlow(flowScene, 'teacher-workbench-flow', { wide: widths.wide });
addFlowProjection(flow, 'all', [
  projectFlow(flowScene, ['query', 'cache', 'hit', 'load', 'found', 'saved'], '成功出口'),
  projectFlow(flowScene, ['query', 'cache', 'load', 'found', 'error'], '未命中且书籍不存在'),
], 'teacher-workbench-flow');
addFlowProjection(flow, 'success', [projectFlow(flowScene, ['query', 'cache', 'hit', 'load', 'found', 'saved'], '成功路径')], 'teacher-workbench-flow');
addFlowProjection(flow, 'failure', [projectFlow(flowScene, ['query', 'cache', 'load', 'found', 'error'], '错误路径')], 'teacher-workbench-flow');
flow.layouts.narrow = flow.focusLayouts.all.narrow;
const workbenchData = { renderer: 'pele', version: '1.9.0', license: 'MIT', scenes: {
  0: architecture,
  1: flow,
  2: buildSequence(sequenceScene, 'teacher-workbench-sequence'),
  3: buildState(stateScene, 'teacher-workbench-state'),
  4: { variants: { before: buildFlow(comparisonScene(false), 'teacher-workbench-before'), after: buildFlow(comparisonScene(true), 'teacher-workbench-after') } },
  5: { variants: Object.fromEntries([0, 1, 2].map(index => ['frame' + index, buildFlow(algorithmScene(index), 'teacher-workbench-algorithm-' + index)])) },
} };
const courseMotion = { specs: {
  'cache-miss': flowTrace(cacheScene, 'cache-miss', '第一次：未命中路径', ['query', 'cache', 'load', 'save', 'result']),
  'cache-hit': flowTrace(cacheScene, 'cache-hit', '第二次：命中路径', ['query', 'cache', 'hit']),
} };
const workbenchMotion = { specs: {
  'flow-miss': flowTrace(flowScene, 'flow-miss', '未命中后找到书', ['query', 'cache', 'load', 'found', 'saved']),
  'flow-hit': flowTrace(flowScene, 'flow-hit', '命中的返回近路', ['query', 'cache', 'hit']),
  'flow-failure': flowTrace(flowScene, 'flow-failure', '未命中且书籍不存在', ['query', 'cache', 'load', 'found', 'error']),
  'state-complete': stateTrace(stateScene, 'state-complete', '一次重试后完成', ['waiting', 'processing', 'failed', 'processing', 'done']),
  'state-retry': stateTrace(stateScene, 'state-retry', '还有次数时回到处理', ['waiting', 'processing', 'failed', 'processing']),
  'state-stop': stateTrace(stateScene, 'state-stop', '失败后终止', ['waiting', 'processing', 'failed', 'stopped']),
  algorithm: {
    key: 'algorithm', title: '按索引观察，不运行任意代码', mode: 'algorithm', teachingOnly: true,
    frames: [0, 1, 2].map(index => ({ node: 'a' + index, edge: null, text: algorithmScene(index).captions.all })),
  },
} };
if (process.argv.includes('--check-xml')) checkGeneratedXML([cacheData, workbenchData]);

const coursePath = new URL('teacher-reader-prototype.html', directory);
let course = await readFile(coursePath, 'utf8');
course = replaceBlock(course, 'teacher-pele-cache', jsonBlock('teacher-pele-cache-data', cacheData));
const courseStart = course.indexOf('function diagramPart(') >= 0 ? course.indexOf('function diagramPart(') : course.indexOf('/* teacher-pele-course-runtime:start */');
const courseEnd = course.indexOf('\nfunction diagram(prefix)', courseStart);
if (courseStart < 0 || courseEnd < 0) throw new Error('Course diagram integration boundary not found');
course = course.slice(0, courseStart) + '/* teacher-pele-course-runtime:start */\nconst PELE_CACHE=JSON.parse(document.getElementById("teacher-pele-cache-data").textContent);\n' + teacherFocusPele.toString() + '\n' + diagramSVG.toString() + '\n' + diagramExplanation.toString() + '\n/* teacher-pele-course-runtime:end */' + course.slice(courseEnd);
course = insertStyle(scopeLegacyStyles(course));
course = applyReaderAppearance(course, 'course');
course = integrateTeachingMotion(course, 'course', courseMotion);
await writeFile(coursePath, course);

const workbenchPath = new URL('teacher-reader-components-prototype.html', directory);
let workbench = await readFile(workbenchPath, 'utf8');
workbench = replaceBlock(workbench, 'teacher-pele-workbench', jsonBlock('teacher-pele-workbench-data', workbenchData));
if (!workbench.includes('function legacyVisualSVG(')) workbench = workbench.replace('function visualSVG(narrow){', 'function legacyVisualSVG(narrow){');
const runtimeStart = '/* teacher-pele-workbench-runtime:start */', runtimeEnd = '/* teacher-pele-workbench-runtime:end */';
const runtime = runtimeStart + '\nconst PELE_WORKBENCH=JSON.parse(document.getElementById("teacher-pele-workbench-data").textContent);\n' + teacherFocusPele.toString() + '\n' + effectiveVisualFocus.toString() + '\n' + teacherSceneEntry.toString() + '\n' + visualSVG.toString() + '\n' + visualTakeaway.toString() + '\n' + runtimeEnd;
const ra = workbench.indexOf(runtimeStart), rb = workbench.indexOf(runtimeEnd);
if (ra >= 0 && rb > ra) workbench = workbench.slice(0, ra) + runtime + workbench.slice(rb + runtimeEnd.length);
else workbench = workbench.replace('function visualData(){', runtime + '\nfunction visualData(){');
const legacyStart = workbench.indexOf('function vizClass('), legacyEnd = workbench.indexOf(runtimeStart);
if (legacyStart >= 0 && legacyEnd > legacyStart) workbench = workbench.slice(0, legacyStart) + workbench.slice(legacyEnd);
const oldTakeawayStart = workbench.indexOf('function visualTakeaway(){'), oldTakeawayEnd = workbench.indexOf('\nfunction visualNotes(){', oldTakeawayStart);
if (oldTakeawayStart >= 0 && oldTakeawayEnd > oldTakeawayStart) workbench = workbench.slice(0, oldTakeawayStart) + workbench.slice(oldTakeawayEnd);
workbench = workbench.replace('按索引从左向右看当前元素，与目标值 6 比较。', '按索引顺序看当前元素，与目标值 6 比较。');
if (!workbench.includes('Pele 1.9.0 · MIT</span>')) workbench = workbench.replace('<span>设计样本，不代表已接入课程</span>', '<span>设计样本 · 图示 Pele 1.9.0 · MIT</span>');
workbench = insertStyle(scopeLegacyStyles(workbench));
workbench = applyReaderAppearance(workbench, 'workbench');
workbench = integrateTeachingMotion(workbench, 'workbench', workbenchMotion);
await writeFile(workbenchPath, workbench);
console.log('Generated course cache flow and all six workbench diagram families with Pele 1.9.0.');
console.log('Rebuild: node ' + fileURLToPath(import.meta.url));
