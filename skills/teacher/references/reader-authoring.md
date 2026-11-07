# Teacher Reader Authoring

The bundled reader is a topic-neutral offline renderer. Maintain lesson content and
evidence as data, then build HTML; do not copy a previous generated course, edit the
bundled UI for every topic, or depend on `docs/` prototypes to generate a lesson.

## Keep the lesson about the subject

Every section, caption and note should help answer a learning question. Keep test
counts, runtime/tool versions, validation coverage, build/release status and authoring
history out of the lecture. Do not move such reports into an appendix, footnote or
collapsed block. When revising a course, improve the relevant explanation in place;
do not add a “this update” or “new verification evidence” section.

Keep reproducible runs and raw verification records in authoring materials. A source
link, result or trace may open on demand when it directly supports the mechanism being
studied; it does not need a production-status recap. Explain relevant assumptions and
limits beside the claim they qualify, in the subject's terms. For example, explain why
a pending cleanup waits for an external event, rather than listing how many cleanup
tests the author ran. If model checking itself is the subject, commands, configurations
and results can be worked teaching examples.

## Build

Create `.learning/<topic>/course.json` and run:

```sh
node <teacher>/scripts/build-reader.mjs .learning/<topic>/course.json \
  --out learning-notes/<topic>/index.html
```

The builder validates before replacing an existing output, bundles assets relative
to the installed skill, and writes atomically. A plain course needs only Node 20+ at
authoring time. Mermaid figures also need the pinned Pele dependency:

```sh
npm ci --ignore-scripts --prefix <teacher>
node <teacher>/scripts/build-reader.mjs <teacher>/assets/example-course.json \
  --out learning-notes/example/index.html
```

Reading needs only a browser. The HTML embeds prose, source snapshots, results,
figures, palettes and controls; it makes no network requests. Paper is the default;
White and Night are optional. Appearance uses `teacher-reader.appearance.v1`, separate
from per-course state (`teacher-reader.<course-id>.v1`; the valid `appearance` slug
uses `teacher-reader.course.appearance.v1` to keep settings disjoint). Existing topics and generated artifacts need no
automatic migration. Stable course/section/quiz/option IDs preserve relevant progress
when rebuilding; give a materially different course its own ID.

## Minimal course

```json
{
  "version": 1,
  "id": "request-cache",
  "title": "缓存为什么能省下一次读取",
  "language": "zh-CN",
  "sections": [{
    "id": "first-request",
    "title": "先看第一次请求",
    "goal": "能追踪一次没有缓存的读取。",
    "body": "<p>用商品42跟着一次请求走。</p>"
  }]
}
```

IDs use letters, digits, `-` and `_`, beginning with a letter/digit. Keep them unique
within their owning collection. `language` describes the lecture language; author
prose, cues, labels and feedback in the learner's chosen language. The bundled reader
controls use the established Chinese reading interface.

`body` is trusted **authored prose HTML**, not imported repository HTML. It supports
ordinary paragraphs, headings, lists, tables, code, details and data-URI illustrations.
Put untrusted source/log text into `sources[].text`, never interpolate it as HTML.
The builder rejects executable markup, external image assets, author-supplied DOM IDs
and event handlers. The output restricts runtime resource loading with a CSP. This is
not a general-purpose sanitizer for arbitrary web pages.

## Sections and optional capabilities

Each section requires `id`, `title`, `body`; optional fields are:

- `kicker`, `goal`: the current learning question and purpose.
- `source: {file,start,end,label?}`: one-way entry into a complete source snapshot.
- `diagram`: append a figure after the explanation. For placement beside a particular
  paragraph use `<div data-teacher-diagram="cache-flow"></div>` in `body` instead.
  A figure appears once per section; the reader scopes IDs for main/comparison views.
- `quiz`: single-choice understanding checks, each `{id,prompt,options:[{id,text}],
  answer:<option-id>,explanation}`. Choice and checking are separate, feedback is
  nonblocking, retry clears that question, and none of these actions marks mastery.
- `exercise: {prompt,title?,hints?:[],reference?}`: a locally saved explanation or
  prediction with progressive hints/reference. Free text is not automatically graded.
- `graph`: an optional state-exploration key. `run`: a separate check-result key.
  The graph-export check and the chapter's property check may be different runs.

Additional source buttons use the same line contract:

```html
<button type="button" class="source-link" data-source="cache.mjs"
        data-start="2" data-end="7">对照读取流程</button>
```

## Sources and figures

