# Context-Driven Development

A methodology for building software with AI agents. The repo accumulates context that makes every future decision and every future agent session better. This document is the methodology reference. Other repos can adopt this workflow by copying the folder structure, skills, and conventions described here.

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
| **Experiments** | Prototypes and POCs: things we tried, what we learned | Anyone evaluating feasibility |
| **Code** | The implementation: how things actually work | Agents building, humans debugging |

No single layer tells the whole story. Together they form a complete picture that any agent or human can navigate.

### Why Context Accumulates

Each conversation, each decision, each implementation leaves behind artifacts that make the next round easier. A proposal written today becomes context for a plan tomorrow. A plan executed this week becomes an archived decision record next week. Research gathered for one feature informs the next proposal.

This is the flywheel: the more context in the repo, the better agents perform, the better the artifacts they produce, the more context accumulates.

### Specs and Code: Shared Authority

Think of specs like chapter summaries in a book. The summaries tell you what each chapter is about, why it matters, and how it connects to the rest. The chapters themselves contain the full detail. You'd never mistake one for the other, and you need both to understand the whole book.

**Specs are the domain authority.** They own intent, concepts, rules, relationships, and the reasoning behind decisions. What is this system? Why does each piece exist? What are the domain rules?

**Code is the implementation authority.** It owns how things actually work: method signatures, edge cases discovered during development, performance tradeoffs, the places where design met reality.

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
│   ├── proposals/      # Decision pipeline (draft -> accepted)
│   │   └── accepted/   # Decision records with date prefix
│   └── plans/          # Execution plans (ready for audit or execution)
│       ├── active/     # Currently being executed (hands off)
│       └── archived/   # Completed plans with execution notes
├── source/             # All application code
├── skills/             # CDD skills (slash commands for the workflow)
│   └── cdd/            # Pipeline skills: accept, audit, execute, reconcile
├── research/           # Distilled external knowledge
├── transcripts/        # Cleaned design session records
├── docs/               # External-facing content
└── experiments/        # Prototyping, POCs, throwaway explorations
```

`specs/` contains domain knowledge and exploratory sketches (`sandbox/`). `workflow/` contains the pipeline that produces and maintains everything else.

**Why separate `source/` from root?** Keeps context and code at the same level. Agents can read specs without navigating into the app. Humans can browse the domain model without opening a code editor.

## The Idea Pipeline

An idea moves through the repo as files in folders:

```
idea -> specs/sandbox/               (explore in writing, optional)
     -> workflow/proposals/          (formalize as proposal with rationale)
     -> workflow/proposals/accepted/ (decision made, date-prefixed)
     -> workflow/plans/              (break into executable phases)
     -> workflow/plans/active/       (agent is building it)
     -> source/                      (code lands)
     -> workflow/plans/archived/     (plan done, execution notes appended)
