#!/usr/bin/env node
import {
  readFile,
  mkdir,
  writeFile,
  rename,
  rm,
  realpath,
} from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import {
  normalizeCourse,
  scopeSVG,
  escapeHTML as esc,
  scriptJSON,
} from './reader-contract.mjs';
import { mergeModelFragments } from './import-model.mjs';

export async function buildReader(input, { models = [] } = {}) {
  const course = normalizeCourse(mergeModelFragments(input, models));
  const [themes, shell, style, runtime] = await Promise.all([
    readFile(
      new URL('../assets/reader-themes.json', import.meta.url),
      'utf8',
    ).then(JSON.parse),
    readFile(new URL('../assets/reader/shell.html', import.meta.url), 'utf8'),
    readFile(new URL('../assets/reader/reader.css', import.meta.url), 'utf8'),
    readFile(new URL('../assets/reader/reader.js', import.meta.url), 'utf8'),
  ]);
  const diagrams = {};
  for (const [key, diagram] of Object.entries(course.diagrams)) {
    const source = diagram.source;
    let wide = diagram.wide,
      narrow = diagram.narrow;
    if (source && (!wide || !narrow)) {
      // Plain lessons and courses with already rendered SVG need no npm dependency.
      const { renderTeacherDiagram } = await import('./render-diagram.mjs');
      wide ||= renderTeacherDiagram(source, {
        width: 700,
        idPrefix: `teacher-${key}-wide`,
      });
      narrow ||= renderTeacherDiagram(diagram.narrowSource || source, {
        width: 300,
        idPrefix: `teacher-${key}-narrow`,
      });
    }
    if (!wide || !narrow)
      throw new TypeError(
        `Diagram ${key}: provide source, or both wide and narrow SVG`,
      );
    diagrams[key] = {
      readingCue: diagram.readingCue || '',
      caption: diagram.caption || '',
      ...Object.fromEntries(
        ['main', 'compare', 'model'].map((mount) => [
          mount,
          {
            wide: scopeSVG(wide, `${mount}-${key}-wide`),
            narrow: scopeSVG(narrow, `${mount}-${key}-narrow`),
          },
        ]),
      ),
    };
  }
  course.diagrams = diagrams;
  const vars = (tokens) =>
    Object.entries(tokens)
      .map(
        ([key, value]) =>
          `--reader-${key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}:${value}`,
      )
      .join(';');
  const themeStyle =
    `:root{${vars(themes.themes[themes.default].tokens)};${Object.entries(
      themes.fonts,
    )
      .map(([key, value]) => `--reader-font-${key}:${value}`)
      .join(';')}}\n` +
    Object.entries(themes.themes)
      .map(
        ([key, theme]) =>
          `:root[data-theme="${key}"]{${vars(theme.tokens)};color-scheme:${theme.scheme}}`,
      )
      .join('\n');
  const pieces = {
    LANGUAGE: esc(course.language),
    TITLE: esc(course.title),
    STYLE: themeStyle + '\n' + style,
    COURSE: scriptJSON(course),
    THEMES: scriptJSON(themes),
    RUNTIME: runtime.replace(/<\/script/gi, '<\\/script'),
    THEME_CHOICES: Object.entries(themes.themes)
      .map(
        ([key, theme]) =>
          `<label class="theme-choice"><input type="radio" name="teacher-reader-theme" value="${esc(key)}" data-theme-choice><span><strong>${esc(theme.name)}</strong><small>${esc(theme.description)}</small></span></label>`,
      )
      .join(''),
  };
  return shell.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(pieces, key))
      throw new Error(`Unknown reader template field ${key}`);
    return pieces[key];
  });
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      model: { type: 'string', multiple: true },
      help: { type: 'boolean' },
    },
  });
  const usage =
    'node build-reader.mjs COURSE.json [--model MODEL.json] --out learning-notes/TOPIC/index.html';
  if (values.help) {
    console.log(usage);
    return;
  }
  if (positionals.length !== 1 || !values.out) throw new TypeError(usage);
  const input = resolve(positionals[0]),
    output = resolve(values.out);
  if (input === output)
    throw new TypeError('Output must not overwrite course data');
  const existingOutput = await realpath(output).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  for (const source of [
    input,
    ...(values.model || []).map((file) => resolve(file)),
  ])
    if (existingOutput && existingOutput === (await realpath(source)))
      throw new TypeError(
        'Output must not overwrite course or imported model data',
      );
  // Validate, render and bundle completely before replacing an existing lesson.
  const models = await Promise.all(
    (values.model || []).map(async (file) =>
      JSON.parse(await readFile(resolve(file), 'utf8')),
    ),
  );
  const html = await buildReader(JSON.parse(await readFile(input, 'utf8')), {
    models,
  });
  await mkdir(dirname(output), { recursive: true });
  const temp = output + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temp, html, { flag: 'wx' });
    await rename(temp, output);
  } finally {
    await rm(temp, { force: true });
  }
  console.log(`Built offline Teacher reader: ${output}`);
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
