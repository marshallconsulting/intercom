---
name: create-proposal
description: Create a CDD proposal from a GitHub issue. Fetches the issue description, comments, and Q&A, surveys the codebase for context, and writes a structured proposal to workflow/proposals/. Use when the user says "/create-proposal", "write a proposal", "draft a proposal", or wants to turn a GitHub issue into a proposal.
argument-hint: "<GitHub issue URL>"
---

> **Requires CDD v1.** This skill expects the repo to use Context-Driven Development folder structure (`workflow/proposals/`, `workflow/plans/`, `specs/`). See `CDD.md` at the repo root.

# /create-proposal - Create a CDD Proposal from a GitHub Issue

Draft a design proposal from a GitHub issue, with codebase context baked in.

## Usage

```
/create-proposal https://github.com/AkstonWyatt/GameDayMath/issues/903
```

## Instructions

### Step 0: Triage - Does This Need a Proposal?

Not every issue needs the proposal pipeline. After fetching the issue (Step 1), evaluate whether this is:

**A bug with a clear fix**: The issue has a diagnosis, a root cause, and a known fix location. There is no design decision to make. Skip the proposal and tell the user:

> "This is a bug with a clear fix, not a design decision. A proposal would be overkill. Want me to just fix it and open a PR instead?"

If the user agrees, create a branch, apply the fix, run lint/test, and open a PR. Done.

**A small, self-contained change**: The issue asks for something specific with no ambiguity (e.g., "add field X to page Y", "change the sort order of Z"). No design trade-offs, no schema changes, no multi-step architecture. Same as above: offer to skip the proposal and just do it.

**A feature or design decision**: The issue involves new schemas, new UI flows, trade-offs between approaches, product owner Q&A, or scope that needs bounding. This needs a proposal. Continue to Step 1.

When in doubt, lean toward creating the proposal. The cost of an unnecessary proposal is low (a markdown file). The cost of skipping one on a complex feature is rework.

### Step 1: Fetch the Issue

Run `gh issue view <number> --repo <owner/repo> --comments` to get:
- Issue title and description
- All comments (full discussion thread)
- Labels and assignees

Parse the thread and identify:
- **The problem:** What's wrong or missing (usually in the description)
- **Q&A:** Questions asked and answers given. Look for quote-reply patterns, numbered lists of questions with corresponding answers, etc.
- **Decisions:** Things that have been settled in the discussion
- **Open questions:** Things still unresolved
- **Design direction:** Any mockups, screenshots, or design preferences mentioned

Derive the proposal filename from the issue title in kebab-case (e.g., "Credit System for Picks Marketplace" becomes `credit-system-for-picks-marketplace.md`).

### Step 2: Survey the Codebase

Use the Explore agent (or Grep/Glob for small, focused proposals) to find the code relevant to the problem. This is the most important step. The goal is to understand what exists today so the proposal is grounded in reality, not speculation.

Find:
- Schemas, contexts, and LiveViews involved in the problem area
- Components and templates that display related data
- Test files for the above
- Config files (routes, jobs, etc.) that touch this area
- How data flows through the system for this feature

Keep notes on file paths and what each does. This becomes the Codebase Context section.

### Step 3: Write the Proposal

Create `workflow/proposals/<name>.md` with these sections:

