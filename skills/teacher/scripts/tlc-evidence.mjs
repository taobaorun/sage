// Parse TLC's printed values and action-labelled DOT, never executable TLA+ code.
const fail = (message) => {
  throw new TypeError(`TLC import: ${message}`);
};
const MAX_TEXT = 32 * 1024 * 1024;
export function boundedText(input, name) {
  if (typeof input !== 'string' || Buffer.byteLength(input) > MAX_TEXT)
    fail(`${name} must be text no larger than 32 MiB`);
  return input.replace(/\r\n?/g, '\n');
}

export function parseTlcValue(input) {
  let at = 0,
    depth = 0;
  const skip = () => {
    while (/\s/.test(input[at] || '') && at < input.length) at++;
  };
  const take = (s) => {
    skip();
    if (input.startsWith(s, at)) {
      at += s.length;
      return true;
    }
    return false;
  };
  const need = (s) => {
    if (!take(s)) fail(`expected ${s} in value ${input.slice(0, 120)}`);
  };
  function value() {
    if (++depth > 100) fail('value nesting exceeds 100');
    skip();
    let result;
    if (input[at] === '"') {
      const start = at++;
      while (at < input.length && input[at] !== '"') {
        if (input[at] === '\\') at++;
        at++;
      }
      if (at >= input.length) fail('unterminated TLC string');
      try {
        result = JSON.parse(input.slice(start, ++at));
      } catch {
        fail('unsupported TLC string escape');
      }
    } else if (take('<<')) result = list('>>');
    else if (take('{')) result = { $set: list('}') };
    else if (take('[')) {
      const pairs = [];
      if (!take(']'))
        do {
          skip();
          const name = /^[A-Za-z_][\w]*/.exec(input.slice(at));
          if (!name) fail('record field must be an identifier');
          at += name[0].length;
          need('|->');
          pairs.push([name[0], value()]);
          if (take(']')) break;
          need(',');
        } while (true);
      result = entries(pairs);
    } else if (take('(')) {
      const pairs = [];
      if (!take(')'))
        do {
          const key = value();
          need(':>');
          const item = value();
          pairs.push([key, item]);
          if (take(')')) break;
          need('@@');
        } while (true);
      if (new Set(pairs.map(([key]) => stateKey(key))).size !== pairs.length)
        fail('duplicate TLC function domain');
      result = { $function: pairs };
    } else {
      const token = /^(?:-?\d+|[A-Za-z_][\w]*)/.exec(input.slice(at));
      if (!token) fail(`unsupported value near ${input.slice(at, at + 80)}`);
      at += token[0].length;
      result =
        token[0] === 'TRUE'
          ? true
          : token[0] === 'FALSE'
            ? false
            : /^-?\d+$/.test(token[0])
              ? Number(token[0])
              : { $modelValue: token[0] };
      if (typeof result === 'number' && !Number.isSafeInteger(result))
        fail(
          'integer exceeds JavaScript safe range; use a smaller teaching model',
        );
    }
    depth--;
    return result;
  }
  function entries(pairs) {
    if (new Set(pairs.map(([key]) => key)).size !== pairs.length)
      fail('duplicate TLC record/function keys');
    return Object.fromEntries(pairs);
  }
  function list(end) {
    const items = [];
    if (take(end)) return items;
    do {
      items.push(value());
      if (take(end)) return items;
      need(',');
    } while (true);
  }
  const result = value();
  skip();
  if (at !== input.length)
    fail(`unparsed value suffix ${input.slice(at, at + 80)}`);
  return result;
}

export function parseState(input) {
  const pairs = [],
    text = input.trim().replace(/^\/\\\s*/, '');
  for (const part of text.split(/\n\s*\/\\\s*/)) {
    const match = /^([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/.exec(part.trim());
    if (!match) fail(`cannot parse state assignment ${part.slice(0, 100)}`);
    pairs.push([match[1], parseTlcValue(match[2])]);
  }
  if (!pairs.length || new Set(pairs.map(([key]) => key)).size !== pairs.length)
    fail('missing or duplicate state variables');
  return Object.fromEntries(pairs);
}

// Canonical keys match log and dump states despite TLC's variable printing order.
export function stateKey(vars) {
  const ordered = (v) =>
    Array.isArray(v)
      ? v.map(ordered)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, ordered(v[k])]),
          )
        : v;
  return JSON.stringify(ordered(vars));
}

function dotString(s) {
  return s.replace(/\\([\s\S])/g, (_, c) =>
    c === 'n' ? '\n' : c === 'r' ? '\r' : c === '\n' ? '' : c,
  );
}

