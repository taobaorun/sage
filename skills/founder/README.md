# founder

> Apply an AI-native startup playbook to guide founders across the four lifecycle stages — Idea, MVP, Launch, Scale.

**Other languages**: [中文](./README.zh-CN.md)

## What it does

A founder-oriented skill that:

- Identifies which stage of the startup lifecycle a founder is in
- Surfaces stage-specific exit criteria, failure modes, and recommended exercises
- Maps each task to the right AI surface (ChatBox / Cowork / Code Agent)
- Pushes back on premature launching, scaling, or stage-skipping
- Knows its scope — declines fundraising / legal / tax questions and redirects to specialists

Adapted from Anthropic's *The Founder's Playbook: Building an AI-Native Startup* (2026), generalized away from any single AI vendor.

## When the skill triggers

This skill should be invoked when a user asks about:

- AI-native startup strategy
- Founder orchestration with AI tools
- Startup-stage exit criteria or stage transitions
- Agentic tech debt, premature scaling, or false product-market fit
- How to pick the right AI surface for a task (conversational chat vs collaborative workspace vs agentic coding)
- Building defensible moats (data flywheels, workflow lock-in, domain depth)

It also triggers for early operators helping founders architect AI-first companies.

## Install

Claude Code loads skills from `~/.claude/skills/<skill-name>/`. Install by placing this skill there.

**Option A — copy the files:**

```bash
mkdir -p ~/.claude/skills/founder
cp SKILL.md ~/.claude/skills/founder/
cp -r references ~/.claude/skills/founder/
```

**Option B — symlink (recommended for development):**

```bash
ln -s "$(pwd)" ~/.claude/skills/founder
```

**Option C — clone directly into the skills directory:**

```bash
git clone <repo-url> ~/.claude/skills/founder
```

After install, restart Claude Code (or start a new session). The skill will be discovered automatically and listed in `/skills`.

## Uninstall

```bash
rm -rf ~/.claude/skills/founder
```

## Structure

```
founder
├── SKILL.md                  # Main router: stage identification + AI surface matrix + cross-stage principles
└── references/
    ├── idea-stage.md         # Validating problem, customer discovery, lightweight prototypes
    ├── mvp-stage.md          # Architecture, scope, security, PMF detection
    ├── launch-stage.md       # Tech debt remediation, ops systems, security/compliance, PM processes
    └── scale-stage.md        # Delegation, enterprise infra, GTM, defensible moats
```

## How it works

Claude Code skills use **progressive disclosure** — only what's needed is loaded into context:

1. **Always loaded** (~100 words): the `name` and `description` in `SKILL.md` frontmatter. Claude uses this to decide whether to invoke the skill at all.
2. **Loaded when triggered**: the full `SKILL.md` body — the router. Contains the stage-identification logic, the AI surface matrix, and cross-stage principles.
3. **Loaded on demand**: a single file in `references/` — only the stage relevant to the user's question.

Runtime flow when a founder asks a question:

```
Founder's question
       │
       ▼
[Description matches? → Claude invokes the skill]
       │
       ▼
Read SKILL.md
       │
       ▼
Stage identification ───────▶ Question out of scope?
       │                              │
       ▼                              ▼
Read references/<stage>.md   Redirect to a specialist
       │                     (lawyer / lead investor / operator)
       ▼
Combine:
  • Stage-specific guidance
  • Cross-stage principles (validation first, AI as devil's advocate, ...)
  • AI surface recommendation (ChatBox / Cowork / Code Agent)
       │
       ▼
Direct answer to the founder
```

Two design choices to know about:

- **Stages are gates, not labels.** The skill uses each stage's *exit criteria* to determine where a founder actually sits, even if they self-describe differently. A founder shipping a polished prototype to friends — without real prospective-user evidence — is still in Idea stage, regardless of how finished the artifact looks.
- **Boundaries are enforced.** When a question falls outside the skill's domain (fundraising mechanics, jurisdiction-specific legal/tax, HR), the skill explicitly declines and redirects to the right specialist rather than hallucinating advice in a high-stakes specialist domain.

## The four stages at a glance

| Stage | Guiding question | Exit criterion |
|---|---|---|
| **Idea** | Is this worth building? | Problem-solution fit (real problem, real users, real evidence) |
| **MVP** | What exactly should we build first? | Genuine PMF — users return, pay, or refer |
| **Launch** | Can we grow this predictably? | Repeatable channel-driven growth + production-ready infra + ops without founder bottleneck |
| **Scale** | Can this sustain itself? | Threshold event — profitable / IPO-ready / acquisition-ready, without founder personally running ops |

## AI surface matrix (generalized)

| Surface | Use for | Why |
|---|---|---|
| **ChatBox** | Quick questions, brainstorms, devil's advocate | Conversational, no setup |
| **Cowork** | Research, document drafting, recurring ops | Folder access, MCP connectors, scheduled runs |
| **Code Agent** | Writing, testing, shipping software | Codebase access, plan mode, git integration |

Same model underneath — what changes is the workspace around it.

## Out of scope

The skill explicitly does NOT cover:

- Fundraising mechanics (term sheets, cap tables, valuation negotiation)
- Hiring / HR specifics
- Jurisdiction-specific legal or tax advice
- Industry-specific regulatory compliance

For these, the skill redirects to qualified specialists (startup lawyer, lead investor partner, experienced operator, etc.) rather than hallucinating specifics.

## License

MIT
