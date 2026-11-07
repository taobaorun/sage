#!/usr/bin/env node
// Author-side evidence capture. The offline reader does not execute this script.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const quote = value => `'${String(value).replaceAll("'", "'\\''")}'`;
const args = process.argv.slice(2);
const options = {};
let spec;
try {
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--') && !spec) spec = args[i];
    else if (['--config', '--out', '--timeout-ms'].includes(args[i]) && args[i + 1]) options[args[i].slice(2)] = args[++i];
    else throw new Error(`Unknown or incomplete argument: ${args[i]}`);
  }
  if (!spec || !options.config || !options.out) throw new Error('Usage: check-model.mjs SPEC.tla --config FILE.cfg --out NEW_OR_EMPTY_DIR [--timeout-ms 30000]');
  const timeout = Number(options['timeout-ms'] ?? 30000);
  if (!Number.isFinite(timeout) || timeout < 1) throw new Error('Timeout must be a positive number');
  if (!process.env.TLA2TOOLS) throw new Error('Set TLA2TOOLS to an official tla2tools.jar; set JAVA if java is not on PATH');
  const specPath = await fs.realpath(spec);
  const configPath = await fs.realpath(options.config);
  const jarPath = await fs.realpath(process.env.TLA2TOOLS);
  const out = path.resolve(options.out);
  const [specBytes, configBytes, jarBytes] = await Promise.all([fs.readFile(specPath), fs.readFile(configPath), fs.readFile(jarPath)]);
  if (!specPath.endsWith('.tla')) throw new Error('Specification must end in .tla');
  // Do not overwrite evidence or create output before all required inputs exist.
  try { if ((await fs.readdir(out)).length) throw new Error(`Output folder is not empty: ${out}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(path.join(out, path.basename(specPath)), specBytes);
  await fs.writeFile(path.join(out, 'model.cfg'), configBytes);
  const java = process.env.JAVA || 'java';
  const dumpPath = path.join(out, 'states.dot');
  const javaTmp = path.join(out, 'java-tmp');
  await fs.mkdir(javaTmp);
  // SANY extracts standard modules into java.io.tmpdir; concurrent runs need isolation.
  const javaArgs = [`-Djava.io.tmpdir=${javaTmp}`, '-Xmx512m', '-XX:+UseParallelGC', '-cp', jarPath, 'tlc2.TLC', '-workers', '1', '-fp', '0', '-lncheck', 'final', '-dump', 'dot,actionlabels', dumpPath, '-config', configPath, '-metadir', path.join(out, 'states'), specPath];
  const startedAt = new Date().toISOString();
  const logHandle = await fs.open(path.join(out, 'tlc.out'), 'w');
  let timedOut = false;
  let spawnError;
  let child;
  let timer;
  const status = await new Promise(resolve => {
    // A shared file descriptor captures output without buffering or async write races.
    child = spawn(java, javaArgs, { cwd: path.dirname(specPath), stdio: ['ignore', logHandle.fd, logHandle.fd] });
    child.on('error', error => { spawnError = error.message; });
    child.on('close', (code, signal) => { clearTimeout(timer); resolve({code, signal}); });
    timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeout);
  });
  await logHandle.close();
  const output = await fs.readFile(path.join(out, 'tlc.out'), 'utf8');
  const artifacts = {};
  for (const file of ['tlc.out', 'states.dot']) {
    try { const bytes = await fs.readFile(path.join(out, file)); artifacts[file] = { sha256: hash(bytes), bytes: bytes.length }; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const completed = status.code === 0 && /Model checking completed|No error has been found/.test(output);
  const violation = !timedOut && [11, 12, 13].includes(status.code) && /Error:/.test(output);
  const outcome = timedOut ? 'timeout' : spawnError ? 'tool-error' : completed ? 'holds' : violation ? 'violated' : 'tool-error';
  const counts = [...output.matchAll(/([\d,]+) states generated, ([\d,]+) distinct states found, ([\d,]+) states left on queue/g)].at(-1);
  const evidence = {
    outcome, artifacts, startedAt, finishedAt: new Date().toISOString(), exitCode: status.code,
    signal: status.signal, timedOut, error: spawnError,
    toolVersion: output.match(/TLC2 Version[^\n]*/)?.[0] ?? null,
    inputs: {spec: {path: specPath, sha256: hash(specBytes)}, config: {path: configPath, sha256: hash(configBytes)}, jar: {path: jarPath, sha256: hash(jarBytes)}},
    command: [java, ...javaArgs].map(quote).join(' '),
    counts: counts ? {generated: Number(counts[1].replaceAll(',', '')), distinct: Number(counts[2].replaceAll(',', '')), queue: Number(counts[3].replaceAll(',', ''))} : null,
    graphComplete: completed && counts?.[3] === '0',
    note: 'Only the supplied model/configuration was checked. A failing run may contain a partial state dump. Imported local modules must also be preserved by the course author.'
  };
  await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(evidence, null, 2) + '\n');
  process.stdout.write(JSON.stringify({out, ...evidence}, null, 2) + '\n');
  process.exitCode = completed ? 0 : violation ? 1 : 2;
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 2;
}
