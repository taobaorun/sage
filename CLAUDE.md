# sage-skills

A curated collection of engineering skills for AI coding agents.

## Project Structure

```
skills/       → Core skills (SKILL.md per directory)
agents/       → Reusable agent personas
hooks/        → Session lifecycle hooks
.claude/commands/ → Slash commands
references/   → Supplementary reference material
docs/         → Setup guides
```

## Skills

- **teacher** — Interactive mastery-based teaching. Use when the user wants to deeply understand code, PRs, bug fixes, or technical topics.
- **html-artifact** — Single-file HTML artifact generation with a professional design system. Use for specs, reports, diagrams, prototypes, and any deliverable meant for human consumption.

## Conventions

- Every skill lives in `skills/<name>/SKILL.md`
- YAML frontmatter with `name` and `description` fields
- Description starts with what the skill does, followed by trigger conditions ("Use when...")
- References are in `references/`, not inside skill directories (unless skill-specific)
- Supporting files only created when content exceeds 100 lines