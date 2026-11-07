# Model-driven Learning with TLA+ and TLC

Use this optional teaching method when understanding depends on alternative states,
interleavings, retries, failure conditions, or eventual progress. The subject can be a
protocol, a transaction, a project mechanism, or TLA+/TLC itself. Do not require formal
modeling for every lesson or use it to verify the reader that presents the lesson.

The goal is an accurate mental model: the learner can explain a mechanism, predict
another execution and identify the source that makes it possible. Use TLA+ to express
that understanding precisely and TLC to explore its consequences. A correct, unsurprising
implementation can still make an excellent lesson; finding violations is not required.
Choose this method by behavioral complexity, not by the project's category. A UI with
meaningful concurrent states may benefit; a simple distributed CRUD path may not.

## Teach through a model

1. Start with one scenario and a question: “Why can a finished task be delivered again?”,
   “Which request waits here?”, or “Why is this update inside the lock?” Ask the learner
   to predict a concrete execution before showing the result.
2. Follow that scenario through a fixed source snapshot. Map relevant state variables,
   actions and guards to source ranges. Explain reads, writes, calls, suspension points
   and atomicity boundaries. A whole function is not automatically an atomic action.
   State scheduling, network and environment assumptions separately from source facts.
3. Build the smallest finite model that preserves the distinctions needed to answer
   the question. Abstract unrelated details, but retain relevant interleavings, guards
   and failure points. An algorithm-level introduction may precede a source-faithful
   model; label the abstraction and explain how it maps back to the implementation.
4. Express the learner's expectations as invariants or temporal properties when useful,
   and actually run TLC. A completed check can illuminate why a mechanism works even
   when every property holds. Keep the exact specification, configuration, command,
   tool version, raw output and outcome in authoring evidence, not a course-wide
   validation report. Bring a result into the lesson only to explain the current
   mechanism or expectation. Distinguish a violation from invalid syntax,
   unavailable tooling, a timeout or an incomplete search. Never weaken an expectation
   merely to make a check pass; explain when the expectation itself needs revision.
5. Project explored behavior into the learner's words and render it with Pele. Derive
   paths, snapshots, source links and explanations from the same checked data. Begin
   with one ordinary execution, then select a different legal ordering or surprising
   boundary case that answers the question. A full state graph is optional, not the
   default lesson. Preserve relevant guards and interleavings when simplifying; never
   invent transitions or combine individually legal edges into an invalid whole path.
   Name any deliberately hidden transitions.
6. Let the learner choose a legal next action, predict changed and unchanged values,
   then observe the result and locate its cause in the source. Explain why a tempting
   alternative is disabled. Treat a counterexample as evidence to investigate: check
   the expectation, assumptions and source mapping before deciding what it teaches.
   For liveness, explain the repeating cycle or stuttering suffix, not just its prefix.
7. Change one mechanism or assumption and predict again. Contrast the relevant paths
   after a real rerun, keeping other conditions comparable. Label hypothetical code
   changes as experiments rather than behavior of the original revision. A selected
   historical change can explain design rationale; use actual fixed revisions rather
   than inventing an evolution story.
8. Finish with a new execution to predict, a source walkthrough or an assumption to
   transfer to another setting. Assess the learner's causal explanation and its limits,
   not whether they found a bug, watched a replay or can repeat the formal syntax.

## Design the learning interaction

Use the existing reader's prose, source links, graphs, example traces and checks to
teach one relationship at a time. Unless TLA+ itself is the topic, introduce ordinary
state and action labels before revealing the corresponding formal definitions.

| Learning need | Present | Ask the learner |
| --- | --- | --- |
| Follow a normal execution | One path, state values and the current action's source range | What changes next, and what stays the same? |
| Understand concurrency | Two legal interleavings from the same starting conditions | Why do their observations differ, or why do they converge? |
| Understand a guard or atomic boundary | The relevant condition and source operation beside the current state | Why is this action possible here but not there? |
| Explain a design choice | Comparable original and changed models in separate sections/graphs | Which behavior does this mechanism permit or prevent? |
| Investigate an unexpected result | The actual trace and its assumptions, with source mapping | Which expectation or modeling decision should we recheck? |

For example, follow a queued task through execution, connection loss before its
acknowledgment, and redelivery. The lesson can explain intended at-least-once semantics
without claiming a defect. Connect each step to the chosen project's implementation;
if no source is supplied, clearly label it a teaching model. Finish by asking what
must change if the application needs a single externally visible effect.

## Keep the claims precise

- An invariant holds in every reachable state of the configured finite model. A
  liveness property describes entire behaviors; passing invariants alone does not
  establish progress. Fairness is an explicit scheduling assumption, not an automatic
  property of a service. Explain weak versus strong fairness when the lesson needs it.
