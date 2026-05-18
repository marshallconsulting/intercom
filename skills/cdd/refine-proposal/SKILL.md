---
name: refine-proposal
description: Grill the user on a draft proposal to surface gaps, missing decisions, and ambiguities before it gets accepted. Reads the proposal, specs, and playbook, then asks pointed questions. Updates the proposal with answers. Use when the user says "/refine-proposal" or wants to pressure-test a proposal before acceptance.
argument-hint: "[path to proposal file]"
---

> **Requires CDD v1.** This skill expects the repo to use Context-Driven Development folder structure (`workflow/proposals/`, `specs/`, `playbook/`). See `CDD.md` at the repo root.

# /refine-proposal - Pressure-Test a Proposal

Read a draft proposal, cross-reference it against the codebase and specs, and ask the user every question that needs an answer before this can become a plan.

## Usage

```
/refine-proposal workflow/proposals/build-credit-system.md
/refine-proposal
```

If no argument, scan `workflow/proposals/` for draft proposals (excluding `accepted/`). If exactly one, use it. If multiple, ask the user which one.

## Why This Exists

The gap between "proposal looks good" and "plan has everything it needs" is where execution breaks down. A plan author (human or agent) needs unambiguous decisions to work from. This skill finds every ambiguity and forces a decision before the proposal moves forward.

## Instructions

### Step 1: Read Everything

1. Read the proposal file
2. Read `specs/system-overview.md` for domain context
3. Read any specs referenced by or relevant to the proposal
4. Read relevant playbook files (e.g., `playbook/frontend.md` if there are UI changes, `playbook/data-layer.md` if there are schema changes, `playbook/testing.md` for test expectations)
5. Read `CLAUDE.md` for project conventions

### Step 2: Build the Question List

Analyze the proposal through these lenses. For each lens, generate specific questions if the proposal does not already answer them. Skip questions the proposal has already decided.

**Scope & Boundaries**
- Is the scope tight enough for a single PR, or does it need phasing?
- Are there implicit dependencies on other features not mentioned?
- What is explicitly out of scope? (If the proposal does not say, ask.)

**Data Model**
- Are all new schemas fully specified (fields, types, constraints, indexes)?
- Are there foreign key relationships that need cascade/nullify decisions?
- Do any existing schemas need new fields or associations?
- Is there a migration strategy if this touches existing data?

**Business Rules**
- Are all business rules stated as unambiguous, implementable declarations?
- Are edge cases covered? (What happens when X is zero? When Y is nil? When Z expires mid-operation?)
- Are there race conditions? (Two concurrent operations on the same resource?)

**Feature Flags & Rollout**
- Should this be behind a feature flag?
- If yes, what type? (Boolean on product? Tri-state hide/upsell/allow? Config toggle?)
- What is the rollout plan? (Flag on for admins first? Gradual? All at once?)
- What do existing users see before/after the feature is enabled?

**Testing**
- What test scenarios are critical? (Happy path, edge cases, failure modes)
- Are there integration points that need test coverage? (Webhooks, external APIs, PubSub)
- Does this need seed data changes for local development?

**UI / UX**
- Are all UI changes described with enough detail to implement? (Not pixel-perfect, but clear on what goes where)
- Are there loading states, empty states, or error states to handle?
- Does this affect navigation or information architecture?
- Mobile considerations?

**Integration Points**
- Does this touch external services (Stripe, Apple, Tapfiliate, etc.)?
- Are webhook handlers needed or modified?
- Does this need PubSub broadcasts? What topics?
- Are there cron/background jobs needed?

**Performance & Scale**
- Are there queries that could be expensive at scale?
- Does this need caching?
- Are there N+1 risks in the data access patterns?

**Security & Access Control**
- Who can perform each operation? (Any user? Subscribers only? Admins?)
- Are there authorization checks needed?
- Is there user input that needs validation or sanitization?

**Open Questions Check**
- Does the proposal have an Open Questions section?
- For each open question: push the user for a decision. Do not let open questions survive refinement.

### Step 3: Present Questions

Group questions by category. Lead with the most important ones (things that would block plan creation). For each question:

- State what the proposal currently says (or does not say)
- Explain why this matters for the plan
- Suggest a default answer if one is obvious, but let the user override

Format:

```
## Questions

### Feature Flags & Rollout
1. **Should this be behind a feature flag?**
   The proposal doesn't mention feature flags. Given this is a new feature
   touching the header and account settings, a flag would let you ship
   incrementally. Suggest: boolean `credits?` on the product, defaulting
   to false.

### Data Model
2. **Cascade behavior on account deletion?**
   The proposal adds credit_batches and credit_transactions with account_id
   FK. If an account is deleted, should batches and transactions cascade
   delete or be retained for audit?
   ...
```

### Step 4: Collect Answers

Wait for the user to answer. They may answer all at once or in batches. For each answer:
- Confirm you understood it
- Note if the answer creates new implications (e.g., "if it is behind a feature flag, the header display also needs to check the flag")

### Step 5: Update the Proposal

Once all questions are answered (or the user says "good enough"):

1. Move answered open questions to the **Decided** section with attribution
2. Add new decisions from this session to **Decided**
3. Remove resolved items from **Open Questions**
4. Add any NEW open questions that surfaced during discussion
5. Update the **Synced** line or add a **Refined** timestamp
6. If scope changed, update the **Scope** section

Do not rewrite sections the user did not change. Only add/move decisions.

### Step 6: Confirm

Tell the user:
- How many questions were resolved
- How many open questions remain (if any)
- Whether the proposal is ready for `/accept-proposal` or needs another round

## Key Principles

- **Be specific, not generic.** "Have you considered error handling?" is useless. "What happens when a Stripe checkout session for credits expires before completion - does the user see an error, or silently nothing?" is useful.
- **Push for decisions, not discussion.** The goal is to move open questions to the Decided section. If the user says "I need to think about it," that is fine, but note it stays open.
- **Cross-reference the specs.** If the proposal adds a new schema, check it against `specs/subscriptions.md` or `specs/accounts.md` to see if it conflicts with existing patterns.
- **Check the playbook.** If the proposal includes UI changes, check `playbook/frontend.md` for conventions. If it adds a migration, check `playbook/data-layer.md`.
- **Do not invent requirements.** Ask about things that are ambiguous or missing. Do not suggest features the user did not ask for.
- **Respect decisions already made.** If Jeff already decided "bonus credits, not reduced price," do not re-litigate it. Only ask about things that are genuinely unresolved.
