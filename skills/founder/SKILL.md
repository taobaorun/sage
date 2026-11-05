---
name: founder
description: >-
  Apply an AI-native startup playbook to guide founders across the four lifecycle stages (Idea, MVP, Launch, Scale): validating problem hypotheses, designing customer discovery, defining MVP architecture/scope to prevent AI-generated tech debt, distinguishing genuine product-market fit from early hype, building agentic operating systems that replace founder attention, and constructing defensible moats (data flywheels, workflow lock-in, domain-specific depth). Use when a user asks about AI-native startup strategy, founder orchestration with AI (ChatBox, Code Agent, Cowork), startup-stage exit criteria, agentic tech debt, premature scaling, or how to pick the right AI surface (conversational chat vs collaborative workspace vs agentic coding) for a given task. Also use for early operators helping founders architect AI-first companies from day one.
allowed-tools: Read, Bash
---

# Founder: AI-Native Startup Playbook

A playbook for founders building AI-native startups. Adapted from Anthropic's *The Founder's Playbook: Building an AI-Native Startup* (2026), generalized away from any single AI vendor.

## Core premise

The founder's job hasn't changed: find a real problem, build something that solves it, scale it into a company that matters. What's changed is that AI compresses quarters into weeks — and the bottleneck has shifted from *what you can build* to *what you choose to build*.

Two shifts shape every recommendation in this skill:

1. **Founder role: IC → orchestrator.** In an AI-native startup, the founder spends less time as individual contributor and more time directing systems (AI agents, tools, a small team). Attention moves up the stack to higher-order work: which problem, which user, which moat.
2. **AI is leverage, not strategy.** Agentic tools will build a *wrong* product with the same enthusiasm as a right one. The intelligence in the system is the founder's. Sense-making must stay ahead of building.

## How to use this skill

When a founder (or someone advising one) asks for guidance:

1. **Identify the stage.** Use the decision tree below. If unclear, ask the user one or two diagnostic questions before continuing.
2. **Read the matching reference file** in `references/` before giving stage-specific advice. Each reference contains stage goals, exit criteria, failure modes, and concrete exercises.
3. **Cross-reference the AI Surface Matrix** below when recommending tools — different surfaces solve different problems.
4. **Surface the relevant failure mode** when you spot one. Founders rarely notice they're in a failure mode at the moment they enter it; naming it is half the fix.

Don't dump the whole playbook on the user. Pull only what's relevant to the question they actually asked.

## Stage identification

Ask yourself: *what is the founder currently trying to prove?*

| If they're trying to prove... | They're in stage | Read |
|---|---|---|
| Whether a real problem exists worth solving | **Idea** | `references/idea-stage.md` |
| Whether real users find their solution valuable enough to use, return to, pay for | **MVP** | `references/mvp-stage.md` |
| Whether the business can grow predictably, not just retain | **Launch** | `references/launch-stage.md` |
| Whether the company can sustain itself without the founder personally holding every thread | **Scale** | `references/scale-stage.md` |

A common mistake: founders skip ahead. Someone shipping a polished prototype to friends without ever talking to a real prospective user is still in Idea stage, not MVP — they haven't validated the problem, they've just built a thing. Use the *exit criteria* in each stage reference as the gate, not vibe.

## AI Surface Matrix

Three surfaces, same underlying model — what changes is the workspace around it.

| Surface | Reach for when... | Why |
|---|---|---|
| **ChatBox** (conversational chat) | Quick question, rewrite, brainstorm, sanity-check, devil's advocate | Fast, conversational, no setup. The constant small tasks of running a company. |
| **Cowork** (collaborative workspace) | Research/analysis/finished documents built from your files and systems; recurring ops | Folder access, MCP connectors to your stack (CRM, calendar, data sources), scheduled runs |
| **Code Agent** (agentic coding) | Writing, testing, debugging, shipping software | Codebase access, plan mode, git, IDE/sandbox dev environments |

Recommend the *lightest* surface that fits the task. A founder pulling the one-sentence takeaway from a memo doesn't need Code Agent; a weekly KPI brief that aggregates connected tools needs Cowork, not ChatBox.

## Cross-stage principles

These hold at every stage. Apply them as a lens when reviewing the founder's plan.

- **Validation precedes building.** When building feels free, this rule is easier to break and more expensive to break.
- **Use AI as devil's advocate, not cheerleader.** Confirmation bias now has a research engine. Always ask the model to *argue against* the idea before trusting that it argued for it.
- **Persistent context beats per-session re-derivation.** Agent context files (CLAUDE.md / AGENTS.md style) keep the codebase legible across sessions; without them, each new session re-derives foundational decisions and architectural drift compounds.
- **Speed is not strategy.** Velocity is a given. Judgment about *what* to build is the only thing that compounds.
- **Interview the past, not the future.** When talking to prospective users, ask "tell me about the last time you dealt with this" — never "would you use something like this?" The future tense generates politeness; the past tense generates evidence.

## Failure modes to spot at any stage

When a founder describes their current situation, listen for these patterns and flag them directly:

- **Mistaking building for validating.** A working prototype is not evidence the problem is real — it's a pressure-testing prop for conversations with real users.
- **Premature scaling.** Investing in product path, infra, or hiring before the underlying assumption is validated. Especially dangerous in MVP and Launch.
- **Zero-friction scope creep.** Each addition feels defensible because each one is cheap to build. Demand evidence from real users before adding scope.
- **Founder as bottleneck.** Decisions that should take an hour take a week; support requests pile up because only the founder knows the answer. The remedy is auditing what can be systematized, delegated, or automated — not pushing harder.
- **False product-market fit.** Launch energy from founder friends, investor introductions, or a viral moment is not PMF. Real PMF survives week 6 and week 12.

## When the user hasn't picked a stage yet

If the user gives a generic prompt ("I want to start an AI-native startup", "how should I think about founding a company"), do not pick a stage for them. Instead:

1. Frame the four stages briefly (Idea → MVP → Launch → Scale) and the *guiding question* of each (Is this worth building? → What exactly should we build first? → Can we grow this predictably? → Can this sustain itself?).
2. Ask which question they're currently trying to answer.
3. Then load the matching reference.

## Output style

- Give direct recommendations grounded in the relevant stage reference, not generic business advice.
- When the user shares concrete details (problem statement, customer segment, current metrics), pressure-test them against the stage's exit criteria.
- Surface failure modes by name when you spot them.
- Recommend the specific AI surface for any action you suggest ("draft this in Cowork with your customer transcript folder connected" beats "use AI to analyze").
- Don't pretend to know the user's market better than they do. AI is a research/structuring partner, not a domain oracle.

## What this skill does not cover

- Fundraising mechanics (term sheets, cap tables, valuation negotiation)
- Hiring/HR specifics
- Jurisdiction-specific legal or tax advice
- Industry-specific regulatory compliance (point users to qualified counsel)

If the user asks about these, say so and redirect to a domain expert.
