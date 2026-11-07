# Reader Theme and Teaching Motion

Read when designing a course's appearance or when a relationship needs motion to become
clear. The reader remains Teacher's own product; Kami is a reference for paper, typography
and restraint, not a PDF template or a replacement for reader interactions.

## Reading themes

Use [reader-themes.json](../assets/reader-themes.json) as the authoring source for the
reader and figure palettes. Embed the selected palettes in the offline course.

- **Paper** is the default: warm parchment, near-black ink, warm neutral secondary text,
  and a restrained ink-blue accent, informed by Kami's long-reading style.
- **White** offers a brighter paper under the same typography and layout.
- **Night** is Teacher's warm-charcoal adaptation for low-light reading, not a stock
  Kami document theme. It appears only after the learner chooses it.

Use the same serif family for lesson headings and prose, with regular body text and a
moderate heading weight. UI chrome and source code can use sans-serif and monospace.
Adapt sizes and line spacing to screen reading; do not copy A4 print point sizes.
Use local font stacks with CJK coverage. Do not download or redistribute a commercial
font simply to reproduce a reference screenshot.

Keep accent color for actions, emphasis and relationships. Distinguish real success or
error states with words and semantic styling. Avoid turning every paragraph into a card
or adding ornamental rules. Hierarchy comes mainly from type size, space and content.

The selected theme applies to the whole reader: prose, outline, source view, QA, feedback,
and Pele figures. Generated SVG inherits the `--reader-*` palette variables. Keep figure
label fonts consistent with the fonts used for measurement; color changes need not
recompute geometry. Check actual labels and focus/selected/error states in every theme,
including continuous source-line highlights and readable syntax tokens. Prose inline
code and the full source reader have different surface roles.

Expose appearance settings progressively and keep their storage separate from course
progress. Switching theme must preserve the current step, paragraph, source position and
answers. If preferences cannot be saved, apply them for the current session and describe
that limit honestly. Do not switch to night merely because the OS uses a dark theme.
Keep appearance input groups, selectors and change handlers local to their own settings
surface. Test both directions alongside QA: selecting an answer leaves the theme alone;
switching theme retains the selected answer, checked result and reading position.

## Choose motion by the learning relationship

| Relationship | Suitable demonstration | What stays visible |
| --- | --- | --- |
| A request or data item follows a route | A token/edge progression along declared paths | Conditions, current step, and the work skipped on another path |
| A state changes or a retry occurs | Current-state emphasis plus labelled transitions | Trigger, guard, retry assumption and terminal outcome |
| An algorithm observes or updates data | Manually stepped snapshots, optionally played | Current index/value, comparison and reason to continue or stop |
| A physical or continuous relationship | An appropriate controlled model | Variable, constant conditions, units and teaching assumptions |

Use static views when structure or a short comparison is already clear. Statechart provides
state/event/guard and trace concepts; it does not supply Teacher's playback behavior.
Pele provides diagram geometry; the reader adds the teaching controls.

For model learning, keep the current scene visible beside its path selector,
playback controls, variable changes and action's source link. The bundled player
focuses the existing Pele geometry on the current transition; full-graph viewing
is secondary. Arrow emphasis and a one-shot token follow the selected concrete
edge. If a projection hides that transition or several arrows are ambiguous,
explain the observed variable change without inventing a route. Multiple active
resources stay represented in the same concrete state; motion does not assign
unmeasured durations to independent work.

## Playback behavior

- Start static. Never autoplay when a chapter, figure, theme or comparison panel opens.
- Offer play/pause, previous/next observation and reset. Manual stepping pauses first;
  reset returns to the initial static observation. A replay is an explicit action.
- Keep one playback/step toolbar, one observation counter and one current-frame reasoning
  announcement. A separate overall takeaway should add context rather than repeat it.
- An explicit play action may bring the toolbar and figure into view once. Keep controls
  clear of sticky chrome; advancing observations must never keep scrolling the reader.
  Frequently replaced experiment-state DOM can trigger the browser's scroll anchoring
  even without an explicit scroll call. Exclude that volatile panel with
  `overflow-anchor: none` when needed; preserve normal anchoring for the reading text.
- Derive allowed transitions, active nodes/edges and current-step text from the same
  semantic scene. Move a token along existing SVG geometry and stable IDs instead of
  maintaining separate hand-authored coordinates.
- Describe prearranged teaching traces as teaching demonstrations. Their durations are
  not measured execution latency; their frames are not logs from running the project.
  Do not claim a model was verified unless the model checks were actually performed.
- Respect reduced-motion preferences with static/manual access to the same information.
  Keep the reading position and keyboard focus stable as observations change.
- Pause/cancel active work when the page becomes hidden, the learner changes a scenario,
  path or lesson, or the active figure is replaced. Cancel timers and animation frames;
  an old callback must never update a new lesson or a detached comparison instance.
- Permit only one demonstration to play on a page. Entering/leaving source comparison
  preserves the main paragraph and leaves a clear, stable observation.
- Motion never marks a lesson mastered, completes a quiz or advances the main course.

Inspect play/pause/step/reset, rapid scene changes, hidden-page behavior and reduced motion
in a real browser. Check that repeated use does not accumulate tokens, timers or duplicate
SVG IDs, and that offline reopening keeps appearance and learning progress independent.