- A complete finite run is evidence for that model and configuration. Record constants,
  constraints, symmetry/view reductions and unfinished exploration. Do not generalize
  a two-process check to arbitrary process counts or claim the implementation is proved.
  Exhaustive exploration means reachable states of that configured model, not every
  execution of the real project. Simulation or an unfinished run is not exhaustive.
- A counterexample may expose a design flaw, a bad assumption or a modeling mistake.
  When the model describes actual code, replay the path against that code before
  attributing the bug to it. A toy specification should be labeled as such.
  A mismatch does not by itself prove that the learner's understanding or the code is
  wrong. Observed execution traces can test source/model alignment for those traces;
  matching examples do not prove the model covers every implementation behavior.
- Stuttering permitted by `[Next]_vars`, terminal self-loops, and TLC's deadlock check
  have different roles. Do not treat turning off deadlock checking as a design fix.
- Generated diagrams and animation are views of evidence; the renderer verifies
  neither the model nor the implementation. An authored illustrative path is not a
  checked counterexample.

## Authoring tools and offline delivery

Read [Diagram Rendering](diagram-rendering.md) for Pele and source/view separation.
An available `statechart` skill can perform model checking, projection and reports;
follow its own instructions when using it. Teacher does not depend on another local
repository or its absolute path. Select its output for the learning question: normal
paths, alternative orderings and source-grounded explanations matter even when no rule
breaks. Its bug report is evidence, not the course outline. Without that integration,
the bundled small runner can capture direct TLC evidence using an explicitly supplied
tools JAR and Java:

```sh
TLA2TOOLS=/path/to/tla2tools.jar JAVA=/path/to/java \
  node <teacher>/scripts/check-model.mjs Counter.tla \
  --config Counter.cfg --out /new/evidence-folder
```

The output folder must be new or empty. The runner records input hashes and copies,
JAR hash, command, output, state dump and exit status. New captures also fingerprint
the raw log and DOT dump so later accidental changes are detected on import.
Exit 0 means a completed check,
1 a model violation, and 2 a tool/input/timeout error. These are authoring dependencies;
do not require the learner to install them just to read a delivered lesson.

When changing the runner, run `npm test --prefix <teacher>` with `TLA2TOOLS` and
`JAVA` supplied. Its real safety/liveness/deadlock, isolation, timeout and error tests
need that JAR; without it the optional model tests are reported as skipped.

Bundle the needed states, edges, counterexamples, sources, logs and rendered figures
inside the dedicated HTML reader. The offline experiment explores **precomputed TLC
results**; label that fact visibly. Do not offer an arbitrary TLA+ editor that pretends
to rerun TLC in the browser. Provide a reproducible real command or local script when
the learner wants to edit and check a model. Preserve raw results alongside explanatory
summaries, and keep reading progress separate from demonstrated mastery.
Raw records remain available for source comparison; do not append authoring run
inventories or verification/upgrade reports to the lecture. Counts matter only when
they explain the subject, such as state-space growth in a model-checking lesson.
Teach relevant assumptions and result boundaries where the learner reasons about
that behavior.

Use the shared `graphs`/`runs`/`traces` fields in
[Reader Authoring](reader-authoring.md). Mark authored demonstrations as `illustrative`.
A TLC graph references its actual export run; a counterexample separately references
the violating run and property. The builder checks legal paths and evidence references,
but it cannot establish that an author's JSON faithfully represents arbitrary TLC output.
Keep the extraction, raw logs and source/model mapping reviewable. Prefer the bundled
importer below for supported TLC output rather than manually reconstructing its paths.

## Import a check into the reader

Run the checker first, then import its evidence folder and build the course:

```sh
node <teacher>/scripts/import-model.mjs /new/evidence-folder \
  --id queue --view queue-view.mjs --out queue-model.json
node <teacher>/scripts/build-reader.mjs .learning/queue/course.json \
  --model queue-model.json --out learning-notes/queue/index.html
```

The course section uses `graph:"queue"`; `run:"queue-run"` opens that check's evidence.
The generated fragment includes complete model/configuration/log/DOT/result snapshots,
actual variable values and actions, automatic definition ranges, and a Pele diagram.
It generates shortest state-reaching paths in the exported graph, plus alternate
transitions for learning. These are labelled examples, not observed implementation
executions or counterexamples. Up to 80 candidates are listed; omitted candidates are
disclosed, while all imported edges remain available for free exploration.

For a violating run it also reads TLC's actual invariant/deadlock or temporal trace,
including an initially violated invariant and liveness loops/stuttering. It preserves
the reported action sequence; it does not independently claim temporal paths are
shortest. A run normally stops at its first reported violation. Import separate
configs/runs with different IDs when exploring other expectations; the importer does
not remove rules and rerun them automatically. If TLC does not identify an individual
failed temporal property, the reader keeps the result collective rather than guessing.

