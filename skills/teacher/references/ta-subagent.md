# Teaching Assistant (TA) Subagent — Discussion Capture

The TA captures insights from deep discussions between teacher and learner.
It does NOT write chapter files — HTML artifacts handle lecture content.

## When to Dispatch

During substantive discussions in either mode — when the learner and teacher
go beyond surface Q&A into exploring nuances, resolving confusions, or
uncovering deeper insights. Not every question warrants a TA; dispatch when
the discussion yields something worth remembering for future sessions.

## How to Dispatch

Use `Agent` with `run_in_background: true`. Pass:

- The discussion topic and context (which section/checklist item triggered it)
- The learner's questions (compressed)
- The teacher's explanations and approach
- How confusions were resolved
- Any analogies, code snippets, or examples that emerged
- The topic slug

## Output

Appends to `.learning/<topic-slug>/discussion-notes.md`. Create the file if
it doesn't exist. Each entry follows this format:

```markdown
## [Session Date] — <Discussion Topic>

**Trigger:** <what prompted this discussion — which section, what question>

### Key Insights
- <insight 1>
- <insight 2>

### Confusions & Resolutions
- **Confusion:** <what the learner struggled with>
  **Resolution:** <how it was clarified>

### TA Observations
- <patterns, gaps, or connections the TA noticed>
```

## Prompt Guidelines

- Keep it lean — only this discussion, not the entire session
- Focus on substance: what was learned, what was hard, what clicked
- Don't transcribe verbatim; compress while preserving meaning
- TA observations are the most valuable part — what patterns does it see?