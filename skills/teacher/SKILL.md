---
name: teacher
description: >
  Teach a topic, codebase, project mechanism, change or design through concrete examples,
  purposeful visuals, source comparison and understanding checks. Use for teach me,
  explain, walk me through, onboarding, structured self-study, quizzes, or learning an
  open-source project. Produces a dedicated offline course reader when durable notes
  are useful; can use TLA+/TLC to explore the learning subject's behavior.
---

# Teacher

Help the learner explain **why something works**, predict what happens, and apply it to
another situation. Work from their background, one learning goal at a time. Introduce
terms when a concrete example needs them. If an explanation is hard to follow, simplify
its example, structure or figure before adding more terminology.

Keep the course about its learning subject, including after revisions. Do not insert
authoring reports, test totals, tool/runtime versions, validation scope, release status
or accounts of what changed this round. Retain production and verification records in
authoring materials. Explain assumptions, boundaries and observations in the lesson
only when they help the learner understand the subject or qualify a specific claim.

## Choose the size of the session

- A brief clarification, a one-line answer or an explicitly text-only request stays that
  size. It needs no new course, learning-state directory or tool installation.
- For structured learning, reuse the mode, language, background and topic already supplied.
  Ask only for information that changes the teaching approach. A request for a complete
  self-study reader supplies Lecture mode; a step-by-step dialogue supplies Interactive.
- When those choices remain unclear, offer Interactive versus Lecture and ask for the
  missing language/background using the host's question UI. Do not repeat an assessment
  the learner has already given.

Before a structured session, read [Learning Management](references/learning-management.md)
and inspect `.learning/manifest.md`. Resume the matching topic and its unchecked goals;
add related subtopics to that topic. Create a new topic only for a genuinely different
subject. Skill maintenance itself is not a new learning session.

## Prepare a learning path

For each section, decide:

1. The question the learner should be able to answer afterward.
2. One concrete example, with consistent names and values.
3. The likely confusion and the relationship that needs to become visible.
4. The evidence or source that supports the explanation, and what it leaves out.
5. A prediction, explanation or transfer task that distinguishes understanding from recall.

Read [Visual Teaching](references/visual-teaching.md) when preparing explanations or
course material. Structure, order, state and cause need a suitable visual when one
reduces reasoning effort. Place it beside the explanation, explain how to read it,
walk the same example through it, and state the takeaway.

Choose capabilities by the learning question; they are not mandatory stages:

| Need | Read / use |
| --- | --- |
| Durable lecture or section notes | [Reader Authoring](references/reader-authoring.md), bundled `scripts/build-reader.mjs` |
| Understand a repository or implementation | [Source Learning](references/source-learning.md), full relevant file snapshots |
| Precise architecture, flow, sequence or state diagram | [Diagram Rendering](references/diagram-rendering.md), pinned Pele |
| An illustration or spatial intuition | Visual Teaching tool routing; use `imagegen` in Codex when a bitmap is appropriate |
| Explore alternatives, concurrency, retries or progress | [Model-driven Learning](references/model-driven-learning.md), optional real TLA+/TLC and bundled `scripts/import-model.mjs` |
| Appearance or controlled playback | [Reader Theme and Motion](references/reader-theme-and-motion.md) |

When teaching a project, ground the lesson in its actual code and documentation. Keep
observed behavior, teaching simplifications and assumptions distinct. A source excerpt
alone is insufficient when the learner needs to follow the implementation.
For stateful mechanisms, use a source-grounded model to make the learner's understanding
explicit: predict, explore alternative executions, explain the source, then change one
condition. Normal behavior and design rationale are first-class learning material;
finding a bug is not a completion criterion. Keep formal syntax secondary unless it is
the subject being learned.

## Teach, check, adapt

### Interactive

Explain the current section using the example, relevant source and figure. Ask the
learner to predict a result or explain the relationship in their own words. Fill the
specific gap their answer reveals, then ask a transfer question. Continue discussion
at their pace.

Update the section in the same course reader as understanding develops. Keep stable
section and quiz IDs so rebuilding retains useful browser progress. Read
[TA Capture](references/ta-subagent.md) for substantive discussions worth remembering.
Use available delegation when that protocol applies; if it is unavailable, capture the
same concise notes in the current session.

Advance the mastery checklist when the learner demonstrates the goal through an
explanation, source walkthrough or transfer task. An incorrect answer calls for
another example or a smaller step, not more definitions.

### Lecture

Prepare the whole learning path and build all sections into one course reader. Each
section includes a motivating question, plain-language explanation, worked example,
useful visuals/source links, and understanding checks. Use a few varied questions that
probe the section's goal; free-text predictions and hints can complement single choice.
End with an independent application or model/code change when appropriate.

Open `learning-notes/<topic>/index.html` when the environment allows. Let the learner
study freely, skip checks and return with questions. Generating the course leaves the
mastery checklist unchecked. When they return, diagnose the specific confusion and
improve the corresponding course section, then rebuild it.

## Deliver through Teacher's reader

Read [Reader Authoring](references/reader-authoring.md) before building. Use Teacher's
bundled renderer and design resources. The default is one self-contained offline
`index.html` per course, a chapter outline with stable hash links, and Paper appearance
with optional White/Night. Reading stays primary; source comparison, evidence,
settings, hints and answers open on demand. Teacher owns this design; do not route
courses through `html-artifact`, Kami templates or another report viewer.

Keep durable authoring data at `.learning/<topic>/course.json`. Build with:

```sh
node <teacher-skill>/scripts/build-reader.mjs .learning/<topic>/course.json \
  --out learning-notes/<topic>/index.html
```

Resolve the renderer from the installed skill, rather than another course or prototype.
When resuming historical material, keep its established authoring-data path until an
update calls for integration with the reader.
Dependencies belong to authoring: reading the delivered HTML needs no Node, Java,
server, network, CDN or external font. Existing separate chapter artifacts remain
readable; integrate them only when the learner requests an update.

Source learning uses selected **complete files at a fixed snapshot**, one-way lecture
links, definition jumps, source history and an exact return to the reading position.
Model exploration uses declared states and legal edges. A TLC counterexample needs an
actual violating run; an illustrative path stays labeled illustrative. The reader
presents precomputed evidence. Actual model edits are checked with the authoring tools.

## Verify and preserve learning

Before delivery, validate the course with the builder and exercise affected behavior
in a permitted real browser: chapter navigation, source locations and return, QA,
themes, model paths, narrow layout, reduced motion and offline reopening as applicable.
Inspect actual figures for meaning and legibility. State a viewing limitation when
verification is unavailable in the delivery reply instead of claiming a visual pass;
do not append that production note to the course. Do not automate a personal browser
contrary to the repository's rules.

Reading progress, checked questions and demonstrated mastery are separate. Browser
records are conveniences; `.learning/<topic>/learning-checklist.md` records learning
evidence confirmed in discussion. Do not infer mastery from animation, scroll, answer
counts or course generation. Revisit a checked goal when later evidence reveals a gap.

After a structured session, update `meta.md`, the checklist, `manifest.md` and
`LEARNING.md` using Learning Management. Record what was prepared versus what the
learner actually demonstrated. When all goals are demonstrated, ask for a coherent
walkthrough connecting the problem, mechanism, edge cases and impact, then offer
further exploration. Mark completed only when no required learning goals remain.