```

At any point, `experiments/` can feed into any stage. A quick POC in experiments might validate a proposal's assumption or prove a plan's approach. `research/` can inform any stage too, providing external context that shapes decisions.

Each step produces context that persists. A sandbox sketch that gets rejected is still useful: it records what was considered and why it didn't move forward. An archived plan records what was built and what was learned during execution.

## The Proposal Pipeline

Two tracks depending on the size of the change:

```
Big features:  propose -> accept -> audit -> execute -> reconcile -> merge
Ad-hoc work:   hack on branch -> reconcile -> merge
```

| Stage | What Happens | Skill | Artifacts |
|-------|-------------|-------|-----------|
| **Propose** | Write rationale, design, scope. What problem, what changes, what doesn't change. | manual or agent | `workflow/proposals/feature-name.md` |
| **Accept** | Human approves. Proposal moves to `accepted/` with date prefix. Agent surveys codebase and writes execution plan. | `/accept-proposal` | `workflow/proposals/accepted/YYYY-MM-DD-feature.md`, `workflow/plans/feature.md` |
| **Audit** | Agent verifies plan is ready: checks dependencies exist, test data is sufficient, open questions are resolved. Creates experiments for POC gaps. | `/audit-plan` | Readiness Audit section appended to plan |
| **Execute** | Agent moves plan to `active/`, works in a git worktree, implements phases, runs tests, updates specs, archives plan, opens PR. | `/execute-plan` | Branch with code + archived plan + PR |
| **Reconcile** | Agent diffs the branch against specs, finds post-plan drift (UI tweaks, bug fixes, late additions), proposes spec updates. | `/reconcile` | Spec edits committed to branch |
| **Merge** | Human reviews PR, squash-merges to main. | manual | Code on main, plan in `archived/` |

For ad-hoc work (bug fixes, small tweaks, exploratory changes), skip propose through execute. Work on a branch, then run `/reconcile` before merging to keep specs current. The reconcile skill works with or without a plan.

The reconcile step is what keeps context accurate. Without it, specs drift from code and the accumulated context degrades. Reconciliation is the maintenance cost of CDD. It's worth paying because stale context is worse than no context.

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

The folder IS the state. No database, no status field, no API call. Agents check folder contents to determine what's available, in progress, or done:

- **Audit agent:** only looks at `plans/*.md` (ignores `active/` and `archived/`)
- **Execute agent:** picks up from `plans/*.md`, moves to `active/` as first step
- **Other agents:** see a plan is gone from `plans/` and know not to re-execute it

### Proposals as Decision Records

Accepted proposals stay in `workflow/proposals/accepted/` permanently, date-prefixed (e.g., `2026-03-20-delivery-receipts.md`). They document **why** a decision was made. Plans document **how** it was built. Together they form a complete decision record that future agents and humans can reference.

## Multi-Agent Execution

Multiple agents can work concurrently, each with a role:

```
main branch (working tree)
├── audit agent        reads plans, checks readiness
├── proposal agent     writes proposals from requirements
├── bash agent         ad-hoc commands, exploration
│
└── worktree branch (isolated)
    └── execute agent  implements a plan, commits to branch
```

### Why Worktrees

The execution agent makes lots of file changes and commits. If it works directly on main, it blocks other agents and creates merge conflicts. Git worktrees solve this by giving the execute agent its own isolated copy of the repo:

- The execute agent is spawned with `isolation: "worktree"` via the Agent tool
- It gets a temporary branch in its own directory on the filesystem
- Other agents continue working on the main working tree uninterrupted
- When execution is done, the branch is pushed and a PR is opened
- The worktree is automatically cleaned up

### Agent Roles

| Agent | Reads | Writes | Isolation |
|-------|-------|--------|-----------|
| **Audit** | Plans, code, data files | Appends audit to plan file | Main (small writes) |
| **Proposal** | Specs, code | New proposal files | Main (new files only) |
| **Execute** | Plan, specs, code | Everything in source/ | Worktree (heavy changes) |
| **Reconcile** | Specs, code, branch diff | Spec file edits | Branch (targeted edits) |

### Execution Flow

1. Audit agent checks the plan on main (`workflow/plans/`), marks it READY
2. Orchestrator moves the plan to `workflow/plans/active/` on main, commits, pushes
3. Execute agent spawned with `isolation: "worktree"`
4. Execute agent reads the plan, creates tasks, implements all phases
5. Execute agent runs tests, commits per phase
6. Execute agent updates specs to match what was built
7. Execute agent moves plan to `workflow/plans/archived/` with execution notes
8. Execute agent opens a PR via `gh pr create`
9. Post-plan polish, bug fixes (additional commits on branch)
10. `/reconcile` diffs the branch against specs, catches any drift from post-plan commits
11. PR is reviewed and squash-merged to main
12. On merge: code lands, plan is in `archived/`, specs are current

## Research

`research/` holds distilled knowledge about the world outside the codebase: platforms, competitors, protocols, design patterns, and vendor evaluations. Each file covers one topic. Research is durable reference material that informs specs and proposals but is not itself a spec (it describes what exists, not what we're building).

Research files are updated as new information comes in. They don't follow the proposal/plan lifecycle. When research leads to a decision about what to build, that decision becomes a proposal.

## Transcripts

`transcripts/` holds cleaned records of design sessions, team calls, and working conversations. They're a critical context layer because they capture reasoning, domain knowledge, and decisions that haven't yet made it into specs or proposals. A spec says what was decided. A transcript shows how and why.

Meetings are one of the richest sources of context in any project. A single design call can produce proposals, research tasks, experiments, spec updates, and glossary corrections. Without transcripts, that knowledge lives in people's heads. With transcripts, it becomes durable context that agents and future team members can reference.

The `/import-transcript` skill automates the cleanup: read the raw transcript, strip noise, normalize speaker names, map terminology to canonical project terms, and write a clean version with next steps split into agent-actionable items and human action items.

## Skills

Skills are Claude Code slash commands that encode repeatable workflows. Each skill has a `SKILL.md` file with instructions the agent follows.

In this repo, CDD skills live in `skills/cdd/`:

### Pipeline Skills

These form the core CDD workflow in order:

| Skill | Purpose | Input | Output |
|-------|---------|-------|--------|
| `/accept-proposal` | Approve a proposal, survey codebase, write execution plan | Proposal file | Accepted proposal + plan in `workflow/plans/` |
| `/audit-plan` | Verify plan readiness: deps, data, open questions, POC gaps | Plan file | Readiness audit appended to plan |
| `/execute-plan` | Implement a plan in a worktree: code, test, spec update, PR | Plan file | Branch with code + PR |
| `/reconcile` | Diff branch vs specs, fix post-plan drift before merge | Branch (auto-detected) | Spec edits committed |

### Writing New Skills

A skill is a `SKILL.md` file with YAML frontmatter (`name`, `description`, `args`) followed by markdown instructions. The agent reads and follows these instructions when the skill is invoked.

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
- "At-most-once delivery. Delete on failure rather than retry. Avoids infinite loops."
- "Poll every 2 seconds, not file watchers. Reliable, cross-platform."
- "Global registry at ~/.claude/intercom/. Home directory level, not per-repo. This is what makes cross-repo messaging work."

**Decisions with reasoning.** The "why not" is as important as the "what":
- "File-based inbox, not a database. Simplest thing that works for single-user, single-machine."
- "No authentication. Trust boundary is the OS. Single-user assumption."
- "MCP channels protocol for delivery, not tool-call polling. Real-time is the differentiator."

**Non-obvious architecture.** Choices an agent might undo without context:
- "Messages move from inbox/ to processed/ after delivery (not deleted)"
- "Agent registration is on startup via info.json, not on first message"

### What Doesn't Belong in Specs

Everything an agent can derive from reading the code:
- **TypeScript interfaces and type definitions.** Read the source file.
- **MCP tool parameter schemas.** Read the tool definitions in intercom.ts.
- **File path constants.** Read the code.
- **Setup/install instructions.** Those belong in README or docs/, not a spec.

### Spec Types

| Spec Type | Contains | Does NOT Contain |
|-----------|----------|------------------|
| **Protocol** (e.g., protocol.md) | Message format rules, delivery semantics, registry behavior, design decisions | TypeScript types, exact file paths, MCP SDK API calls |
| **Feature** (e.g., a future delivery-receipts.md) | What the feature does, why, the rules that govern it | Implementation details the code makes obvious |
| **Sandbox** (specs/sandbox/) | Rough ideas, domain sketches, things being explored | Anything polished enough to be a real spec |
