import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parse, render, PeleError } from 'pele';

const { version } = createRequire(import.meta.url)('pele/package.json');
const readerThemes = JSON.parse(
  readFileSync(
    new URL('../assets/reader-themes.json', import.meta.url),
    'utf8',
  ),
);
const paper = readerThemes.themes[readerThemes.default].tokens;
const fontFamily = readerThemes.fonts.ui;

// Theme belongs to Teacher. Diagram facts, labels and stable node IDs belong to
// the Mermaid source; Pele owns measurement, routing and SVG construction.
const theme = `.pele {
  --pele-bg: var(--reader-surface, ${paper.surface});
  --pele-fg: var(--reader-ink, ${paper.ink});
  --pele-muted: var(--reader-muted, ${paper.muted});
  --pele-line: var(--reader-figure-line, ${paper.figureLine});
  --pele-surface: var(--reader-surface, ${paper.surface});
  --pele-surface-alt: var(--reader-surface-alt, ${paper.surfaceAlt});
  --pele-border: var(--reader-figure-border, ${paper.figureBorder});
  --pele-accent: var(--reader-accent, ${paper.accent});
  --pele-error: var(--reader-bad, ${paper.bad});
  --pele-font: ${fontFamily};
  --pele-font-mono: Menlo, Consolas, monospace;
}`;

/** Render a declared teaching diagram; this does not verify its behavior. */
export function renderTeacherDiagram(source, { width = 740, idPrefix } = {}) {
  if (typeof source !== 'string' || !source.trim()) {
    throw new TypeError('A non-empty Mermaid source is required.');
  }
  if (!Number.isFinite(width) || width <= 0) {
    throw new RangeError('width must be a positive finite number.');
  }
  if (typeof idPrefix !== 'string' || !/^[A-Za-z0-9_-]+$/.test(idPrefix)) {
    throw new TypeError(
      'idPrefix is required; use only letters, digits, - and _.',
    );
  }
  const model = parse(source, { limit: 1_000_000, maxEdges: 10_000 });
  let { svg } = render(model, {
    maxWidth: width,
    idPrefix,
    fontFamily,
    fontFamilyMono: 'Menlo, Consolas, monospace',
    fontSize: 16,
    autoDirection: true,
    responsive: true,
    links: false,
    images: false,
    limit: 1_000_000,
    outputLimit: 8_000_000,
    maxEdges: 10_000,
  });
  // Pele's parsed state graph owns both semantic endpoints and rendered edge IDs.
  // Keep them together so playback follows actual routed geometry, including nested
  // states and parallel arrows, without guessing an edge from its screen position.
  if (model.type === 'state') {
    const edges = new Map(model.graph.edges.map((edge) => [edge.id, edge]));
    const attr = (value) =>
      String(value ?? '').replace(
        /[&<>"']/g,
        (c) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[c],
      );
    svg = svg.replace(
      /<g\b[^>]*class="[^"]*\bpele-edge(?![\w-])[^"]*"[^>]*>/g,
      (tag) => {
        const edge = edges.get(tag.match(/\bdata-id="([^"]+)"/)?.[1]);
        return edge
          ? tag.replace(
              />$/,
              ` data-from="${attr(edge.start)}" data-to="${attr(edge.end)}" data-label="${attr(edge.label)}">`,
            )
          : tag;
      },
    );
  }
  return svg
    .replace(
      '<svg ',
      `<svg data-teacher-renderer="pele" data-pele-version="${version}" data-teacher-width="${width}" `,
    )
    .replace(/(<svg\b[^>]*>)/, `$1<style>${theme}</style>`);
}

const usage =
  'Usage: node render-diagram.mjs INPUT.mmd --out OUTPUT.svg --id-prefix course-figure-wide [--width 740]';

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: 'string' },
      width: { type: 'string', default: '740' },
      'id-prefix': { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log(usage);
    return;
  }
  if (positionals.length !== 1 || !values.out || !values['id-prefix']) {
    throw new TypeError(usage);
  }
  const source = await readFile(resolve(positionals[0]), 'utf8');
  const svg = renderTeacherDiagram(source, {
    width: Number(values.width),
    idPrefix: values['id-prefix'],
  });
  const output = resolve(values.out);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, svg + '\n');
  console.log(`Rendered ${output} with Pele ${version}.`);
}

if (
  process.argv[1] &&
  (await realpath(process.argv[1]).catch(() => null)) ===
    fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    const location =
      error instanceof PeleError && error.line
        ? ` at line ${error.line}, column ${error.column}`
        : '';
    const code = error instanceof PeleError ? ` [${error.code}]` : '';
    console.error(
      `Diagram rendering failed${code}${location}: ${error.message}`,
    );
    process.exitCode = 1;
  });
}
