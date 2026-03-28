# Context-Driven Delivery (CDD 2025.03.27)

A methodology for delivering work products of any kind with AI agents. Software is the primary use case, but the same workflow applies to research engagements, consulting deliverables, marketing campaigns, or any project that accumulates context over time. The repo accumulates context that makes every future decision and every future agent session better. This isn't a framework or a standard. It's a workflow that works for us and may work for you. Adapt the folder structure, skills, and conventions described here to fit your own context.

## The Idea

Every piece of thinking gets written down in the repo. Decisions, plans, domain knowledge, research, design conversations, experiments. The repo isn't just where the code lives. It's the complete picture of the project: what was decided, why, what was built, and what's next.

This accumulated context is what makes the methodology work. Agents build well because the context is there. Humans make good decisions because the context is there. Nobody reconstructs the picture from Jira tickets, Slack threads, and tribal knowledge. The repo IS the picture.

### Context Layers

The repo organizes context into layers, each serving a different purpose:

| Layer | What it contains | Who it serves |
|-------|-----------------|---------------|
| **Specs** | Domain knowledge: what the system is, why each piece exists, the rules | Agents implementing, humans deciding |
| **Proposals** | Decision records: what was decided, why, what alternatives were rejected | Future agents and humans understanding intent |
| **Plans** | Execution blueprints: how to build something, broken into phases | Agents executing work |
| **Research** | External knowledge: platforms, competitors, patterns, vendor evaluations | Anyone making informed decisions |
| **Transcripts** | Design conversations: the thinking that shaped the specs | Anyone who needs the "how we got here" |
| **Playbook** | How to build: patterns, anti-patterns, conventions, guardrails | Agents executing plans, humans reviewing code |
| **Experiments** | Prototypes and POCs: things we tried, what we learned | Anyone evaluating feasibility |
| **Data** | Imported external context: documents, Q&A, vendor materials converted to markdown | Anyone needing reference material |
| **Code** | The implementation: how things actually work | Agents building, humans debugging |
| **Ideas** | Personal scratchpad: uncommitted, gitignored thoughts before they become proposals | The person thinking |

No single layer tells the whole story. Together they form a complete picture that any agent or human can navigate.

### Why Context Accumulates

Each conversation, each decision, each implementation leaves behind artifacts that make the next round easier. A proposal written today becomes context for a plan tomorrow. A plan executed this week becomes an archived decision record next week. Research gathered for one feature informs the next proposal.

This is the flywheel: the more context in the repo, the better agents perform, the better the artifacts they produce, the more context accumulates.

### Context Stratification

Not all context carries the same weight. Agents and humans already treat specs differently from research differently from raw imported documents. Making the hierarchy explicit helps new projects set up correctly and helps agents weigh context appropriately.

| Layer | Confidence | Description |
|-------|-----------|-------------|
| **Specs** | Highest | Decided truths. If wrong, something must change. |
| **Research** | High | Investigated findings. Verified but may evolve. |
| **Data** | Medium | Imported external context. Useful but not verified against project truth. |
| **Ideas** | Lowest | Loose thoughts. Personal, uncommitted, exploratory. |

This isn't new structure. It's naming what's already implicit. When context layers conflict, higher-confidence layers win.

### Specs and Code: Shared Authority

Think of specs like chapter summaries in a book. The summaries tell you what each chapter is about, why it matters, and how it connects to the rest. The chapters themselves contain the full detail. You'd never mistake one for the other. Depending on how much time you have, you read one or both.

**Specs are the domain authority.** They own intent, concepts, rules, relationships, and the reasoning behind decisions. What is this system? Why does each piece exist? What are the domain rules?

**Code is the implementation authority.** It owns how things actually work: method signatures, edge cases discovered during development, performance tradeoffs, UI details (layouts, styles, component structure), and the places where design met reality. UI specifics live in code, not specs. They change too fast and are too visual to describe usefully in markdown.

When they diverge on domain intent, the spec wins (update the code, or update the spec if intent changed). When they diverge on implementation detail, the code wins (the spec was never meant to track that level).

### Two Audiences, One Repo

The same context serves both agents and humans, but from different directions:

- **For agents:** "Does this give me enough context to implement correctly without wrong assumptions?"
- **For humans:** "Does this let me understand the system without reading code?"

The agent goes from spec to code. The human goes from code (or the running app) back to understanding. The context layers sit in the middle, serving both.

## Repo Structure

