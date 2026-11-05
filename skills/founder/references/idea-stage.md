# Idea Stage

> Founder's guiding question: **Is this worth building?**

The Idea stage is research and validation, not construction. The most consequential mistakes in the entire startup journey are made here — getting something wrong now can quietly run the venture off the rails for months.

In 2026, agentic coding has collapsed the time between "I have an idea" and "I have a prototype" to almost nothing. That makes the Idea stage *more* important, not less: the natural cost of building is gone, so the only thing keeping a founder from building the wrong thing for six months is the discipline to validate first.

## Goal

Assemble qualitative evidence that a real problem exists and that the proposed solution addresses it — *before* committing real resources to building.

## Exit criteria

The founder is ready to leave Idea stage only when they can answer **yes** to all three:

1. **Is the problem real and specific?** They can name exactly who experiences it, how often, how severely, and what they currently do about it.
2. **Does the solution address the *actual* problem?** Not the problem originally assumed — the one the validation surfaced. (These are often different.)
3. **Is there enough signal to justify building?** Never certainty — waiting for certainty is its own failure mode. But enough qualitative evidence that committing to an MVP is a reasoned decision rather than an act of faith.

Useful diagnostic: rewrite the problem statement. "People struggle with expense reporting" is an observation. "Finance managers at mid-market companies spend 4+ hours/week reconciling submissions because their tools don't integrate with their accounting software" is a testable hypothesis. If the founder can't get to the second form, they're not done with this stage.

## Failure modes

### Mistaking building for validating
When technical blockers are lifted, an impassioned founder skips the most important work and goes straight to *idea → prototype → treat the prototype's existence as proof*. The prototype becomes a reason to believe the hypothesis was right all along, without ever testing whether it's actually true.

A working prototype is a *pressure-testing prop for conversations with real users*. The conversations are the evidence — not the prototype.

42% of startups historically failed because they built something nobody wanted. With agentic coding, that rate climbs unless founders deliberately resist.

### Loss of objectivity (confirmation bias with a research engine)
Ask AI to validate the idea and it will find supporting evidence. Ask it to size the market and it will find the number that makes the TAM look fundable. AI follows direction, so a founder who doesn't ask hard questions can now construct an elaborate, well-researched-looking case for a bad idea — faster than ever.

The antidote is the same tool pointed the opposite direction. Always make the model argue against the idea before trusting that it argued for it.

### Premature scaling (the earliest form)
When building is effortless, it's easy to scale execution far ahead of validating problem-solution fit without ever consciously deciding to. Agentic coding will refactor and harden a codebase around a fundamentally flawed premise just as cheerfully as a great one. Keep sense-making ahead of building.

## How to apply AI at this stage

The Idea stage rewards using AI to *think more rigorously*, not to ship faster.

### Sharpen the problem hypothesis (ChatBox)
Work iteratively to turn the problem statement into a testable hypothesis. Force specificity on who, how often, how severely, and what they do today. A statement that can't answer those isn't ready to validate.

Then ask AI to **argue against** the idea — find disconfirming evidence, failed competitors, structural obstacles, customer behavior patterns a supportive synthesis would have quietly deprioritized. Going into customer discovery already stress-tested against the strongest counterarguments keeps interviews open-ended instead of confirmation hunts.

### Map the competitive landscape (Cowork)
Use Cowork (with its folder/connector access) for the slower, evidence-building work:

- **Synthesize competitor reviews** across key sources. Identify the top complaints existing solutions haven't resolved. If your hypothesis addresses one or more, that's strong signal.
- **Pressure-test TAM/SAM/SOM** with AI-built models from publicly available data. Ask whether the market is expanding, consolidating, or mature.
- **Map the buyer landscape**: who holds budget, who influences decisions, whether those are the same person.

Beware *competitor neglect* — the tendency to focus so intensely on your own vision that you systematically underweight what others are doing. Ask AI to make the most compelling argument for why each tier of competitor (direct, indirect, potential acquirer, adjacent) could win while you don't.

### Trend analysis (ChatBox or Cowork)
Track subreddits, LinkedIn groups, and forums where the problem is already discussed. Capture the exact language users reach for. Ask AI to identify analogous markets where a similar problem was solved, and extract what worked and what didn't. Surface regulatory/technological/demographic trends that could accelerate or threaten the opportunity in the next 12–24 months.

### Customer discovery (Cowork + ChatBox)

**Who to talk to:** Build a precise target profile (job titles, company types, team structures, seniority). Then identify where they're actually reachable — communities, events, LinkedIn groups, Slack workspaces. Build a prioritization framework based on closeness to the problem.

**What to ask:** Build the interview framework itself. The right questions, in the right order, structured to surface what people actually *do*, not what they *think they would do*. Rookie mistake: asking generic future-tense questions ("would you use something like this?"). Always interview the past tense: "tell me about the last time you dealt with this."

Have AI flag where draft questions are leading, too broad, or likely to generate socially desirable answers. If the hypothesis involves multiple personas, design separate question sets — a finance manager and a CFO have different relationships to the same problem.

**Outreach automation (Cowork):** Let Cowork research and compile a prospect list with verified contacts, draft personalized outreach at scale, manage the email/calendar thread (via MCP to Gmail/Calendar), and run cadenced follow-ups. Update the tracking sheet automatically as each step completes.

**Post-interview synthesis:** Feed notes back to AI and ask it to identify what confirmed the hypothesis, what challenged it, and what was *genuinely surprising*. After every five interviews, synthesize into two lists: evidence supporting the hypothesis, and evidence challenging it. If the supporting list is significantly longer, ask whether that asymmetry reflects what's actually in the data — or what the founder wanted to find.

### Design and stress-test the solution (ChatBox)
Once the problem is validated, develop the solution concept from every angle: gaps, alternatives, what would have to be true for it to work at scale. Ask AI to identify the three assumptions the design depends on most heavily, what would have to be true for each to hold, and what the consequences are if any one doesn't.

Critical reality check: does this solution address the problem the *validation* revealed, or the problem originally assumed?

### Lightweight prototype (Code Agent)
*Only after* the hypothesis is validated and stress-tested. Build the minimum surface area needed to put the idea in front of a real human and get a genuine reaction. Not a real-world product — a functional sample for customer and investor conversations.

Define the single core interaction the solution depends on. Build only that. Put it in front of five people from the validated target profile. What you learn determines whether to keep building or return to the drawing board.

## Recommended exercises

Concrete, repeatable practices. Pull these when a founder is stuck.

1. **Hypothesis sharpening:** Rewrite the problem statement with AI until it includes who, how often, how severely, what they do today. If it doesn't fit on a sticky note, it's not sharp enough yet.
2. **Devil's advocate review:** Hand AI the validated hypothesis and ask for the strongest case *against* it. Treat surprising counterarguments as priority research targets.
3. **Five-interview synthesis:** After every 5 customer interviews, ask AI to produce supporting-evidence and challenging-evidence lists. Investigate any asymmetry honestly.
4. **Three-assumption test:** Before building, identify the 3 assumptions the design depends on most. What has to be true for each? What breaks if one fails?
5. **Core interaction prototype:** Define the *single* interaction the solution stands or falls on. Build only that. Show 5 people from the target profile.
