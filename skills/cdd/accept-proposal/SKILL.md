---
name: accept-proposal
description: Accept a proposal and create an execution plan from it. Moves the proposal to accepted/ with a date prefix, updates its status, surveys the codebase for impact, and writes a plan in workflow/plans/. Use when the user says "/accept-proposal", "accept this proposal", or wants to approve a proposal and generate a plan.
args: "[path to proposal file, e.g. workflow/proposals/delivery-receipts.md]"
---

> **Requires CDD 2025.03.27.** This skill expects the repo to use Context-Driven Delivery folder structure (`workflow/proposals/`, `workflow/plans/`, `specs/`). See `CDD.md` at the repo root.

# /accept-proposal - Accept Proposal and Create Plan

Accept a design proposal, move it to the decision log, and generate an execution plan from it.

## Usage

```
/accept-proposal workflow/proposals/delivery-receipts.md
/accept-proposal workflow/proposals/telegram-bridge.md
```

If no argument is provided, scan `workflow/proposals/` for draft proposals (excluding `accepted/` subdirectory and `README.md`). Then:

- **Zero proposals:** Tell the user there are no draft proposals.
- **One proposal:** Proceed with it automatically.
- **Multiple proposals:** List the 5 most recent (sorted by file modification time, newest first) and ask the user to pick one. Format as a numbered list:

```
Which proposal should I accept?

1. delivery-receipts.md (Apr 1)
2. telegram-bridge.md (Mar 31)
3. session-gap-periods.md (Mar 31)
4. restore-jsonl-token-tracking.md (Mar 28)
5. pg-dev-prod-split.md (Mar 28)
```

Wait for the user to respond with a number or name before proceeding.

## Instructions

### Step 1: Read the Proposal

Read the proposal file. Extract:
- **Problem**: What's wrong or inconsistent today
- **Proposed Change**: What should change and why
- **What Changes**: Files and areas affected
- **What Doesn't Change**: Scope boundaries
- **Design Principles**: Constraints on the solution

If the proposal doesn't have a clear problem statement or proposed change, stop and tell the user: "This proposal needs more detail before it can be accepted. It's missing [X]."

Check whether the proposal includes a **Codebase Context** section (or equivalent: "Current Implementation", "What Exists Today", etc.). If present, verify the key file paths still exist (they may be stale). If missing, add one before proceeding - use the Explore agent to find relevant files and add a `## Codebase Context` section with the same format as `/create-proposal` produces. This front-loads the survey work and saves significant time in Step 3.

### Step 2: Move to Accepted

1. Move the proposal to `workflow/proposals/accepted/` with today's date prefix:

```bash
git mv workflow/proposals/foo.md workflow/proposals/accepted/YYYY-MM-DD-foo.md
```

2. Update the status in the file from `Draft` to `Accepted`.

### Step 3: Survey the Codebase

If the proposal has a Codebase Context section, use it as your starting point. Verify that the file paths still exist and the descriptions are still accurate. Extend as needed for areas the proposal didn't cover.

If the proposal lacks codebase context, survey from scratch using the Explore agent (or Grep/Glob directly for small proposals). The proposal's "What Changes" section is a starting point, but verify against the actual codebase. Don't trust the proposal blindly.

For each affected area, note:
- Which files need changes
- What kind of change (rename, restructure, new code, delete)
- Any dependencies between changes (ordering constraints)

### Step 4: Write the Plan

Create `workflow/plans/<proposal-name>.md` using the same base name as the proposal (without the date prefix).

**Multiple plans:** If the proposal is large enough to warrant multiple plans (the proposal or your survey may suggest this), create one plan per independently shippable chunk. Number them with a prefix: `1-sidebar-layout.md`, `2-widget-panels.md`, `3-claude-gauge.md`. The numbers indicate execution order. Plans with the same number can run in parallel. Include `**Depends on:**` in each plan that requires a prior plan to ship first.

The plan must include:

1. **Title**: `# Plan: <descriptive name>`
2. **Goal**: One sentence summarizing what we're doing
3. **Proposal reference**: Link to the accepted proposal at its new path
4. **Why This Matters**: Brief context (can be adapted from the proposal's Problem section)
5. **Acceptance Criteria**: Checklist of verifiable outcomes
6. **Phases**: Ordered groups of related changes, each with:
   - Which files change
   - What changes in each file
   - Why this phase is grouped together
7. **What Does NOT Change**: Scope boundaries from the proposal

**Phasing guidelines:**
- Group by blast radius: demo/UI changes first (visible, easy to verify), then code, then docs
- Each phase should be independently testable where possible
- The last phase should always be "regenerate/rebuild + test"
- Keep phases small enough to review but large enough to be meaningful

**Plan quality bar:**
- Every file mentioned should actually exist (verify with Glob)
- Acceptance criteria should be verifiable with a command or grep
- No vague items like "update references" without listing which references

8. **Where to Start**: A non-authoritative section at the end with codebase pointers from the survey. Clearly marked as potentially stale. Organized as:
   - Core flow to trace (the main code path affected)
   - Views that should/shouldn't change (for verification)
   - Existing test files (what to update/delete/create)
   - Example data or config files

   This gives the execution agent a head start without being prescriptive. Mark it: "These are pointers from the codebase survey at plan creation time. Files may have changed by execution time. Verify before acting."

### Step 5: Output Summary

Tell the user:
- Where the accepted proposal now lives
- Where the plan was created
- How many files/phases the plan covers
- Suggest next step: `/audit-plan` or `/execute-plan`

## Key Principles

- **The proposal is the decision. The plan is the work.** Don't re-argue the proposal's rationale in the plan. Reference it.
- **Survey, don't guess.** The proposal says what should change conceptually. The plan says what actually needs to change in the codebase. These may differ. Trust the codebase.
- **Plans are for agents.** Write the plan so that `/execute-plan` can pick it up and run it autonomously. Be specific about files and changes.
- **Keep scope tight.** If the survey reveals work beyond the proposal's scope, note it as a follow-up, don't add it to the plan.