An optional author-owned view module exports:

```js
export const title = '连接如何恢复';
export const state = (vars) => vars.connected ? '已连接' : '等待重连';
export const step = (action, from, to) => ({Connect: '连接成功', Retry: '再次尝试'}[action] || action);
// Optional: override an action's range with a range in the course's fixed source snapshot.
export const source = (action) => action === 'Retry'
  ? {file:'connection.ts', start:40, end:48} : undefined;
```

`state` can return a string, an array of parent/child labels, or an object of parallel
dimension labels. The last form draws only actual combinations; it does not assert
that independent region states can be combined arbitrarily. Each function depends
only on its arguments and is called once per concrete state or edge. A view is trusted
local authoring JavaScript with the author's privileges, not sandboxed or imported from
untrusted project data. Without a view the diagram uses concrete state IDs.

Projection changes only the diagram. The reader always chooses and replays edges of
the concrete state, highlights its projected node and keeps exact variable values.
The full overview opens on demand; it does not precede every prediction with a large
state graph. Multiline view labels use `\n`; large figures retain their measured text
size in a keyboard-accessible horizontal scroll area rather than shrinking to fit.
Merged labels disclose membership counts. State marks report only actual log evidence:
an unmarked state is not a proof; mixed marks mean only some concrete members were
reported violating. A liveness cycle marks the trace's repeated segment, not a bad
state in isolation. Diagram palette and current-state focus follow Paper/White/Night.

The parser supports TLC 2.19 action-labelled DOT and full, plain-text traces as emitted
by the bundled checker. It reads safe integers, booleans, strings, tuples, records,
finite sets, model values and finite functions. Tuples use zero-based JS arrays;
sets use `{$set:[...]}`, model values `{$modelValue:"name"}` and finite functions
`{$function:[[key,value],...]}` so distinct TLA+ values are not silently conflated.
Unsupported syntax, missing actions/states and evidence inconsistencies fail explicitly.
`VIEW`/`SYMMETRY` reductions are rejected: their representative-state edges need a
separate refinement mapping before they can support exact concrete-state teaching.
Use a smaller unreduced model. Automatic operator ranges are navigation aids; review
them and supply explicit source ranges for the project implementation when appropriate.
Bounds: 32 MiB per file, 5000 concrete states, 20000 edges, 200 projected nodes and
500 projected arrows. Use a smaller/focused model when a limit is reached. The importer
does not evaluate TLA+, infer a faithful abstraction from arbitrary source, or prove
that the model describes the implementation. Old captures without log/DOT hashes are
accepted with their weaker provenance disclosed.

## Runnable teaching example

Use [model-learning-example](../assets/model-learning-example/course.json) and its
`Counter.tla`, `explore.cfg`, `expectation.cfg`, `view.mjs` and `expectation-view.mjs`. In a fresh authoring
scratch directory, with `TLA2TOOLS` and `JAVA` set, run these commands using the installed
skill path in place of `<teacher>`:

```sh
node <teacher>/scripts/check-model.mjs <teacher>/assets/model-learning-example/Counter.tla \
  --config <teacher>/assets/model-learning-example/explore.cfg --out explore-evidence
node <teacher>/scripts/check-model.mjs <teacher>/assets/model-learning-example/Counter.tla \
  --config <teacher>/assets/model-learning-example/expectation.cfg --out expectation-evidence
```

The second command exits 1 because `BothCounted` is violated; this is the expected
learning evidence, not a failed tool startup. Then import both and build:

```sh
node <teacher>/scripts/import-model.mjs explore-evidence --id counter \
  --view <teacher>/assets/model-learning-example/view.mjs --out counter.json
node <teacher>/scripts/import-model.mjs expectation-evidence --id expectation \
  --view <teacher>/assets/model-learning-example/expectation-view.mjs --out expectation.json
node <teacher>/scripts/build-reader.mjs <teacher>/assets/model-learning-example/course.json \
  --model counter.json --model expectation.json --out index.html
```

The three sections teach normal execution, alternative interleavings and investigation
of an expectation. Opening `index.html` is offline and needs no Java or Node. This is a
teaching model, not a claim about an unspecified open-source implementation.

The [official TLA+ tools overview](https://lamport.azurewebsites.net/tla/tools.html)
describes TLC's model-checking and simulation roles.

If TLC is unavailable, continue with clearly labeled illustrative modeling or a
smaller explanation, but do not claim checked results. Prefer the official
[TLA+ tools](https://github.com/tlaplus/tlaplus) and
[language introduction](https://lamport.azurewebsites.net/tla/tla.html) for references.
