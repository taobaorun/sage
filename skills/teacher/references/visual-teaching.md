# Visual Teaching

Read before preparing an explanation or chapter. The goal is to reduce the learner's
reasoning effort: show the relationship they would otherwise have to reconstruct from prose.
For reader appearance and animated explanations, also read
[Reader Theme and Teaching Motion](reader-theme-and-motion.md).

## Build an understandable explanation

1. State one question the learner should be able to answer afterward.
2. Start with a small, concrete situation. Keep the same names, values, and entities across
   prose, figures, code, and review questions.
3. Explain the core idea in everyday language; define unfamiliar terms at first use.
   Put prerequisites before the step that needs them. Explain where an analogy stops applying.
4. Identify the difficult relationship and choose a visual that exposes it. Nontrivial
   technical structure or behavior should have a diagram, unless the user requests text-only.
   A definition, a one-step answer, or a short code example may already be sufficient.
5. Place the figure beside the relevant explanation. Give a reading cue, walk the concrete
   example through the figure, and state the conclusion it supports.
6. Ask a transfer question: trace another input, change a condition, or explain a failure.
   If the learner is stuck, simplify the example or reveal one step at a time before adding detail.

## Choose the figure by the question

| What the learner needs to understand | Useful visual | What to make explicit |
| --- | --- | --- |
| What exists, who owns what, what connects | Architecture or component diagram | Boundaries, responsibilities, directional dependencies |
| What happens next, including decisions | Flowchart | Entry, conditions, branches, outcomes |
| Who calls whom, in what order | Sequence diagram | Participants, request/return order, synchronous vs asynchronous work |
| Where data comes from and how it changes | Data-flow diagram | Inputs, transformations, stores, consumers |
| How something changes status | State diagram | Initial state, transition triggers, retries, terminal states |
| What a fix or design choice changes | Before/after pair | Same input and labels; the changed path and its effect |
| Why a structure or algorithm works | Annotated structure or execution snapshots | One sample input and the changed values at each step |
| How quantities vary together | Plot or parameter experiment | Axes, units, assumptions, what is held constant |
| A spatial, physical, or abstract intuition | Educational illustration or visual analogy | Relevant parts, causal relationship, limits of the analogy |
| How nontechnical choices or ideas relate | Comparison, timeline, or concept map | Concrete alternatives, criteria, order, or causal links |

Use the smallest figure that answers the question. Split a crowded map into an overview
and a focused detail view. Add another figure only when it teaches a different relationship.
Do not substitute decorative covers, generic stock images, or boxes that merely repeat headings.

## Select available skills and tools

Inspect the current environment's skill catalog and tools. Load the selected skill before
using it. These integrations are optional capabilities, not installation prerequisites:

- **Precise technical diagrams:** use Mermaid semantic source rendered by the pinned Pele
  generator. Read [Diagram Rendering](diagram-rendering.md) for the working command,
  Teacher theme, wide/narrow variants, scoped IDs, and statechart-inspired modeling rules.
  Embed the generated SVG in Teacher's dedicated reader. Diagram source, current teaching
  step and path explanation must describe the same model; a raw Mermaid code block is not
  a rendered figure. Do not route Teacher lessons through `html-artifact`.
- **Educational bitmap illustrations in Codex:** when an illustration, physical scene,
  cutaway, or visual metaphor helps, load `imagegen` and use the available built-in image
  tool. Supply the learning goal, required entities and relationships, learner level,
  exact short labels if needed, and what the picture must not imply. Generate the actual
  asset rather than delivering only a prompt. Built-in image generation does not require
  asking the learner for an API key. Follow the loaded skill for any separate API/CLI path.
- **Exact topology and text:** prefer Pele diagrams for dense labels, call order,
  or source-specific relationships. Image generation can support intuition; inspect its
  arrows, labels, counts, and causal claims before using it. Honor an explicit request for
  a generated diagram and apply the same correctness checks.
- **Interactive understanding:** use `visualize` or an appropriate HTML interaction when
  changing a variable or stepping through a process materially helps. Show one useful
  initial state, visible results, and usable controls. A static figure is enough otherwise.
- **Unavailable tools:** describe the relationship in text and briefly disclose an unavailable
  generator or image tool. Dependency installation belongs to authoring, never to opening
  an already delivered offline course. Do not relabel a hand-drawn replacement as Pele output,
  require installing optional skills,
  switch silently to an external paid API, or claim to have generated or inspected an image.
  If the user explicitly requires an unavailable medium, explain the gap and offer the alternative.

Keep the lecture's format, language, and navigation. Diagram tools supply teaching figures;
their standalone viewers do not replace the chapter narrative. Do not impose a mascot,
illustration style, or extra artifact unless the lesson or learner calls for it.

## Teach the figure

Each instructional figure needs these nearby elements, expressed naturally:

- **Question:** what should I look for?
- **Reading cue:** where to start; what arrows, colors, lines, or regions mean.
- **Walk-through:** follow the same worked example through the relevant steps or parts.
- **Takeaway:** what this establishes and what the simplified view leaves out.

For example, a beginner's cache lesson can use an illustrative product request:
“We ask for product 42. First look in the cache, a place holding an earlier result.
Follow the hit branch to return it; follow the miss branch to the data store, then save
the result for next time.” Draw those two branches, explain them beside the figure,
and ask which steps repeat on the next request. State that this example omits expiry
and updates; introduce those when teaching freshness. A box labeled “cache” alone
does not explain the benefit or the two paths.

For a real codebase, derive the paths from the supplied source rather than copying this
example. Clearly label hypothetical or simplified diagrams; keep unverified relationships
out of diagrams presented as descriptions of the implementation.

## Check before delivery

- **Meaning:** every node, edge, condition, and label agrees with the example and, where
  applicable, the source. Distinguish dependencies from runtime calls and data movement.
  Do not invent services, guarantees, or failure handling to make a diagram look complete.
- **Clarity:** the main path is easy to find; terms have been introduced; labels are legible
  at the chapter's reading size; arrows are unambiguous. Do not rely on color alone.
- **Accessibility:** use meaningful alternative text or an SVG title/description, plus a
  textual explanation of the key relationship. A figure is not the only source of a fact.
- **Packaging:** embed final SVG or image data into the self-contained HTML chapter.
  Keep reusable image files under `learning-notes/<topic-slug>/assets/` when needed;
  never leave a chapter dependent on temporary files, private generator paths, or a CDN renderer.
- **Actual output:** inspect the rendered chapter and any generated images using supported
  viewing tools when available and permitted. Check text, arrows, clipping, and a narrow layout. Correct
  errors before delivery; state any viewing limitation instead of claiming a visual pass.
- **Learning:** the worked example and review question test the relationship, not recall of
  diagram labels. If the chapter remains hard to follow, simplify its explanation and figure.
