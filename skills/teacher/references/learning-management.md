# Learning Management — Directory Structure & Formats

Persistent file structure for tracking learning across sessions and topics.
Read this when setting up a new learner or resuming an existing one.

## Directory Structure

```
LEARNING.md                           # Cross-agent entry point

.learning/                            # Internal state (hidden)
├── manifest.md                       # Index of all topics
├── <topic-slug>/                     # One directory per topic (kebab-case)
│   ├── meta.md                       # Materials, starting level, session log
│   ├── learning-checklist.md         # Progress checklist (deleted when topic completes)
│   └── discussion-notes.md           # TA-captured discussion insights

learning-notes/                       # Human-facing deliverables (visible)
├── <topic-slug>/                     # One directory per topic
│   ├── index.html                    # Table of contents + overview
│   ├── 01-<section>.html             # Chapter HTML artifacts
│   ├── 02-<section>.html
│   ├── ...
│   └── XX-extended-<topic>.html      # Extended exploration (if any)
```

HTML artifacts (generated via `/html-artifact` skill) replace the old markdown
chapter files. They are self-contained, navigable, and professional.

TA discussion notes (`.learning/<topic-slug>/discussion-notes.md`) capture
insights from deep discussions — not lecture content, but what emerged when
the learner and teacher dug deeper.

## LEARNING.md — Cross-Agent Entry Point

`LEARNING.md` sits at the project root. Any AI agent reads it first to know
there are active learning sessions.

### Format

```markdown
# Learning Sessions

This project has learning sessions managed by the `/teacher` skill.

## Active Topics

| Topic | Status | Progress | Notes |
|-------|--------|----------|-------|
| [gstack](learning-notes/gstack/) | in-progress | 8/12 | Architecture done, ethos next |

## Completed Topics

| Topic | Notes |
|-------|-------|
| [rust-async](learning-notes/rust-async/) | Completed 2026-06-05 |

## How to Continue

To resume or start a learning session, invoke the `/teacher` skill.
The skill reads `.learning/manifest.md` for full state.
```

### Agent instruction file pointers

After creating `LEARNING.md`, ensure the current agent's instruction file
has a pointer. Also add to other agent files that already exist.

| Agent | File | If missing | If exists but no pointer | If pointer present |
|-------|------|------------|--------------------------|-------------------|
| Claude Code (current) | `CLAUDE.md` | Create with pointer | Add pointer | Skip |
| Codex / OpenAI | `AGENTS.md` | Skip | Add pointer | Skip |
| Gemini | `GEMINI.md` | Skip | Add pointer | Skip |
| Cursor | `.cursorrules` | Skip | Add pointer | Skip |

**Pointer format (Markdown files):**
```markdown
## Learning

See [LEARNING.md](LEARNING.md) for active learning sessions.
```

**Pointer format (`.cursorrules`):**
```
## Learning
See LEARNING.md for active learning sessions.
```

**Idempotency:** Before adding, grep for `LEARNING.md`. If present, skip.

**Implementation:**
```bash
for f in CLAUDE.md AGENTS.md GEMINI.md .cursorrules; do
  if [ -f "$f" ]; then
    grep -q "LEARNING.md" "$f" || echo -e "\n## Learning\n\nSee LEARNING.md for active learning sessions." >> "$f"
  fi
done
if [ ! -f CLAUDE.md ]; then
  echo -e "## Learning\n\nSee [LEARNING.md](LEARNING.md) for active learning sessions." > CLAUDE.md
elif ! grep -q "LEARNING.md" CLAUDE.md; then
  echo -e "\n## Learning\n\nSee [LEARNING.md](LEARNING.md) for active learning sessions." >> CLAUDE.md
fi
```

## manifest.md

Entry point. Read it first to determine new vs. returning learner.

```markdown
# Learning Topics

| Topic | Status | Progress | Last Session | Notes |
|-------|--------|----------|--------------|-------|
| [gstack](gstack/) | in-progress | 8/12 | 2026-06-07 | Arch + skills done, ethos next |
| [rust-async](rust-async/) | completed | 6/6 | 2026-06-05 | |
```

- **Status**: `in-progress` or `completed`
- **Progress**: checked / total checklist items
- **Last Session**: date of most recent session
- **Notes**: brief context for quick scanning

## meta.md

Learner context and materials, persisted across sessions.

```markdown
# <Topic Name>

## Learner Profile
- **Starting level:** <from initial assessment>
- **Background:** <relevant context>

## Materials
- Repository: https://github.com/...
- Docs: /path/to/local/docs
- (any URLs, paths, or resources the human provided)

## Session Log
| Session | Date | Sections Covered | Notes |
|---------|------|------------------|-------|
| 1 | 2026-06-07 | Sections 1-5 | Interactive mode |
| 2 | 2026-06-09 | Sections 6-8 | Extended: deep dive on X |
```

## learning-checklist.md

Standard Markdown checklist, tailored per topic. Example:

```markdown
# Learning Checklist — <Topic>

## The Problem
- [ ] What the problem is
- [ ] Why the problem existed
- [ ] The different approaches considered

## The Solution
- [ ] What the solution does
- [ ] Why this approach was chosen
- [ ] Key design decisions and rationale
- [ ] Edge cases and how they're handled

## Broader Context
- [ ] Why this matters to the system/product
- [ ] What the changes will impact
- [ ] Related areas that might be affected
```

Kept while `in-progress`. Deleted when marked `completed`.

## discussion-notes.md

TA-captured insights from deep discussions. Appended across sessions.
See `references/ta-subagent.md` for format and dispatch protocol.