export function parseDot(input) {
  const text = boundedText(input, 'DOT'),
    states = new Map(),
    edges = [];
  if (!/^\s*(?:strict\s+)?digraph\b/.test(text) || !/}\s*$/.test(text))
    fail('incomplete or unsupported DOT dump');
  for (const line of text.split('\n')) {
    const edge = /^\s*(-?\d+)\s*->\s*(-?\d+)\s*\[([\s\S]*)\];?\s*$/.exec(line);
    const node = /^\s*(-?\d+)\s*\[([\s\S]*)\];?\s*$/.exec(line);
    if (!edge && !node) {
      if (/^\s*-?\d+\s*(?:->|\[)/.test(line))
        fail(`unrecognized DOT state or edge: ${line.slice(0, 100)}`);
      continue;
    }
    const attrs = (edge || node)[edge ? 3 : 2];
    const label = /(?:^|,)\s*label\s*=\s*"((?:[^"\\]|\\.)*)"/.exec(attrs);
    if (edge) {
      if (
        !label &&
        !(edge[1] === edge[2] && /style\s*=\s*"?dashed/.test(attrs))
      )
        fail('DOT edges require actionlabels');
      edges.push({
        from: edge[1],
        to: edge[2],
        action: label ? dotString(label[1]) : 'Stuttering',
        origin: label ? 'dump' : 'stuttering',
      });
    } else {
      if (!label) fail('DOT state has no label');
      const vars = parseState(dotString(label[1])),
        prior = states.get(node[1]);
      if (prior && stateKey(prior.variables) !== stateKey(vars))
        fail('conflicting DOT state fingerprint');
      states.set(node[1], {
        fingerprint: node[1],
        variables: vars,
        initial: !!prior?.initial || /style\s*=\s*"?filled/.test(attrs),
      });
    }
    if (states.size > 5000 || edges.length > 20000)
      fail(
        'dump exceeds 5000 states or 20000 edges; use a smaller teaching model',
      );
  }
  if (!states.size) fail('DOT dump contains no states');
  for (const edge of edges)
    if (!states.has(edge.from) || !states.has(edge.to))
      fail('DOT edge points to an absent state');
  if (![...states.values()].some((s) => s.initial))
    fail('DOT dump does not identify its initial states');
  const seen = new Set();
  return {
    states: [...states.values()],
    edges: edges.filter((e) => {
      const k = JSON.stringify([e.from, e.to, e.action]);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }),
  };
}

// TLC 2.19 config directives are tokens, not lines. Constants can themselves
// contain strings/model values named like directives, so skip their full values.
export function parseTlcConfig(input) {
  const text = boundedText(input, 'TLC configuration'),
    tokens = [];
  let at = 0;
  while (at < text.length) {
    if (/\s/.test(text[at])) {
      at++;
      continue;
    }
    if (text.startsWith('\\*', at)) {
      const end = text.indexOf('\n', at);
      at = end < 0 ? text.length : end;
      continue;
    }
    if (text.startsWith('(*', at)) {
      let depth = 1;
      at += 2;
      while (at < text.length && depth) {
        if (text.startsWith('(*', at)) {
          depth++;
          at += 2;
        } else if (text.startsWith('*)', at)) {
          depth--;
          at += 2;
        } else at++;
      }
      if (depth) fail('unterminated configuration comment');
      continue;
    }
    if (text[at] === '"') {
      const start = at++;
      while (at < text.length && text[at] !== '"') {
        if (text[at] === '\\') at++;
        at++;
      }
      if (at >= text.length) fail('unterminated configuration string');
      tokens.push({ value: text.slice(start, ++at), quoted: true });
      continue;
    }
    const token = /^(?:<-|[A-Za-z_]\w*|\d+|[^\s])/.exec(text.slice(at))[0];
    tokens.push({ value: token, quoted: false });
    at += token.length;
  }
  const keywords = new Set([
    'CONSTANT',
    'CONSTANTS',
    'CONSTRAINT',
    'CONSTRAINTS',
    'ACTION_CONSTRAINT',
    'ACTION_CONSTRAINTS',
    'INVARIANT',
    'INVARIANTS',
    'INIT',
    'NEXT',
    'VIEW',
    'SYMMETRY',
    'SPECIFICATION',
    'PROPERTY',
    'PROPERTIES',
    'TYPE',
    'TYPE_CONSTRAINT',
    'CHECK_DEADLOCK',
  ]);
  const lists = new Set([
    'CONSTRAINT',
    'CONSTRAINTS',
    'ACTION_CONSTRAINT',
    'ACTION_CONSTRAINTS',
    'INVARIANT',
    'INVARIANTS',
    'PROPERTY',
    'PROPERTIES',
  ]);
  const properties = [],
    reductions = [];
  let i = 0;
  const directive = () =>
    tokens[i] && !tokens[i].quoted && keywords.has(tokens[i].value);
  const take = () => tokens[i++] || fail('configuration operand is missing');
  const need = (value) => {
    if (take().value !== value) fail(`expected ${value} in configuration`);
  };
  function name() {
    const token = take();
    if (token.quoted || !/^[A-Za-z_]\w*$/.test(token.value))
      fail('unsupported configuration operator name');
    let result = token.value;
    while (tokens[i]?.value === '!') {
      i++;
      const part = take();
      if (part.quoted || !/^[A-Za-z_]\w*$/.test(part.value))
        fail('invalid qualified configuration name');
      result += '!' + part.value;
    }
    return result;
  }
  function value(depth = 0) {
    if (depth > 100) fail('configuration value nesting exceeds 100');
    const token = take();
    if (token.quoted || /^[A-Za-z_]\w*$|^\d+$/.test(token.value)) return;
    if (token.value !== '{') fail('unsupported configuration constant value');
    if (tokens[i]?.value === '}') {
      i++;
      return;
    }
    do {
      value(depth + 1);
      if (tokens[i]?.value === '}') {
        i++;
        return;
      }
      need(',');
    } while (true);
  }
  while (i < tokens.length) {
    if (!directive())
      fail(`unsupported configuration directive ${tokens[i].value}`);
    const key = take().value;
    if (key === 'CONSTANT' || key === 'CONSTANTS') {
      while (i < tokens.length && !directive()) {
        name();
        if (tokens[i]?.value === '(') {
          i++;
          if (tokens[i]?.value !== ')')
            do {
              value();
              if (tokens[i]?.value === ')') break;
              need(',');
            } while (true);
          need(')');
        }
        const operator = take().value;
        if (!['=', '<-'].includes(operator))
          fail('unsupported configuration constant assignment');
        if (tokens[i]?.value === '[') {
          i++;
          name();
          need(']');
        }
        if (operator === '<-') name();
        else value();
      }
    } else if (lists.has(key)) {
      while (i < tokens.length && !directive()) {
        const item = name();
        if (key === 'PROPERTY' || key === 'PROPERTIES') properties.push(item);
      }
    } else {
      const operand = name();
      if (key === 'VIEW' || key === 'SYMMETRY')
        reductions.push({ kind: key, operator: operand });
    }
  }
  return { properties: [...new Set(properties)], reductions };
}