```
project/
├── specs/              # Domain knowledge (what and why)
│   └── sandbox/        # Half-baked spec ideas, domain sketches
├── workflow/           # The decision and execution pipeline
│   ├── ideas/          # Personal scratchpad (gitignored)
│   ├── proposals/      # Decision pipeline (draft -> accepted)
│   │   └── accepted/   # Decision records with date prefix
│   └── plans/          # Execution plans (ready for audit or execution)
│       ├── active/     # Currently being executed (hands off)
│       └── archived/   # Completed plans with execution notes
├── playbook/           # How to build (patterns, guardrails, conventions)
├── source/             # All application code
├── data/               # Imported external context (documents, vendor materials)
├── skills/             # CDD skills (optional, for repos that develop skills locally)
├── research/           # Distilled external knowledge
├── transcripts/        # Cleaned design session records
├── docs/               # External-facing content
└── experiments/        # Prototyping, POCs, throwaway explorations
```

`specs/` contains domain knowledge and exploratory sketches (`sandbox/`). `workflow/` contains the pipeline that produces and maintains everything else. `data/` holds imported external documents (PowerPoints, PDFs, vendor materials) converted to markdown for agent-searchable reference. It's distinct from `research/` (actively investigated findings) and `specs/` (decided truths authored within the project).

**Why separate `source/` from root?** Keeps context and deliverables at the same level. Agents can read specs without navigating into the app. Humans can browse the domain model without opening a code editor. For non-software projects, `source/` contains whatever the primary deliverables are (reports, campaign assets, etc.), or can be omitted entirely.

## The Idea Pipeline

At its simplest, an idea moves through four stages:

```
ideas/ (optional, uncommitted) -> proposal -> plan -> source
```

**Ideas** are personal, uncommitted notes in `workflow/ideas/` (gitignored). When an idea is ready to share, it graduates to a **proposal** describing what you want to build and why. A **plan** breaks it into phases an agent can execute. **Source** is the code (or deliverable) that gets produced. That's the core loop. The ideas stage is optional. Many proposals start without one.

### Adding More Structure

You can layer on as much or as little process as you need:

- **Sandbox** (`specs/sandbox/` or a sandbox in proposals). Sketch ideas before they're ready to be proposals. Half-baked is fine. Not everything in sandbox becomes a proposal, and that's the point.
- **Accept** (`workflow/proposals/accepted/`). When a proposal is approved, move it to `accepted/` with a date prefix. This creates a permanent decision record. The `/accept-proposal` skill automates this and generates a plan from the accepted proposal.
- **Audit** (`/audit-plan`). Before execution, an agent verifies the plan is ready: dependencies exist, test data is sufficient, open questions are resolved.
- **Execute** (`/execute-plan`). An agent picks up the plan, works in a git worktree, implements each phase, runs tests, and opens a PR.
- **Reconcile** (`/reconcile`). After execution, diff the branch against specs and the playbook. Fix spec drift and capture any new patterns or anti-patterns discovered during execution.
- **Archive** (`workflow/plans/archived/`). When a plan is done, move it to `archived/` with execution notes. This preserves the record of what was built and what was learned.

None of these are required. For a quick bug fix, just write code on a branch and merge it. For a big feature, run the full pipeline. Use what helps, skip what doesn't.

### What the Full Pipeline Looks Like

```
Big features:  propose -> accept -> audit -> execute -> reconcile -> merge
Ad-hoc work:   hack on branch -> reconcile -> merge
```

At any point, `experiments/` can feed into any stage (a quick POC to validate an assumption) and `research/` can inform any stage (external context that shapes decisions).

The reconcile step is what keeps context accurate. Without it, specs drift from code and the playbook misses lessons from the work that was just done. Reconciliation is the maintenance cost of CDD. It's worth paying because stale context is worse than no context.

### Plan Lifecycle (Filesystem State Machine)

```
workflow/plans/plan.md           Ready. Audit can check it. Execute can pick it up.
       │
       ▼
workflow/plans/active/plan.md    In flight. Execution agent is building it in a worktree.
       │                         Other agents: hands off this plan.
       ▼
workflow/plans/archived/plan.md  Done. Execution notes appended. Decision record.
```

The folder IS the state, and it's committed on main. The git repository is the database. No external status tracker, no API call. Moving a file between folders and pushing to main is how state changes propagate. Agents check folder contents to determine what's available, in progress, or done:

- **Audit agent:** only looks at `plans/*.md` (ignores `active/` and `archived/`)
- **Execute agent:** picks up from `plans/*.md`, moves to `active/` as first step
- **Other agents:** see a plan is gone from `plans/` and know not to re-execute it

### Proposals as Decision Records

Accepted proposals stay in `workflow/proposals/accepted/` permanently, date-prefixed (e.g., `2026-03-20-delivery-receipts.md`). They document **why** a decision was made. Plans document **how** it was built. Together they form a complete decision record that future agents and humans can reference.