```markdown
# <Title> - Proposal

**Status:** Draft
**Date:** <today's date>
**Author:** Doug + Claude
**Origin:** <GitHub issue URL>
**Synced:** <today's date> (last comment by <username>, <timestamp of last comment>)

## Summary

One paragraph. What are we doing and why.

---

## Problem

What's wrong or missing today. Be specific. Distilled from the issue description
and discussion. Include concrete examples of pain points or capabilities we need.

---

## Decided

What's been settled in the issue discussion. Organized by topic. Each item should
reference who decided it (e.g., "Jeff confirmed: credits expire after 12 months").

This section is the key value of an issue-sourced proposal. The raw issue thread
might be 15 comments of back-and-forth. This is the clean, distilled version.

---

## Codebase Context

> Non-authoritative. Code may change before this proposal is accepted or executed.
> These are pointers to help orient, not implementation instructions.

Where the relevant code lives today. Organized by area:

- **Schemas**: `lib/gameday_math/foo.ex` - what it does, key fields
- **Contexts**: `lib/gameday_math/bar.ex` - what it does, what calls it
- **LiveViews**: `lib/gameday_math_web/live/baz_live.ex` - which actions use what
- **Components**: `lib/gameday_math_web/components/...` - what displays this data
- **Config**: `config/...` - relevant configuration
- **Tests**: `test/gameday_math/...` - what's covered

Keep it factual: "X lives at Y, does Z, called by W." Not prescriptive: don't say
"X should be changed to..." - that's for the Proposed Design section.

---

## Proposed Design

What changes conceptually. Describe the new schemas, contexts, or data flows.
Include enough detail for someone to evaluate the approach, but don't write
implementation instructions. This is architecture, not a plan.

Use schema-style pseudocode for new tables. Use code snippets for key API changes.
Reference the Codebase Context section for what's being replaced or modified.

---

## What This Unlocks

Numbered list of concrete outcomes. What capabilities does this add?
What pain points go away?

---

## Scope

Bullet list of what's in scope. Be specific enough to bound the work:
- "Migration: N new tables"
- "Context: new module for X"
- "UI: new LiveView for Y, update Z"
- "No changes to W"

---

## Open Questions

Numbered list of decisions that aren't settled yet. These are things that were
NOT resolved in the issue discussion. Include enough context for the user to
make a call.
```

### Section Guidelines

**Decided section:**
- This is the key differentiator from a generic proposal
- Each item should be traceable: "Jeff: bonus credits, not reduced price" not just "bonus credits"
- Group by topic when there are many decisions
- If a Q&A happened in the issue, map answered questions here

**Problem section:**
- Lead with the pain, not the solution
- Distill from the issue description, don't just copy-paste it
- If the issue description is well-written, you can keep its structure but tighten it

**Codebase Context section:**
- File paths must be real (verify with Glob)
- Describe current data flow: "A calls B, which reads C and writes D"
- Include test files so the execution agent knows what to update
- Mark clearly as non-authoritative with the blockquote header

**Proposed Design section:**
- Describe the "what", not the "how to implement"
- New schemas: show table structures in pseudocode
- Replacements: reference what's being replaced from Codebase Context
- Keep it evaluatable: could someone read this section and say "yes/no/needs changes"?

**Open Questions section:**
- Real unknowns only. If it was answered in the issue, it belongs in Decided
- Include enough context that the user can decide without re-reading the issue
- Good: "Retention: keep all credit batches forever, or archive after expiry?"
- Bad: "Should we use Ecto?" (obviously yes)

### Step 4: Output

Tell the user:
- Where the proposal was created
- Brief summary of what it covers
- How many decisions were captured vs. open questions remaining
- Suggest: "Review it and `/accept-proposal` when ready, or tell me what to change."

## Updating a Proposal

If `/create-proposal` is run on an issue that already has a proposal in `workflow/proposals/`:

1. Fetch the issue again
2. Compare the **Synced** timestamp to the latest comment
3. If new comments exist, identify what's changed: new decisions, resolved questions, updated requirements
4. Update the proposal: move newly-answered items from Open Questions to Decided, update sections as needed
5. Bump the **Synced** watermark

## Key Principles

- **Proposals are decisions, not plans.** A proposal says "we should do X because Y." It doesn't say "first create file A, then edit file B." That's the plan's job.
- **The issue is the discussion. The proposal is the distillation.** Don't copy-paste the issue thread. Synthesize it into something clean and actionable.
- **Codebase context is the proposal's superpower.** A proposal without codebase context forces the accept-proposal step to survey from scratch. A proposal with it lets the planner verify and extend, not discover.
- **Right level of detail.** Enough to evaluate the approach. Not enough to implement it. If you're writing file-level change lists, you've gone too far. If you're hand-waving about "update the relevant contexts," you haven't gone far enough.
- **Proposals are for humans.** The user reads this and decides yes/no/revise. Write for that audience. Plans are for agents. Proposals are for Doug.
