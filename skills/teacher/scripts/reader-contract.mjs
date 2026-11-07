import { createHash } from 'node:crypto';

const own = (object, key) => Object.hasOwn(object, key);
const fail = (message) => {
  throw new TypeError(`Teacher course: ${message}`);
};
const id = (value, where) =>
  typeof value === 'string' &&
  /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value) &&
  !['constructor', 'prototype', '__proto__'].includes(value)
    ? value
    : fail(`${where} needs a stable letters/digits/-/_ id`);
const text = (value, where) =>
  typeof value === 'string' && value.trim()
    ? value
    : fail(`${where} must be nonempty text`);
const object = (value, where) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : fail(`${where} must be an object`);
const unique = (items, where) => {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item)) fail(`${where}: duplicate ${item}`);
    seen.add(item);
  }
};
const decode = (value) =>
  value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|(amp|lt|gt|quot|apos));/gi,
    (_, dec, hex, name) =>
      dec || hex
        ? String.fromCodePoint(Number.parseInt(dec || hex, dec ? 10 : 16))
        : { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[
            name.toLowerCase()
          ],
  );
export const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export const scriptJSON = (value) =>
  JSON.stringify(value).replace(
    /[<\u2028\u2029]/g,
    (c) => ({ '<': '\\u003c', '\u2028': '\\u2028', '\u2029': '\\u2029' })[c],
  );