### Collaboration and Scale

Multiple people can collaborate on proposals before execution by committing to main. You see what others are working on because the state is in the repo: open proposals, plans in progress, accepted decisions. Git history shows who changed what and when.

CDD is designed for small teams that move fast. Two or three engineers equipped with agents can ship at a pace that doesn't work in a large repo with many contributors. One of the practical limitations of agentic engineering is other people. When a developer with agents can propose, plan, and execute a feature in hours, waiting on reviews, approvals, or coordination across a big team becomes the bottleneck. CDD leans into this by giving small teams process, decision tracking, and accumulated context without the overhead that slows them down.

If your system is growing beyond what a small team can manage, the CDD answer might be to split into multiple repositories, each scoped to what a single team can iterate on, with clear interfaces between them. Each repo gets its own specs, pipeline, and context. That said, this is an unproven idea. CDD has only been used on small teams so far.

## Execution

Plan execution happens autonomously in an isolated copy of the repo. The concept is simple: the execution agent gets its own branch and working directory so it can make heavy changes without blocking anyone else. Your main working tree stays clean so you can keep working while execution runs.

In Claude Code, this uses git worktrees (the `isolation: "worktree"` parameter on the Agent tool). Other agent tooling could implement the same pattern with branches or containers. The isolation mechanism matters less than the principle: execution is autonomous and doesn't touch main until it opens a PR.

- The plan is moved to `workflow/plans/active/` on main before execution starts
- The agent runs in the background in its own isolated copy of the repo
- It reads the plan and the playbook, implements each phase, commits per phase, runs tests
- When done, it archives the plan and opens a PR for review

You can run multiple plans simultaneously in separate worktrees. Each gets its own branch and PR.

### Nightshift

The natural extension of autonomous execution is batch execution. Queue up proposals and plans during the day, then run them all overnight. By morning there's a stack of PRs to review and merge in order.

```
Day:     Write proposals, accept plans, audit plans
Night:   Execute everything queued
Morning: Review stacked PRs, merge in order, handle stuck plans
```

