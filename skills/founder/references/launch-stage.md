# Launch Stage

> Founder's guiding question: **Can we grow this predictably?**

If the MVP stage was about proving the product deserves to exist, the Launch stage is about proving the *business* deserves to grow.

## Goal

Turn early traction into a repeatable, sustainable growth engine. Beyond making the product production-ready, harden the infrastructure underneath it and simultaneously build an actual company around it.

Startups are naturally founder-centric during Idea and MVP — full situational awareness and tight feedback loops matter most. In Launch, founders who still try to personally hold every thread become the constraint. The goal isn't to remove yourself from the company; it's to build operational systems that free your attention for the decisions only a founder can make.

## Exit criteria

Three elements, all required:

1. **Growth is repeatable and channel-driven.** Not just retaining users — acquiring them predictably through specific channels with understood unit economics. CAC, LTV, and payback period are numbers the founder knows and can defend.
2. **The product can handle production workloads.** Infrastructure is hardened, security and compliance are in order, reliability holds under real production conditions (not just the conditions tested for).
3. **Operations run without founder bottlenecks.** Processes exist and automation is in place. The founder is no longer personally handling support, triage, sprint planning, or reporting.

## Failure modes

### Technical debt comes due
The MVP codebase built for speed and validation ran well enough to prove the product worked, but production traffic, new features, and growing complexity are now exposing the shortcuts. At MVP, accumulating some debt was a reasonable trade for velocity. In Launch, that debt accrues interest, and the longer it goes unaddressed, the more expensive it is to fix.

Remedy: systematic architectural audit → targeted refactoring of the worst → meaningful expansion of test coverage so the next round of feature work doesn't reintroduce the same problems.

### Founder becomes the bottleneck
At MVP, the founder being in every loop was an asset. At Launch — as support volume grows, product decisions stack up, and operational complexity multiplies — the same instinct becomes the constraint. The transition from *doing the work* to *designing the systems that do the work* is one of the hardest shifts in the startup lifecycle.

There's rarely a clear moment when this transition happens, so the risk is missing it entirely and staying in builder mode while the organization stalls. Telltale signs:
- Decisions that should take an hour now take a week
- Support requests pile up because only the founder knows the answer
- Operational tasks only happen when the founder personally remembers them

Remedy: an all-out audit of everything the founder is personally handling — from tiniest task to highest-stakes decision — to identify what can be systematized, what can be delegated, and what genuinely still merits founder time.

### Security and compliance are no longer deferrable
At MVP, with a handful of beta users and no sensitive production data, security vulnerabilities were theoretical. The moment the product enters production with real users — and especially when enterprise contracts come on the table — the hypothetical becomes real exposure.

Compliance requirements that didn't apply to a prototype definitely apply the moment you're handling customer data, processing payments, or selling into regulated industries.

Remedy: systematic security and compliance review *before* production scale arrives, not after. Treat everything that surfaces as required remediation, not a suggestion.

### Expansion before you're ready
New markets and funding opportunities look like growth opportunities. They can also be where PMF goes to die. Initial traction is real but *specific to the early audience*. Expanding too early into a meaningfully different market introduces new user behaviors, compliance requirements, payment infrastructure, and baseline expectations the product wasn't designed around. Too many new variables → lost ability to interpret your own data. And the original user base often gets neglected while chasing the new.

## How to apply AI at this stage

All three surfaces are in full use at Launch, and they support each other — each tool produces outputs that become inputs for the others. Code Agent builds the product. Cowork builds the company around it. ChatBox helps operationalize this knowledge.

### Remediate technical debt before it compounds (Code Agent → ChatBox)

1. **Architectural audit (Code Agent):** Run a full audit identifying where the codebase is brittle, shortcuts that will become expensive to maintain, and where test coverage is thin enough that the next round of feature work will reintroduce the same problems.

2. **Triage and sequence (ChatBox):** Feed the audit findings to ChatBox to triage — what needs to be fixed before the next release, what can wait a sprint, what represents acceptable ongoing debt at this stage.

3. **Document architectural decisions from MVP:** The ones that lived in the founder's head because there was no time to write them down. Get them into agent context files (CLAUDE.md / AGENTS.md) now so every future Code Agent session starts from a shared understanding of how the system was designed and why.

### Build systems that replace founder attention (Cowork)

The operational audit:
- Document every recurring task, every decision that lands on your desk, every workflow that only happens because you personally remember it.
- Categorize: what can be **automated entirely**, what needs a **human but not necessarily you**, what genuinely requires **founder judgment**.

Then design workflow logic for the automation candidates: what triggers each workflow, what the decision rules are, what the output looks like, where it goes when done.

### Make security and compliance a product workstream (Code Agent + ChatBox)

Use Code Agent to surface code-level issues common in SOC 2, GDPR, or HIPAA audits and standards relevant to the target market. Feed findings to ChatBox to prioritize remediation and design controls, audit logging, and access management enterprise buyers will ask for.

Build the compliance workstream into the development cycle rather than running it as a one-time project — compliance documentation needs continual maintenance.

> **Note:** AI scans are an aid but not a substitute for qualified compliance review. For founders approaching enterprise contracts or international markets, this is also the moment for an independent security assessment.

### Stand up product management processes you've been skipping (ChatBox + Cowork)

Launch needs lightweight, repeatable processes that run without founder intervention to trigger or function.

**Design (ChatBox):**
- How will product timeline and work cycles be structured?
- What does a spec need to include before Code Agent touches a feature?
- How do bug reports get triaged and routed?
- What does the weekly metrics report cover and how is it distributed?

**Run (Cowork):**
- Schedule sprint ceremonies
- Route incoming bug reports to the right place
- Compile weekly metrics from connected data sources
- Maintain the feedback loop that keeps user signals flowing into product decisions

## Recommended exercises

1. **Architectural audit + remediation sequence:** Direct Code Agent to produce a prioritized list of structural weaknesses, test coverage gaps, refactoring candidates. Then ChatBox sequences across sprints: address-now, can-be-parallel-with-features, can-wait.
2. **Founder bottleneck map:** Cowork audits everything currently routed through the founder. ChatBox extrapolates what happens to each item when the founder is unavailable for a week. The workflows that stall reveal where systematization is needed first.
3. **Enterprise-readiness gap analysis:** Pick 3 most demanding prospects or ideal customers. Ask ChatBox: what documentation, SLAs, and support infrastructure would their procurement team expect before signing a multi-year contract? Where do you currently fall short? Sequence the work across Code Agent and Cowork.
4. **Code-level security review for target market:** Run a Code Agent review oriented to the compliance frameworks your buyers require (SOC 2 / GDPR / HIPAA). Feed output to ChatBox for prioritized remediation + list of documentation and controls needed.
5. **Lightweight PM operating system:** ChatBox designs sprint cadence, minimum spec template, bug triage decision tree, weekly metrics brief pulling from real data sources. Cowork implements the recurring operational elements (scheduling, routing, report compilation) on schedule without you.
6. **Adversarial traction read:** Ask ChatBox to make the strongest skeptic's case against your current growth numbers. What would a Series B investor poke holes in? Address those before they're asked.