const markupTokens =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\/?([A-Za-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/g;

function tags(html) {
  return [...html.matchAll(markupTokens)]
    .filter((m) => m[1] && !m[0].startsWith('</'))
    .map((m) => ({
      name: m[1].toLowerCase(),
      attrs: Object.fromEntries(
        [
          ...m[2].matchAll(
            /([^\s=/'"<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g,
          ),
        ].map((a) => [a[1].toLowerCase(), decode(a[2] ?? a[3] ?? a[4])]),
      ),
    }));
}

// Course prose is authored HTML, not an HTML sanitizer for arbitrary imported pages.
// Repository contents belong in sources[].text, which the reader always escapes.
function validateBody(body, where, sourceTarget, diagrams) {
  const mounted = [];
  for (const tag of tags(body)) {
    if (
      [
        'script',
        'style',
        'iframe',
        'object',
        'embed',
        'form',
        'input',
        'textarea',
        'select',
        'link',
        'base',
        'meta',
        'svg',
        'math',
        'video',
        'audio',
        'source',
      ].includes(tag.name)
    )
      fail(
        `${where}: use prose, embedded images, or the reader's diagram/interaction fields instead of <${tag.name}>`,
      );
    for (const [key, value] of Object.entries(tag.attrs)) {
      if (key === 'id' || key.startsWith('on'))
        fail(`${where}: reader owns DOM ids and events (${key})`);
      if (
        ['href', 'xlink:href'].includes(key) &&
        !/^(https?:\/\/|mailto:|#[A-Za-z0-9_-]+$)/i.test(value)
      )
        fail(`${where}: unsafe link`);
      if (
        ['src', 'poster', 'srcset'].includes(key) &&
        (key === 'srcset' ||
          !/^data:image\/(?:png|jpeg|webp|gif|svg\+xml);(?:base64|utf8|charset=)/i.test(
            value,
          ))
      )
        fail(`${where}: embed image data, not an external asset`);
      if (key === 'style' && /url\s*\(|@import|expression\s*\(/i.test(value))
        fail(`${where}: external/executable styles are not course content`);
    }
    if (own(tag.attrs, 'data-source')) {
      if (tag.name !== 'button')
        fail(`${where}: source links must be keyboard-accessible buttons`);
      sourceTarget(
        {
          file: tag.attrs['data-source'],
          start: Number(tag.attrs['data-start'] || 1),
          end: Number(tag.attrs['data-end'] || tag.attrs['data-start'] || 1),
        },
        where + ' inline source',
      );
    }
    if (tag.attrs['data-teacher-diagram']) {
      const key = tag.attrs['data-teacher-diagram'];
      if (!own(diagrams, key)) fail(`${where}: missing diagram ${key}`);
      mounted.push(key);
    }
  }
  unique(mounted, where + ' diagram slots');
  const slots = [
    ...body.matchAll(
      /<div\b[^>]*\bdata-teacher-diagram\s*=\s*["']([A-Za-z0-9_-]+)["'][^>]*>\s*<\/div>/g,
    ),
  ].map((m) => m[1]);
  if (slots.join('|') !== mounted.join('|'))
    fail(`${where}: diagram slots must be empty div elements`);
}

export function normalizeCourse(raw) {
  object(raw, 'root');
  if (raw.version != null && raw.version !== 1)
    fail('unsupported version; expected 1');
  id(raw.id, 'course');
  text(raw.title, 'course title');
  const sources = Object.fromEntries(
    Object.entries(object(raw.sources || {}, 'sources')).map(
      ([file, input]) => {
        if (!file || /[\u0000-\u001f]/.test(file))
          fail('invalid source filename');
        const source =
          typeof input === 'string'
            ? { text: input }
            : object(input, `source ${file}`);
        if (typeof source.text !== 'string')
          fail(`${file}: text must contain the complete file`);
        const sha256 = createHash('sha256').update(source.text).digest('hex');
        if (source.sha256 && source.sha256 !== sha256)
          fail(`${file}: content hash mismatch`);
        return [
          file,
          {
            ...source,
            text: source.text,
            language: source.language || 'text',
            sha256,
            links: source.links || [],
            symbols: source.symbols || [],
          },
        ];
      },
    ),
  );
  const sourceTarget = (target, where) => {
    object(target, where);
    if (!own(sources, target.file))
      fail(`${where}: missing source ${target.file}`);
    const start = target.start ?? 1,
      end = target.end ?? start,
      lines = sources[target.file].text.split('\n').length;
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1 ||
      end < start ||
      end > lines
    )
      fail(
        `${where}: invalid source range ${target.file}:${start}-${end} (${lines} lines)`,
      );
    return { ...target, start, end };
  };
  for (const [file, source] of Object.entries(sources)) {
    if (!Array.isArray(source.links) || !Array.isArray(source.symbols))
      fail(`${file}: links/symbols must be arrays`);
    source.symbols = source.symbols.map((symbol) => {
      id(symbol.id, `${file} symbol`);
      text(symbol.label, 'symbol label');
      return {
        ...symbol,
        ...sourceTarget(
          { file, start: symbol.start, end: symbol.end },
          `symbol ${symbol.id}`,
        ),
      };
    });
    unique(
      source.symbols.map((s) => s.id),
      `${file} symbols`,
    );
    source.links = source.links
      .map((link) => {
        const token = text(link.token || link.label, `${file} link token`),
          line = link.line;
        if (
          !Number.isInteger(line) ||
          line < 1 ||
          !source.text.split('\n')[line - 1]?.includes(token)
        )
          fail(`${file}: jump token not found on line ${line}`);
        return {
          ...link,
          token,
          label: token,
          target: sourceTarget(link.target, `${file}:${line} jump`),
        };
      })
      .sort(
        (a, b) =>
          a.line - b.line ||
          source.text.split('\n')[a.line - 1].indexOf(a.token) -
            source.text.split('\n')[b.line - 1].indexOf(b.token),
      );
    let line = 0,
      cursor = 0;
    for (const link of source.links) {
      if (link.line !== line) {
        line = link.line;
        cursor = 0;
      }
      const at = source.text.split('\n')[line - 1].indexOf(link.token, cursor);
      if (at < 0)
        fail(`${file}:${line}: overlapping or exhausted source-link tokens`);
      cursor = at + link.token.length;
    }
  }
  const diagrams = object(raw.diagrams || {}, 'diagrams');
  for (const key of Object.keys(diagrams)) id(key, 'diagram');
  const runs = object(raw.runs || {}, 'runs');
  for (const [key, run] of Object.entries(runs)) {
    id(key, 'run');
    object(run, `run ${key}`);
    const status = run.outcome || run.status;
    if (
      ![
        'holds',
        'violated',
        'incomplete',
        'tool-error',
        'timeout',
        'unavailable',
        'not-checked',
      ].includes(status)
    )
      fail(`${key}: unknown check outcome ${status}`);
    if (['holds', 'violated'].includes(status)) {
      text(run.toolVersion, `${key} toolVersion`);
      text(run.logSource, `${key} logSource`);
      if (!own(sources, run.logSource)) fail(`${key}: missing original log`);
    }
    if (run.logSource && !own(sources, run.logSource))
      fail(`${key}: missing log source`);
  }
  const graphs = Object.fromEntries(
    Object.entries(object(raw.graphs || {}, 'graphs')).map(([key, input]) => {
      id(key, 'graph');
      const graph = object(input, `graph ${key}`);
      if (graph.diagram && !own(diagrams, graph.diagram))
        fail(`${key}: missing graph diagram`);
      if (
        !Array.isArray(graph.states) ||
        !graph.states.length ||
        !Array.isArray(graph.edges)
      )
        fail(`${key}: states and edges are required arrays`);
      const states = graph.states.map((s) => ({
        ...s,
        id: String(s.id),
        variables: object(s.variables || {}, `${key} state variables`),
      }));
      states.forEach((s) => id(s.id, `${key} state`));
      unique(
        states.map((s) => s.id),
        `${key} states`,
      );
      if (graph.projection) {
        const nodes = graph.projection.nodes;
        if (!Array.isArray(nodes) || !nodes.length)
          fail(`${key}: projection needs nodes`);
        const memberships = new Map();
        nodes.forEach((node) => {
          id(node.id, `${key} projected node`);
          if (!Array.isArray(node.members) || !node.members.length)
            fail(`${key}: projected node has no concrete members`);
          node.members.forEach((member) => {
            if (memberships.has(member))
              fail(`${key}: concrete state has multiple projected nodes`);
            memberships.set(member, node.id);
          });
        });
        unique(
          nodes.map((n) => n.id),
          `${key} projected nodes`,
        );
        if (
          memberships.size !== states.length ||
          states.some((s) => memberships.get(s.id) !== s.diagramNode)
        )
          fail(`${key}: projection does not match concrete states`);
      }
      const stateIds = new Set(states.map((s) => s.id));
      const edges = graph.edges.map((e, i) => ({
        ...e,
        id: e.id == null ? `e${i}` : String(e.id),
        from: String(e.from),
        to: String(e.to),
        action: text(e.action || e.label, `${key} action`),
        ...(e.source
          ? { source: sourceTarget(e.source, `${key} edge source`) }
          : {}),
      }));
      unique(
        edges.map((e) => e.id),
        `${key} edges`,
      );
      for (const edge of edges) {
        id(edge.id, 'edge');
        if (!stateIds.has(edge.from) || !stateIds.has(edge.to))
          fail(`${key}: edge references a missing state`);
      }
      const initialStates = graph.initialStates || [
        graph.initialState ?? states[0].id,
      ];
      if (
        !Array.isArray(initialStates) ||
        !initialStates.length ||
        initialStates.some((s) => !stateIds.has(String(s)))
      )
        fail(`${key}: invalid initial state`);
      if (graph.runId && !own(runs, graph.runId))
        fail(`${key}: missing graph export run`);
      const basis = graph.basis || (graph.runId ? 'tlc' : 'illustrative');
      if (!['tlc', 'illustrative'].includes(basis))
        fail(`${key}: unknown graph basis`);
      if (basis === 'tlc' && !graph.runId)
        fail(`${key}: TLC graph needs its actual run`);
      if (basis === 'tlc') {
        const run = runs[graph.runId];
        if (
          !['holds', 'violated', 'incomplete'].includes(
            run.outcome || run.status,
          ) ||
          !run.logSource ||
          !run.toolVersion
        )
          fail(`${key}: graph needs actual TLC export evidence`);
      }
      const traces = (graph.traces || []).map((trace) => {
        id(trace.id, `${key} trace`);
        if (
          !Array.isArray(trace.states) ||
          !trace.states.length ||
          trace.states.some((s) => !stateIds.has(String(s)))
        )
          fail(`${key}: trace references missing states`);
        const route = trace.states.map(String);
        if (!initialStates.map(String).includes(route[0]))
          fail(`${key}: trace must start at a declared initial state`);
        if (
          trace.edges &&
          (!Array.isArray(trace.edges) ||
            trace.edges.length !== route.length - 1)
        )
          fail(`${key}: trace edge count does not match states`);
        const edgeIds = [];
        for (let i = 1; i < route.length; i++) {
          const candidates = edges.filter(
            (e) =>
              e.from === route[i - 1] &&
              e.to === route[i] &&
              (!trace.edges || e.id === String(trace.edges[i - 1])),
          );
          if (candidates.length !== 1)
            fail(
              `${key}: trace has missing or ambiguous legal edge ${route[i - 1]} -> ${route[i]}`,
            );
          edgeIds.push(candidates[0].id);
        }
        const type = trace.type || 'example';
        if (!['counterexample', 'example'].includes(type))
          fail(`${key}: unknown trace type`);
        if (
          type === 'counterexample' &&
          (basis !== 'tlc' ||
            !trace.runId ||
            !own(runs, trace.runId) ||
            (runs[trace.runId].outcome || runs[trace.runId].status) !==
              'violated')
        )
          fail(
            `${key}: counterexample needs the actual violating run, separate from graph export`,
          );
        if (type === 'counterexample')
          text(trace.property, `${key} violated property`);
        if (
          trace.loopStart != null &&
          (!Number.isInteger(trace.loopStart) ||
            trace.loopStart < 0 ||
            trace.loopStart >= route.length - 1 ||
            route.at(-1) !== route[trace.loopStart])
        )
          fail(`${key}: loop must close along a declared edge to loopStart`);
        return { ...trace, type, states: route, edges: edgeIds };
      });
      unique(
        traces.map((t) => t.id),
        `${key} traces`,
      );
      return [
        key,
        {
          ...graph,
          id: key,
          title: graph.title || key,
          basis,
          states,
          edges,
          initialStates: initialStates.map(String),
          traces,
        },
      ];
    }),
  );
  if (!Array.isArray(raw.sections) || !raw.sections.length)
    fail('at least one section is required');
  const sections = raw.sections.map((section) => {
    id(section.id, 'section');
    text(section.title, `${section.id} title`);
    text(section.body, `${section.id} body`);
    validateBody(section.body, section.id, sourceTarget, diagrams);
    if (section.diagram && !own(diagrams, section.diagram))
      fail(`${section.id}: missing diagram`);
    if (section.graph && !own(graphs, section.graph))
      fail(`${section.id}: missing graph`);
    if (section.run && !own(runs, section.run))
      fail(`${section.id}: missing run`);
    const quiz = (section.quiz || []).map((q) => {
      id(q.id, `${section.id} quiz`);
      text(q.prompt, 'quiz prompt');
      text(q.explanation, 'quiz explanation');
      if (!Array.isArray(q.options) || q.options.length < 2)
        fail('quiz needs at least two options');
      q.options.forEach((o) => {
        id(o.id, 'option');
        text(o.text, 'option text');
      });
      unique(
        q.options.map((o) => o.id),
        'quiz options',
      );
      if (!q.options.some((o) => o.id === q.answer))
        fail(`${q.id}: answer does not identify an option`);
      return q;
    });
    unique(
      quiz.map((q) => q.id),
      `${section.id} quizzes`,
    );
    if (section.exercise) text(section.exercise.prompt, 'exercise prompt');
    return {
      ...section,
      quiz,
      ...(section.source
        ? { source: sourceTarget(section.source, section.id + ' source') }
        : {}),
    };
  });
  unique(
    sections.map((s) => s.id),
    'sections',
  );
  return {
    ...raw,
    id: raw.id,
    // A dot cannot occur in course IDs. Preserve existing normal-course keys while
    // keeping the valid ID "appearance" separate from the shared appearance key.
    storageKey: `teacher-reader.${raw.id === 'appearance' ? 'course.' : ''}${raw.id}.v1`,
    version: 1,
    language: raw.language || 'zh-CN',
    sections,
    sources,
    diagrams,
    graphs,
    runs,
  };
}

export function scopeSVG(svg, prefix) {
  id(prefix, 'SVG mount');
  if (
    typeof svg !== 'string' ||
    !/^\s*<svg\b/.test(svg) ||
    !/<\/svg>\s*$/.test(svg)
  )
    fail('diagram must contain an SVG root');
  const elements = tags(svg);
  for (const tag of elements) {
    if (['script', 'foreignobject', 'iframe', 'image', 'a'].includes(tag.name))
      fail('diagram must be a self-contained, non-executable SVG');
    for (const [key, value] of Object.entries(tag.attrs)) {
      if (
        key.startsWith('on') ||
        (['href', 'xlink:href'].includes(key) && !value.startsWith('#'))
      )
        fail('unsafe SVG attribute');
    }
  }
  const entries = elements
    .filter((tag) => own(tag.attrs, 'id'))
    .map((tag) => tag.attrs.id);
  unique(entries, 'SVG ids');
  if (entries.some((value) => !value || !/^[A-Za-z0-9_.:-]+$/.test(value)))
    fail('SVG ids must use simple stable identifiers');
  const ids = new Map(entries.map((value) => [value, `${prefix}-${value}`]));
  const lookup = (value) =>
    ids.get(decode(value)) || fail(`missing SVG reference ${value}`);
  const paint = (value) => {
    if (/@import/i.test(value)) fail('external SVG resource');
    return value.replace(
      /url\(\s*(["']?)(.*?)\1\s*\)/gi,
      (_, quote, target) => {
        target = target.trim();
        if (!target.startsWith('#')) fail('external SVG resource');
        return `url(#${lookup(target.slice(1))})`;
      },
    );
  };
  const attributes = (tag) =>
    tag.replace(
      /([^\s=/'"<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g,
      (original, rawKey, double, single, bare) => {
        const key = rawKey.toLowerCase(),
          value = decode(double ?? single ?? bare);
        if (key === 'id') return `id="${lookup(value)}"`;
        if (key === 'aria-labelledby' || key === 'aria-describedby')
          return `${key}="${value.trim().split(/\s+/).map(lookup).join(' ')}"`;
        if (key === 'href' || key === 'xlink:href')
          return `${key}="#${lookup(value.slice(1))}"`;
        if (
          [
            'style',
            'fill',
            'stroke',
            'filter',
            'clip-path',
            'mask',
            'marker-start',
            'marker-mid',
            'marker-end',
            'cursor',
          ].includes(key)
        )
          return `${key}="${escapeHTML(paint(value))}"`;
        return original;
      },
    );
  // Only XML attributes and CSS paint references are scoped. Literal teaching text,
  // comments and text CDATA may themselves contain strings such as id = "example".
  let output = '',
    cursor = 0,
    inStyle = false;
  for (const match of svg.matchAll(markupTokens)) {
    const segment = svg.slice(cursor, match.index);
    output += inStyle ? paint(segment) : segment;
    const token = match[0],
      name = match[1]?.toLowerCase();
    if (!name)
      output +=
        inStyle && token.startsWith('<![CDATA[')
          ? '<![CDATA[' + paint(token.slice(9, -3)) + ']]>'
          : token;
    else if (token.startsWith('</')) {
      output += token;
      if (name === 'style') inStyle = false;
    } else {
      output += attributes(token);
      if (name === 'style' && !token.endsWith('/>')) inStyle = true;
    }
    cursor = match.index + token.length;
  }
  const tail = svg.slice(cursor);
  return output + (inStyle ? paint(tail) : tail);
}