`sources` is a map of filenames to `{text,language?,origin?,symbols?:[],links?:[]}`;
a plain string is also accepted. `text` is the complete file, preserved for copying.
`origin` may include `label`, `path`, `revision`; the UI shows it progressively.
See [Source Learning](source-learning.md) for revision selection and call-site jumps.

`diagrams` is a map to `{source,narrowSource?,readingCue,caption}`. `source` and
`narrowSource` are Mermaid. Read [Diagram Rendering](diagram-rendering.md): use stable
semantic IDs and generate a deliberate narrow projection when needed, not tiny text.
Alternatively supply both `wide` and `narrow` as already rendered self-contained SVG.
Use simple ASCII SVG IDs (letters, digits, `_`, `-`, `.`, `:`). The builder scopes document IDs/labels/internal references independently for each
main/comparison and wide/narrow mount. It rejects executable or external SVG resources.
Inspect actual labels at their displayed size; a requested width alone is no proof
that a dense diagram fits.

## State exploration and evidence

Prefer automatic import when states come from an actual TLC run. The bundled
`import-model.mjs` creates a versioned model fragment with `sources`, `runs`, `graphs`
and Pele `diagrams`; see [Model-driven Learning](model-driven-learning.md) for the
commands and runnable example. Add it without copying graph JSON by hand:

```sh
node <teacher>/scripts/build-reader.mjs COURSE.json --model MODEL.json --out index.html
```

Repeat `--model` for separate models/checks. The API equivalent is
`buildReader(courseData, {models: [fragment]})`. Duplicate keys fail instead of
overwriting authored material. The course's sections select an imported graph by its
`--id`; `section.run` can select its `<id>-run` check. A failed import/build preserves
the previous output. Existing courses and builds without model fragments keep working.

`graphs[key]` contains:

```json
{
  "title": "作者给定的教学模型",
  "basis": "illustrative",
  "initialState": "empty",
  "states": [{"id":"empty","variables":{"cached":false}},
             {"id":"ready","variables":{"cached":true}}],
  "edges": [{"id":"fill","from":"empty","to":"ready",
             "action":"load","label":"读取并保存"}],
  "traces": [{"id":"first","type":"example","title":"第一次读取",
              "states":["empty","ready"],"edges":["fill"]}],
  "note": "教学简化，尚未进行模型检查。"
}
```

States/edges/traces have stable IDs. Edges may have a `source` range. Use `initialStates`
instead of `initialState` when the actual model has multiple initial states. The builder
rejects unknown states, duplicate IDs, disconnected traces and ambiguous transitions.
Manual choices, free history and reference replay show their actual current state;
the visible player groups its focused diagram, controls, variable changes and
current action's source link. Full-graph viewing is optional. Pele state diagrams
rendered by the bundled generator carry semantic arrow endpoints for motion;
prepared SVG without those endpoints retains node focus and textual stepping.
playing does not advance the chapter or learner mastery. Reduced motion retains manual
access; scenario/source/visibility changes cancel stale playback. Volatile state DOM
is excluded from scroll anchoring so frames do not scroll the reader.

For a genuine TLC graph, use `basis:"tlc"` and `runId` referencing its export run.
`runs[key]` contains `outcome`, `toolVersion`, `logSource`, and normally `command`,
`summary`, `counts`, `limitations`. Preserve raw logs as complete source files.
Outcomes are `holds`, `violated`, `incomplete`, `tool-error`, `timeout`, `unavailable`,
or `not-checked`. Holds/violated need the original log and actual tool version.

A trace labeled `type:"counterexample"` additionally needs `property` and `runId`
pointing to the actual **violating** run. A TypeOK-only graph export that passes does
not establish another property, even when the exported data is useful for exploration.
`type:"example"` is a path along declared legal edges, not a discovered counterexample.
If a trace has `loopStart`, its final state must return along a declared edge to the
state at that zero-based index. The reader identifies the log-marked loop segment;
the author must explain its infinite repetition. Read
[Model-driven Learning](model-driven-learning.md) before producing checked claims.

## Deliver and revisit

Build, then inspect affected journeys in a permitted real browser: first opening,
deep chapter link and back/forward, lecture/source return, definition and call-site
jumps, full-file copy/wrap, wrong/correct/retry, settings after an answer, saved drafts,
model free/replay modes and cancellation. Include narrow/offline/reduced-motion views
for the capabilities used. Confirm no external requests or console errors.

Browser storage may be unavailable or malformed; the course stays usable in-session
and reports saving limits. Test corruption/unavailability when changing persistence.
Keep the original authoring data and reproducible model materials so a clearer
explanation can replace the same section later. Keep learning evidence in the mastery
checklist; do not import browser counters as proof of mastery.
