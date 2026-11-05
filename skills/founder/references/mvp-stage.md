# MVP Stage

> Founder's guiding question: **What exactly should we build first?**

The MVP stage looks like construction but is still fundamentally evidence-gathering. The difference from Idea stage: the founder is now collecting evidence about the *solution*, not the *problem space* — specifically, whether a real, identifiable group of people finds the product valuable enough to return to it, pay for it, or tell others about it.

## Goal

Translate a validated problem into a working product that real users will actually use — the smallest, most focused iteration that puts a real solution in front of real users and generates real evidence of product-market fit.

Equally important second goal: *how* the founder builds now determines what's possible later. Move fast without accruing the type of technical debt that compounds the moment real users arrive.

Third goal, often overlooked: **invest in persistent context from day one**. In an AI-native startup, the codebase is collaborated on with AI session after session. Legibility is foundational. Founders who skip specs, architectural decisions, and agent context files (CLAUDE.md / AGENTS.md) hit a predictable wall where every new session requires re-explaining the codebase and AI-generated changes drift from the original vision.

## Exit criteria

Genuine evidence of product-market fit: proof that a specific, identifiable group of users has found the product valuable enough to **return to it** (retention), **pay for it** (revenue), or **tell others about it** (referral).

Two useful litmus tests:

- **Sean Ellis test:** Ask active users, "How would you feel if you could no longer use this product?" If >40% answer "very disappointed," that's a meaningful PMF indicator.
- **The effort test:** Pre-PMF, retention requires constant founder intervention (outreach, incentives, heroic energy). Post-PMF, the product starts doing that work itself. The shift from pushing to pulling is one of the clearest signals something real has changed.

No single data point confirms PMF — it's a pattern that has to hold across multiple iteration cycles.

## Failure modes

### Agentic technical debt
Because AI removes every natural bottleneck that once controlled what reaches production, speed is guaranteed. When speed becomes the only variable, founders risk accruing debt they'll struggle to pay off.

Some MVP-stage tech debt is appropriate — provided it's managed before scaling. *Agentic* tech debt, however, **compounds**. Without specs and architectural constraints written somewhere the AI can read, each session re-derives foundational decisions from scratch, and those decisions drift. You end up with a codebase that has no coherent mental model — not because any single piece is bad, but because the pieces were never designed to fit together. That surfaces late.

### Falling for false product-market fit
AI tools can generate impressive early numbers, but early momentum is not the same as PMF. Launch energy from founder friends, prospective buyers at the investor's other portfolio companies, or a Hacker News spike doesn't reliably predict what happens at week 6 or 12.

This is one of the most psychologically powerful traps in the startup journey. After weeks or months of validation, shipping a product *feels* like confirmation. It usually isn't.

### Zero-friction scope creep
When building is effortless and nearly free, there's always one more cool feature or edge case to handle. Each individual addition is defensible — of course the product should handle that case, of course users will want that workflow. But the product sprawls beyond its original boundaries and the founder loses direction.

The traditional forcing function (real cost of engineering time) no longer exists. The new forcing function has to be *a written scope document* that names what the product does, what it deliberately does not do, and the specific evidence from real users that would justify adding something new.

### Insecure by inexperience
Founders using AI tools to rush applications to market without understanding fundamental security principles expose users to preventable risks. Agentic coding generates code that *works*, not code that's inherently *secure*. Functional code is easy because either the feature works or it doesn't. Security vulnerabilities are invisible until exploited — no natural feedback loop alerts a first-time founder that something is wrong.

A security review before any user touches the app is the minimum responsible threshold for releasing an MVP.

## How to apply AI at this stage

### Define architecture *before* writing code (ChatBox → context file → Code Agent)

Before Code Agent writes a line of production code, use ChatBox to define and document the architectural decisions that will govern everything built in this stage: the patterns to follow, the dependencies to avoid, the tradeoffs being made and why.

Save the output as agent context file(s) (CLAUDE.md / AGENTS.md style). This is the first artifact of the build, and the one every subsequent session depends on. Functionally, it's persistent memory for the project.

