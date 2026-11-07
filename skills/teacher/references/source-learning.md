# Source Learning

Use when understanding depends on how a real repository implements a mechanism.
Keep the lecture as the path through the material; source browsing answers the
question raised by the current explanation.

## Select a bounded snapshot

1. Identify the entry point, core decisions, relevant calls and evidence/tests for
   this learning goal. Read those files before explaining behavior.
2. Capture the complete relevant files. Do not preload the whole repository or
   manufacture placeholder lines around a quoted fragment.
3. For Git sources, resolve one immutable revision, then read each selected file
   from that revision (`git show <resolved-sha>:<path>`). If teaching local changes,
   explicitly label the captured working tree and its relation to the base revision.
4. Store each file verbatim in `sources[file].text`, with language and an `origin`
   describing the path/revision or supplied material. The builder computes a SHA-256
   content fingerprint and rejects a supplied fingerprint that does not match.
   This fixes the presented content; it does not prove implementation behavior.
5. Review for credentials or unrelated sensitive content before packaging a full
   file. Select another boundary or explicitly explain an omission when a complete
   file cannot be shared; never silently call a redacted excerpt the full file.

## Make the code explorable

The reader includes full-file selection, line numbers, range highlighting, wrap,
copy, source back/forward and a return to the exact lecture position. Browsing source
does not change the lesson. Narrow screens use explanation/source tabs.

- Put a `source: {file, start, end}` on the section, and additional source buttons
  next to the claims they support. Line numbers are one-based and refer to the fixed
  complete file. The builder rejects missing files and invalid ranges.
- Declare `symbols` for important definitions. Each has a stable `id`, reader-friendly
  `label`, `start` and `end`; the definition selector jumps within the complete file.
- Declare explicit `links` at meaningful call sites: `{line, token, target:{file,
  start,end}}`. The token must occur on that line. Cross-file jumps and the source
  history preserve context. Use a qualified token when a short name is ambiguous.
  Link declarations are ordered by their position in the source during building;
  repeated tokens consume occurrences left to right. Overlap or missing occurrences
  is an authoring error rather than a silently missing jump.
  Do not make every identifier clickable or guess a target.
- The reader does not fetch missing files. Add a relevant file deliberately during
  authoring and rebuild if a new learning goal needs it.

See [Reader Authoring](reader-authoring.md) for the data contract and
`assets/example-course.json` for an executable two-file teaching example.

## Connect explanation to execution

Trace one actual input: what state is read, which condition selects the path, what
changes, what is returned, and which calls are skipped. Link the figure and source
range to this same example. Distinguish static dependency from runtime order, and
function boundaries from atomicity or transaction boundaries.

When state or concurrency is the difficult part, read [Model-driven Learning](model-driven-learning.md).
Build a compact source/model mapping for the chosen scenario: the state being observed,
the operation that changes it, the enabling condition, the source range and the reason
for its atomicity boundary. Mark assumptions and omitted detail. Preserve the relevant
control flow and interruption points without translating every unrelated code line.
Use this mapping to explain ordinary and alternative legal executions, not only failures.

If a historical change explains the mechanism, compare a small number of relevant,
immutable revisions. Keep each full-file snapshot and its line links tied to its own
revision; show what changed in the behavior and which evidence supports the explanation.
Do not mix old line numbers with new files or turn a targeted lesson into a tour of
the entire Git history.

Ask the learner to find the next call, explain a guard, predict an edge case, or map
a changed condition to the code. For an open-source project, record the revision and
observed tests/run evidence in authoring materials rather than treating a plausible
diagram as evidence. Use relevant observations to explain behavior; do not turn their
test totals, environment details or execution history into a lecture section.
If a model describes the implementation, replay its counterexample against the real
code before attributing a bug to it.