const actionName = (header) =>
  header.replace(/\s+line\s+\d+[\s\S]*$/, '').trim();
export function parseViolation(input, config = '') {
  const text = boundedText(input, 'TLC log');
  const invariant =
    /Error: Invariant (\S+) is violated(?: by the initial state)?[.:]?/.exec(
      text,
    );
  const deadlock = /Error: Deadlock reached\./.test(text);
  const temporal = /Error: Temporal properties were violated\./.test(text);
  if (!invariant && !deadlock && !temporal) return null;
  const kind = invariant ? 'invariant' : deadlock ? 'deadlock' : 'liveness';
  // TLC does not name an individual failed property when several were checked.
  const properties = parseTlcConfig(config).properties;
  const property =
    invariant?.[1] ||
    (deadlock
      ? 'NoDeadlock'
      : properties.length === 1
        ? properties[0]
        : 'TemporalProperties (see configuration)');
  const states = [];
  let loopStart;
  const start = text.indexOf(
    invariant?.[0] ||
      (deadlock
        ? 'Error: Deadlock reached.'
        : 'Error: Temporal properties were violated.'),
  );
  const tail = text.slice(start);
  const header = /^State (\d+):\s*(?:<([^\n]*)>|(Stuttering))\s*$/gm;
  const matches = [...tail.matchAll(header)];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    if (Number(m[1]) !== states.length + 1)
      fail('noncontiguous TLC trace state numbers');
    if (m[3]) {
      if (!states.length) fail('stuttering trace has no initial state');
      loopStart = states.length - 1;
      states.push({ action: 'Stuttering', variables: states.at(-1).variables });
      break;
    }
    const body = tail.slice(
      m.index + m[0].length,
      matches[i + 1]?.index ?? tail.length,
    );
    // A complete printed state ends at the first blank line or TLC status line.
    const printed = body
      .trimStart()
      .split(
        /\n\s*\n|\n(?:\d[\d,]* states generated|Progress\(|Finished |Back to state|\d+: Back to state)/,
      )[0];
    states.push({ action: actionName(m[2]), variables: parseState(printed) });
  }
  if (!states.length && invariant && /initial state/.test(invariant[0])) {
    const body = tail.slice(invariant[0].length).trimStart();
    states.push({
      action: 'Initial predicate',
      variables: parseState(
        body.split(/\n\s*\n|\n(?:\d[\d,]* states generated|Finished )/)[0],
      ),
    });
  }
  const back =
    /(?:^|\n)(?:\d+: )?Back to state (\d+)(?:\s*:\s*<([^\n]*)>)?/.exec(tail);
  if (back) {
    loopStart = Number(back[1]) - 1;
    if (!states[loopStart]) fail('TLC loop refers to an absent trace state');
    states.push({
      action: back[2] ? actionName(back[2]) : null,
      variables: states[loopStart].variables,
    });
  }
  if (!states.length) fail('violation has no readable TLC trace');
  if (temporal && loopStart == null)
    fail('temporal counterexample has no loop or stuttering suffix');
  return {
    kind,
    property,
    states,
    ...(loopStart == null ? {} : { loopStart }),
  };
}
