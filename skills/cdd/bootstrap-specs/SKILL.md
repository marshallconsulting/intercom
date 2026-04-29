---
name: bootstrap-specs
description: Survey an existing codebase and generate initial CDD specs. Explores contexts, schemas, routes, and integrations, then writes domain-focused spec files to specs/. Use when adopting CDD into a repo that has no specs, or when the user says "/bootstrap-specs".
---

> **Requires CDD 2025.03.27.** This skill expects the repo to use Context-Driven Delivery folder structure (`specs/`). See `CDD.md` at the repo root.

# /bootstrap-specs - Bootstrap Specs from an Existing Codebase

Survey a running codebase and generate initial domain specs so agents and humans have written context to work from.

## Why This Exists

When CDD is adopted into an existing repo, the code is the only source of truth. There are no specs explaining what the system is or why each piece exists. This skill reads the code and produces first-draft specs that capture the domain knowledge embedded in the implementation.

The output is a starting point. Specs will be refined as the team works with them.

## Instructions

### Step 0: Check for Existing Specs

Read `specs/` to see what already exists. The skill should fill gaps, not overwrite existing work. If `specs/` has some files, note which domains are already covered and skip them in the survey.

### Step 1: Survey the Codebase

Launch parallel Explore agents to map the system. The goal is to understand **what the system does** from a business perspective, not how it's implemented.

**Survey targets (adapt to the framework):**

| What to find | Where to look (Elixir/Phoenix) | Where to look (Rails) | Where to look (TypeScript/Bun) | Where to look (generic) |
|---|---|---|---|---|
| Business contexts | `lib/<app>/` subdirectories + context modules | `app/models/`, `app/services/` | `source/` modules, service files | Domain modules, service layers |
| Data model | Schema/model files, migrations | `db/schema.rb`, model files | Type definitions, schema files | ORM models, DB schemas |
| User-facing features | LiveViews/controllers, router | Controllers, routes | Handlers, route definitions | Routes, views, handlers |
| External integrations | Top-level lib modules (API clients, pollers) | `app/services/`, `lib/` | API client modules | Client modules, API wrappers |
| Access control | Auth modules, role checks, feature flags | Pundit/CanCanCan policies | Auth middleware | Auth middleware, guards |
| Background processing | Job modules, pollers, workers | Sidekiq/ActiveJob workers | Pollers, queue consumers | Queue consumers, cron |

**For each domain area, capture:**
- What it does (business purpose, not implementation)
- Key entities and their relationships
- Important business rules ("credits expire FIFO", "messages deliver at-least-once")
- States and lifecycles (pending -> active -> completed)
- How it connects to other domains

**Do NOT capture:**
- File paths (they change, and agents can find them)
- Type definitions or API schemas (those belong in code)
- Setup instructions (those belong in CLAUDE.md or playbook)
- How to build or test (that's the playbook's job)

### Step 2: Identify Spec Boundaries

Group what you found into natural domain boundaries. Each spec should cover one coherent area of the system.

**Good spec boundaries:**
- One business domain (accounts, billing, messaging)
- One major subsystem (delivery engine, registry)
- One cross-cutting concept (the messaging protocol glossary, agent lifecycle)

**Bad spec boundaries:**
- One file or module (too granular)
- "Backend" vs "Frontend" (those aren't domains)
- "Utils" or "Helpers" (no business meaning)

**Aim for 5-15 specs** depending on system complexity. Fewer is better if the domains are small.

### Step 3: Draft the Spec Index

Before writing specs, present the proposed spec list to the user:

```
## Proposed Specs

| Spec | Covers |
|------|--------|
| `system-overview.md` | What the system is, major domains, how they connect |
| `protocol.md` | Message format, delivery semantics |
| `registry.md` | Agent registration and discovery |
| ... | ... |

**Already covered:** protocol.md (existing, will not overwrite)

**Proceed?** I'll write these as first drafts. You can edit, merge, or split them after.
```

Wait for user confirmation before writing.

### Step 4: Write the Specs

Write each spec to `specs/<name>.md`. Start with `system-overview.md` as the anchor document.

**Spec format:**

```markdown
# <Domain Name>

One paragraph: what this part of the system is and why it exists.

## <Major Concept>

Explain the concept. Use concrete examples, not abstract descriptions.

### <Sub-concept or Rule>

Business rules, edge cases, important behaviors.

## <Another Major Concept>

...

## How It Connects

Which other domains this one touches and why. Keep it brief.
Reference other specs by name: "See [Protocol](protocol.md) for message format."
```

**Writing guidelines:**

- **Lead with what, then why.** "Messages move from inbox/ to processed/ after delivery. This preserves history without re-delivering."
- **Use concrete examples.** "Agent ID `team-cto` writes to `~/.claude/intercom/team-cto/inbox/`" is better than "agents write to per-agent inboxes."
- **Include business rules as declarative statements.** "An agent ID must be unique across all running agents. Re-registration replaces the prior info.json."
- **Include worked examples for non-obvious logic.** Show inputs and outputs. Walk through the algorithm in plain language.
- **State edge cases as a table.** Compact, scannable, unambiguous.
- **Name the entities.** An agent reading the spec should know the vocabulary: "An Inbox is a per-agent directory. A Channel notification is the MCP delivery event."
- **Don't describe the UI.** Specs say what the system *is*, not what the screens look like.
- **Don't prescribe implementation.** No file paths, no function signatures, no "this should be a class."
- **Keep each spec under 200 lines.** If it's longer, split it. A spec that's too long won't get read.

**system-overview.md format:**

```markdown
# <System Name>

What this system is, in one paragraph.

## Domains

Brief description of each domain and what it owns.

### <Domain 1>
What it is, one sentence. Key entities.

### <Domain 2>
...

## How They Connect

Describe the major data flows and domain relationships.
A diagram or flow description works well here.

## Key Terminology

Terms that are used across domains. Link to the detailed spec
where each term is fully explained.
```

### Step 5: Write system-overview.md First

This is the anchor. Every other spec can reference it, and any agent entering the repo can read this one file to understand the system at a high level.

Write it, then write the remaining specs. Use parallel agents for independent specs to go faster.

### Step 6: Report Results

Tell the user:
- How many specs were created
- Which domains are covered
- Any areas where you weren't confident (flag for human review)
- Suggest: "Read through these and tell me what's wrong, missing, or over-explained. These are first drafts."

## Key Principles

- **Specs are domain knowledge, not documentation.** They explain what the system *is* and why, not how to use or build it. "Messages deliver at-least-once" is a spec. "Run `bun test` to run tests" is not.
- **First drafts, not final drafts.** The goal is to get something written that's 80% right. The team refines from there. Don't agonize over perfection.
- **Capture what's non-obvious.** If an agent could figure it out by reading the code in 30 seconds, it probably doesn't need a spec. If it would take 30 minutes of reading multiple files to piece together, it definitely does.
- **Business rules are the highest-value content.** Validation rules, state machines, calculation formulas, edge case handling. These are the things that get reimplemented wrong when there's no spec.
- **Existing specs are sacred.** Never overwrite a spec that already exists. The team wrote it for a reason. Only add new ones for uncovered domains.