Start each Code Agent session by (1) revisiting the scope document and (2) loading the architectural context. End each session by updating the context with any decisions the session surfaced. The goal is a codebase whose structure the founder can *explain*, not just one that runs. Five minutes of documentation per session is cheap insurance against architectural drift.

### Define and enforce MVP scope (ChatBox)
Create a scope document that names:
- What the MVP does
- What it deliberately does not do
- Feature amendment criteria: what specific evidence from real users would justify adding something new

When new feature ideas surface (and they will), use AI to pressure-test whether it's genuine user signal or founder enthusiasm dressed up as product thinking. The decision moves from "should we build this?" to "have a critical mass of users told us they can't get value without this?"

### Build the MVP (Code Agent)
Code Agent is now the primary build tool. Use it to generate, test, debug, and iterate — but treat each session as **executing product decisions already made**, not an opportunity to throw in new ones. The Plan Mode → Implement → Verify loop applies.

### Security review before any user touches it (Code Agent + ChatBox)
Run core application code through AI with a specific brief: review for authentication and session handling, data exposure in API responses, input validation and injection risks, dependencies with known vulnerabilities.

Treat each finding seriously; **anything that touches authentication, secrets, or data handling requires human review.** AI scans are an aid, not a substitute for qualified security tooling at higher stakes.

### Measurement framework — *before* launch (ChatBox)
Founders who mis-identify early traction as PMF are typically the ones who started tracking after launch with metrics chosen to *assess what was working* rather than to *surface what wasn't*.

Establish the framework before the first user shows up:
- Which metrics matter for this specific product
- Benchmarks: retention thresholds, activation criteria, Day 7 and Day 30 targets
- **What a false positive looks like** for this product (signups without activation, revenue without retention, initial enthusiasm without repeat usage)

When data arrives, ask AI to make the adversarial case against the founder's own traction: what would a skeptic say about these numbers?

### Manage feedback logistics (Cowork)
Once real users are in the product, the operational layer expands fast. Cowork handles building/maintaining user contact lists, running outreach, scheduling feedback sessions, triaging bug reports, tracking iteration cycles, and producing a weekly synthesis of what came in.

**Keep a human in the collection loop for nuanced exploration.** When a user says "this is great but I wish it could also...", interpretation requires judgment: core need or nice-to-have? specific to this customer or representative of a segment? is the missing feature the real problem, or is something upstream broken? No tool can answer those.

### Iterate toward evidence, not toward completeness
The MVP stage ends when there's genuine PMF evidence, no matter how "finished" the product feels.

### Pivoting when the data demands it
If results don't confirm the direction, that's the system working — the MVP stage is designed to surface this *before* over-investing in the wrong answer.

If three or more iteration cycles haven't moved meaningfully toward PMF benchmarks, run a diagnostic. Feed retention data, user feedback, and the original hypothesis to AI and ask:

1. Is there a segment in this data responding differently than the rest?
2. Is the gap between designed value and experienced value a *positioning* problem or a *product* problem?
3. What would have to be true for the current product to find genuine PMF, and is that scenario realistic given what you're seeing?

The answers determine whether to adjust, pivot, or return to Idea stage.

## Recommended exercises

1. **Architecture context document:** Before opening Code Agent, work in ChatBox to define principles, dependencies to avoid, and tradeoffs being consciously accepted. Save as agent context file. This is the load-bearing artifact for the whole stage.
2. **Scope document:** Write what the MVP does, what it doesn't do, and the criteria for amendment. Reread before every Code Agent session.
3. **Session template:** A simple template that includes architectural context, the specific task for the session, and constraints to observe. End with a 5-minute log entry: what was built, what decisions were made, what assumptions the session introduced.
4. **Pre-launch security review:** Run core app code through AI for authentication, data exposure, input validation, and dependency vulnerabilities. Human-review anything touching auth, secrets, or data.
5. **Measurement framework + false-positive definition:** Set retention benchmarks, Day 7/30 targets, and explicitly name what false positives look like for this product before launch.
6. **Weekly feedback synthesis:** Cowork drafts outreach, schedules sessions, intakes bug reports, and produces a weekly synthesis. Review the synthesis personally first.
7. **PMF diagnostic:** After 3+ iteration cycles without movement, run the three-question diagnostic above before deciding what to do next.
