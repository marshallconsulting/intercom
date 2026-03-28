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

If no argument is provided, scan `workflow/proposals/` for draft proposals (excluding `accepted/` and `README.md`). If there's exactly one, proceed with it automatically. If there are multiple, use `AskUserQuestion` to let the user pick which one to accept. If there are none, tell the user there are no draft proposals.

## Instructions

### Step 1: Read the Proposal

Read the proposal file. Extract:
- **Problem**: What's wrong or inconsistent today
- **Proposed Change**: What should change and why
- **What Changes**: Files and areas affected
- **What Doesn't Change**: Scope boundaries
- **Design Principles**: Constraints on the solution

If the proposal doesn't have a clear problem statement or proposed change, stop and tell the user: "This proposal needs more detail before it can be accepted. It's missing [X]."

### Step 2: Move to Accepted

1. Move the proposal to `workflow/proposals/accepted/` with today's date prefix:

```bash
git mv workflow/proposals/foo.md workflow/proposals/accepted/YYYY-MM-DD-foo.md
```

2. Update the status in the file from `Draft` to `Accepted`.

### Step 3: Survey the Codebase

Use the Explore agent (or Grep/Glob directly for small proposals) to find all files affected by the proposal. The proposal's "What Changes" section is a starting point, but verify against the actual codebase. Don't trust the proposal blindly.

For each affected area, note:
- Which files need changes
- What kind of change (rename, restructure, new code, delete)
- Any dependencies between changes (ordering constraints)

### Step 4: Write the Plan

Create `workflow/plans/<proposal-name>.md` using the same base name as the proposal (without the date prefix).

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