This pattern was inspired by [Jamon Holmgren's Night Shift workflow](https://x.com/jamonholmgren/status/2032885424209932711). The core insight: human time and energy are the constrained resource, agent tokens are cheap. Structure your day around the decisions only you can make, and let agents handle execution when you're not at the keyboard.

## Playbook

`playbook/` is where you capture how code should be written in this repo. Patterns, anti-patterns, conventions, guardrails, do's and don'ts. Organized by domain: `playbook/testing.md`, `playbook/frontend.md`, `playbook/data-layer.md`, whatever fits your project.

The playbook is a living document that gets smarter over time. The feedback loop works like this: an agent executes a plan and introduces an N+1 query. You catch it in review, fix it, and then update `playbook/data-layer.md` with the pattern to avoid. Next time an agent executes a plan that touches the data layer, it reads the playbook first and doesn't make the same mistake.

Specs say **what** the system is. The playbook says **how** to build it well.

Some things that belong in a playbook:
- "Use Decimal for money, never floats"
- "Don't mock the database in integration tests"
- "Always run the linter before pushing"
- "Use existing utility classes before writing custom CSS"
- "Avoid N+1 queries. Preload associations in the context, not the template."

### How the Playbook Gets Updated

The primary trigger is **PR review**. This is the moment someone is looking at code critically, and it works for every team shape:

- **Team review:** A teammate reviews a PR and comments "we shouldn't be doing X here." Fix the code, then update the playbook so the pattern is captured.
- **Hands-on review:** Someone checks out the PR branch, makes changes directly, and pushes fixes. Those fixes reveal patterns worth documenting.
- **Solo dev review:** You're reviewing your own agent's PR. You notice the agent did something you don't like, or did something well that should be repeated. Either way, update the playbook.

The habit is simple: every time you touch a PR and think "this should be a rule," add it to the playbook before you merge. The cost is one extra commit. The payoff is that every future agent session starts with that knowledge.

The playbook doesn't need to be comprehensive on day one. Start empty. Add a rule when you hit a real problem. After a few months of development, it becomes one of the most valuable context layers in the repo because every entry represents a lesson that was actually learned.

## Research

`research/` holds distilled knowledge about the world outside the codebase: platforms, competitors, protocols, design patterns, and vendor evaluations. Each file covers one topic. Research is durable reference material that informs specs and proposals but is not itself a spec (it describes what exists, not what we're building).

Research files are updated as new information comes in. They don't follow the proposal/plan lifecycle. When research leads to a decision about what to build, that decision becomes a proposal.

## Transcripts

`transcripts/` holds cleaned records of design sessions, team calls, and working conversations. They're a critical context layer because they capture reasoning, domain knowledge, and decisions that haven't yet made it into specs or proposals. A spec says what was decided. A transcript shows how and why.

Meetings are one of the richest sources of context in any project. A single design call can produce proposals, research tasks, experiments, spec updates, and glossary corrections. Without transcripts, that knowledge lives in people's heads. With transcripts, it becomes durable context that agents and future team members can reference.

The `/import-transcript` skill automates the cleanup: read the raw transcript, strip noise, normalize speaker names, map terminology to canonical project terms, and write a clean version with next steps split into agent-actionable items and human action items.

## Skills

Skills are Claude Code slash commands that encode repeatable workflows. Each skill is a `SKILL.md` file with YAML frontmatter (`name`, `description`, `args`) followed by markdown instructions. Install them in `~/.claude/skills/` (global) or `.claude/skills/` (project-level).

### Pipeline Skills

These automate the core CDD workflow:

| Skill | Purpose | Input | Output |
|-------|---------|-------|--------|
| `/accept-proposal` | Approve a proposal, survey codebase, write execution plan | Proposal file | Accepted proposal + plan in `workflow/plans/` |
| `/audit-plan` | Verify plan readiness: deps, data, open questions, POC gaps | Plan file | Readiness audit appended to plan |
| `/execute-plan` | Implement a plan in a worktree: code, test, spec update, PR | Plan file | Branch with code + PR |
| `/reconcile` | Diff branch vs specs and playbook, fix drift and capture new patterns | Branch (auto-detected) | Spec + playbook edits committed |
| `/mutate` | Pull traits from one artifact onto another (theirs/ours) | Two file paths | Rewritten ours file |
| `/nightshift` | Batch-execute all queued plans overnight as stacked PRs | Plans in `workflow/plans/` | Stack of PRs for morning review |

None of these are required to use CDD. The folder structure and workflow work without any skills installed. Skills just automate what you'd otherwise do manually.

### Writing New Skills

Good skills are:
- **Deterministic where possible.** If the task is a script (API polling, file processing), write a script and have the skill orchestrate it.
- **Step-by-step.** Numbered phases the agent can follow without ambiguity.
- **Self-contained.** Include everything the agent needs to know. Don't assume context from a previous conversation.

## What Makes a Good Spec

Specs describe the domain. Code describes the implementation. A good spec stays one level of abstraction above the code: it tells you what the system is, why each piece exists, what the rules are, and how the pieces connect. Someone reading only the specs should understand the whole system conceptually. Someone reading only the code should be able to build and run it. Together, they're the complete picture.

Specs should be concise. They're summaries, not transcripts. If a spec is getting long, it's probably descending into code-level detail.

### The Litmus Tests

**For agents:** "Could an agent reading only the code make a wrong choice here?" If yes, the spec should mention it. If the code speaks for itself, the spec is redundant.

**For humans:** "Could someone reading this spec understand what the system does and make a good decision about what to change?" If not, the spec is missing domain context.

### What Belongs in Specs

**Domain rules and design decisions.** The things that aren't obvious from reading code:
- "At-most-once delivery. Delete on failure rather than retry."
- "Prices are stored in cents as integers, never as floats."
- "Tenants are isolated at the database level, not the application level."

**Decisions with reasoning.** The "why not" is as important as the "what":
- "File-based storage, not a database. Simplest thing that works for single-user."
- "No authentication. Trust boundary is the OS. Single-user assumption."
- "Polling, not webhooks. Simpler to deploy, no public endpoint needed."

**Non-obvious architecture.** Choices an agent might undo without context:
- "Messages move to a processed folder after delivery, not deleted. We need the audit trail."
- "Registration happens on startup, not on first use. Other components depend on it being there."

### What Doesn't Belong in Specs

Everything an agent can derive from reading the code:
- **Type definitions and interfaces.** Read the source file.
- **API parameter schemas.** Read the code that defines them.
- **File path constants and config values.** Read the code.
- **Setup/install instructions.** Those belong in README, not a spec.
- **Coding patterns and conventions.** Those belong in the playbook, not specs. Specs say what the system is. The playbook says how to build it.

### Spec Types

| Spec Type | Contains | Does NOT Contain |
|-----------|----------|------------------|
| **System** (e.g., architecture.md) | How components connect, data flow, design decisions with reasoning | Type definitions, exact file paths, API call syntax |
| **Feature** (e.g., billing.md) | What the feature does, why, the domain rules that govern it | Implementation details the code makes obvious |
| **Team** (e.g., team.md) | People, roles, responsibilities, who owns what | Org chart details that change weekly |
| **Domain** (e.g., compliance.md) | Business rules, constraints, regulatory requirements | Implementation of those rules (that's code) |
| **Sandbox** (specs/sandbox/) | Rough ideas, domain sketches, things being explored | Anything polished enough to be a real spec |

The `specs/` folder accommodates non-software content naturally. A consulting project might have domain specs for regulatory requirements. A research engagement might have team specs describing subject matter experts. The spec types above are examples, not an exhaustive list.

## Getting Started

You don't need all of this on day one. Start with two things:

**1. Playbook.** Create `playbook/` and add your first file. It can be `playbook/conventions.md` with three rules you already know. The next time you review a PR and think "the agent shouldn't have done that," add it. The playbook grows from real work, not upfront planning.

**2. Workflow.** Create `workflow/proposals/` and write your first proposal. It doesn't need to be formal. "We need X because Y. Here's what changes." Accept it, write a plan, execute it. You'll feel the pipeline after one cycle.

**3. Transcripts.** This one can be an aha moment. Record a design session, drop the raw transcript into `transcripts/`, and run the `/import-transcript` skill. Watch it extract decisions, domain knowledge, action items, and open questions from a conversation you already had. One design call can seed proposals, specs, and research all at once. Try it with a single session and see what happens.

From there, add layers as you need them:
- Add `specs/` when you notice agents making wrong assumptions about domain rules
- Add `research/` when you're evaluating something external
- Add `experiments/` when you need to validate something before committing to a plan

Moving your existing code into `source/` is a bigger ask and completely optional. CDD works fine with code at the root. The `source/` separation is nice when you have a lot of context folders, but it's not a prerequisite.

None of these individual pieces are required. But they're designed to complement each other: the playbook makes execution better, execution produces plans worth archiving, archived plans inform future proposals, proposals reference specs, and specs keep everyone aligned. Start with one or two pieces and add more when the need is obvious.

### CLAUDE.md vs CDD.md

Every CDD repo has both files at the root. They serve different purposes:

- **CDD.md** is the methodology. It describes how CDD works in general. It can be mutated across repos.
- **CLAUDE.md** is the project config. It tells the agent about this specific repo: what the tech stack is, how to run tests, where code lives, key concepts, repo structure. This is what the agent reads first when it starts a session.

Think of CDD.md as the playbook for the methodology itself, and CLAUDE.md as the quick-reference card for this project.

## Changing CDD for Your Repo

You're encouraged to change CDD. Modify this file, rewrite skills, add new pipeline stages, remove what doesn't fit. Every repo has different needs and the methodology should reflect that. A data pipeline repo might drop the transcript layer entirely and add a data-quality stage. A client-facing app might add a design review step to the proposal pipeline. Make it yours.

The only thing that matters is that the context keeps accumulating and stays accurate. If your changes serve that goal, they're good changes.

Every repo should have its own copy of CDD.md. It serves two purposes: the local agent reads it to understand how this project's workflow operates, and the local agent improves it when it discovers something better during execution. A bug fix in the pipeline, a missing guardrail, a clearer way to explain a concept. Those improvements get committed to the repo's CDD.md and become available for other repos to pull from via mutation.

### Mutation

When a repo improves its CDD.md, skills, or specs, those improvements can flow to other repos. In CDD this is called **mutation**: an agent reads two versions of an artifact, identifies the **traits** worth adopting (a structural pattern, a new concept, a better workflow step), and rewrites the target to incorporate them while preserving everything else.

Mutation is not merging. It's comprehension-based. The agent understands the intent of the improvement and applies that understanding in a different context. The two files don't need to be the same shape. You're extracting the useful idea and rewriting with it.

```
/mutate ours=CDD.md theirs=~/data/other-project/CDD.md
```

Every repo that adopts CDD will change it, and that divergence is a feature. But good ideas still need to flow between repos without flattening each repo's customizations. Mutation handles that. Use `-sync` to run it in both directions when two repos have each picked up different improvements.

No repo is "upstream." Every repo is a peer that can contribute traits to any other. For more on how this works in practice, see [research/mutation.md](research/mutation.md).

CDD itself evolved this way. The methodology started at Marshall Consulting across multiple repos, each adapting the workflow to its own needs. Good ideas surfaced in one repo, got mutated onto others, and the weaker versions fell away. This repo is not the canonical version. It's a peer, just like the repos it came from.

See [CDD_ACKNOWLEDGMENTS.md](CDD_ACKNOWLEDGMENTS.md) for credits.
