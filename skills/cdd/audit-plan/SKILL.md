---
name: audit-plan
description: Audit a plan's readiness before execution. Checks sample data, dependencies, open questions, POC gaps, and blockers. Appends a Readiness Audit section to the plan file. Use when the user says "/audit-plan", "audit the plan", or wants to check if a plan is ready to execute.
args: "[path to plan file, e.g. workflow/plans/delivery-receipts.md]"
---

> **Requires CDD v1.** This skill expects the repo to use Context-Driven Development folder structure (`workflow/proposals/`, `workflow/plans/`, `specs/`). See `CDD.md` at the repo root.

# /audit-plan - Plan Readiness Audit

Audit a plan to determine if it's ready for autonomous execution via `/execute-plan`. The goal: after the audit is resolved, the plan can be executed without human intervention. The audit surfaces everything that needs a human to produce, decide, review, or provide before that's possible.

## Usage

```
/audit-plan workflow/plans/delivery-receipts.md
/audit-plan workflow/plans/telegram-bridge.md
```

If no argument is provided, list available plans in `workflow/plans/` (excluding `archived/` and `active/`) and ask the user to pick one.

**IMPORTANT:** Never audit plans in `workflow/plans/active/`. Active plans are currently being executed and must not be modified by the audit. Only audit plans that are in the top-level `workflow/plans/` directory (i.e., not yet started). If the user points to an active plan, inform them that active plans are off-limits and ask if they want to audit a different plan.

## Instructions

### Step 1: Read the Plan

Read the plan file yourself. Extract the plan path and enough context to brief the subagent. You need:
- The full plan file path
- The list of phases/steps and what each one needs to execute
- Referenced specs (read them for context on what's being built)
- Referenced code (existing files the plan builds on or modifies)
- Data requirements (test data, sample inputs, fixtures)
- External dependencies (APIs, credentials, libraries)
- Open questions listed in the plan

If the plan doesn't have clear phases or acceptance criteria, note that as a blocker and stop.

### Step 2: Launch Audit Subagent

Launch an **Explore** subagent in the background to perform the full audit investigation. The subagent does all file verification, dependency checks, and gap analysis, then returns structured results to you.

**Use `Agent` with `subagent_type: "Explore"` and `run_in_background: true`.** While the audit runs, tell the user it's running in the background.

Give the subagent a prompt that includes:
1. The full plan content (paste it into the prompt so the subagent has it)
2. Instructions to perform all six audit checks (2a-2f below)
3. Instructions to return structured results in the format specified below

**Subagent audit checks to perform:**

#### 2a. Input Data

What sample data does the plan need? For each:
- Does it exist at the expected path?
- Is it synthetic and safe to commit?
- Is there enough of it?
- Are there answer keys / expected outputs for validation?
- Does the test data connect to other test data?

#### 2b. Dependencies & Tools

What libraries, APIs, and tools does the plan require? For each:
- Is it installed? (e.g., `bun pm ls`, `python3 -c "import X"`)
- Is it declared in package.json / pyproject.toml / requirements.txt?
- Are credentials configured? (Check .env for required keys, don't print values)
- Are prerequisite code artifacts in place? (e.g., "the plan extends intercom.ts, does intercom.ts exist and have the expected interface?")

#### 2c. Open Questions

Collect all unresolved decisions from:
- The plan's own "Open Questions" section
- Gaps discovered during the audit (things the plan assumes but doesn't verify)
- Ambiguities in acceptance criteria

Classify each as:
- **Blocking** - Can't start execution without resolving this
- **Non-blocking** - Can start, but will need to decide during execution
- **Deferred** - Can be resolved after the plan is done

#### 2d. POC Gaps

What assumptions hasn't the plan validated? Look for:
- New integrations that haven't been tested
- Format/data transformations where quality is unknown
- Performance assumptions
- Interfaces between components that don't exist yet

For each gap, suggest a concrete, small POC to validate it (a single command, a quick script, a manual test).

**When POC gaps are found, create experiments.** Don't just list them in a table and move on. For each gap that can be validated without human input, create a minimal experiment in `experiments/` that proves or disproves the assumption:

- Name the file descriptively: `experiments/poc-channel-delivery-latency.ts`, `experiments/poc-cross-repo-inbox.sh`, etc.
- The experiment should be self-contained and runnable. A single script, a short test file.
- Include a comment at the top explaining what assumption it validates and what a passing result looks like.
- After creating the experiment, **run it** if possible. Record the result in the POC Gaps table.
- If the experiment can't be run automatically, note that in the table and leave it for the human.
- Experiments that pass can be deleted or kept as reference. Experiments that fail are blockers.

#### 2e. Blockers

Hard blockers that prevent execution:
- Missing files that the plan requires
- Missing credentials or API access
- Circular dependencies between phases
- Plan references code or specs that don't exist

#### 2f. Spec Update Step

**This is critical. Stale specs are worse than no specs because they mislead future agents.**

Every plan must include a step that updates specs in `specs/` to reflect what was actually built. Check whether the plan includes this. If it doesn't, **add one as a blocker** and note it in the Revision Log.

The step should:

- List every spec file in `specs/` that the execution may affect (check the plan's phases and any existing specs that describe the areas being changed)
- Point the agent at areas to review (e.g., new message types added, delivery semantics changed, registry format updates)
- Be explicit: "Update specs/protocol.md to reflect the new delivery receipt fields" not just "update specs"

If the plan is missing this step, add it as the final phase before archiving, and note it in the Revision Log. Mark it as a required step in the acceptance criteria.

**Required return format from the subagent:**

Tell the subagent to structure its response as:

```
## Audit Results

### Input Data
| Input | Status | Notes |
...

### Dependencies
| Dependency | Status | Notes |
...

### Open Questions
| # | Question | Blocking? | Notes |
...

### POC Gaps
| # | Assumption | Suggested POC | Result |
...

### Blockers
[list or "None identified"]

### Spec Update
[which specs need updating, whether the plan already covers this]

### Recommended Plan Changes
[any phases to add/modify, acceptance criteria to add, etc.]

### Verdict
[READY / NEEDS HUMAN INPUT / NOT READY] with one-sentence summary
```

### Step 3: Process Audit Results and Write the Readiness Audit

When the subagent returns, process its results. Apply any recommended plan changes (add missing phases, fix references, add acceptance criteria). Then write the audit to the plan file.

Append a `## Readiness Audit` section to the plan file. If a previous audit already exists, **update it in place**: add a new row to the Audit Log, update the Verdict and all sections below to reflect current state. Do NOT delete the Audit Log history.

Also add or update a `### Revision Log` at the top of the plan file (after the title and description, before the first content section). This tracks changes to the plan itself, not just the audit.

Use this format:

**At the top of the plan file (after title/description):**

```markdown
### Revision Log

| Date | What Changed |
|------|-------------|
| YYYY-MM-DD HH:MM TZ | Plan created. Brief description. |
| YYYY-MM-DD HH:MM TZ | Description of what changed in this revision. |
```

**For the audit section:**

```markdown
## Readiness Audit

### Audit Log

| Timestamp | Verdict | Summary |
|-----------|---------|---------|
| YYYY-MM-DD HH:MM TZ | NEEDS HUMAN INPUT | Brief summary of findings and what changed since last audit. |
| YYYY-MM-DD HH:MM TZ | READY FOR AUTONOMOUS EXECUTION | All pre-work resolved. |

### Verdict: [READY FOR AUTONOMOUS EXECUTION | NEEDS HUMAN INPUT | NOT READY]

[One sentence summary. If not ready, state what the human needs to do/decide/provide.]

### Input Data

| Input | Status | Notes |
|-------|--------|-------|
| ... | Ready / Missing / Insufficient / Unsafe | ... |

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| ... | Installed / Missing / Not declared / Not configured | ... |

### Open Questions

| # | Question | Blocking? | Notes |
|---|----------|-----------|-------|
| 1 | ... | Yes / No / Deferred | ... |

### POC Gaps

| # | Assumption | Suggested POC |
|---|-----------|---------------|
| 1 | ... | ... |

### Pre-Work

Ordered list of things to do before starting Phase 1:

1. ...
2. ...

### Blockers

[List hard blockers, or "None identified."]
```

### Step 4: Resolve Blocking Questions Interactively

If the audit found blocking or non-blocking open questions (from Step 2c), use `AskUserQuestion` to resolve them with the user right now, rather than just listing them in the plan file and stopping.

For each unresolved question:
1. Use `AskUserQuestion` with a clear question and concrete options (including your recommendation marked as default). Group related questions into a single ask when possible.
2. Record the user's answer in the Open Questions table with the resolution in the Notes column.
3. If the answer changes the plan (e.g., removes a phase, changes an approach), update the plan text and add a Revision Log entry.
4. Re-evaluate the verdict after all questions are resolved. If all blocking items are now resolved, upgrade to READY.

**Guidelines for good questions:**
- Lead with your recommendation: "Recommended: file-based polling. WebSocket adds complexity with minimal gain for v1."
- Provide 2-4 concrete options, not open-ended questions.
- Batch related decisions into one question when they're tightly coupled.
- Skip questions the agent can resolve on its own during execution (those are non-blocking by definition).

**When NOT to ask:**
- If there are zero blocking questions, skip this step entirely.
- If a previous audit already resolved the question (check Audit Log history), don't re-ask.
- Technical decisions the agent can make autonomously during execution (e.g., "should we use a Map or object here?") are not blocking.

### Step 5: Output Summary

After writing the audit to the plan file, output a brief summary to the user:
- The verdict (Ready / Ready with pre-work / Not ready)
- Count of issues found per category
- The top 2-3 items that need attention
- Whether `/execute-plan` can proceed now or what needs to happen first

## Key Principles

- **The goal is autonomous execution.** The audit exists to get a plan to the point where `/execute-plan` can run it without human intervention. Every issue surfaced should have a clear path to resolution: either the human does something (provides data, makes a decision, runs a POC) or the agent can handle it during execution.
- **Separate human work from agent work.** For every gap, be explicit: "The user needs to [decide/provide/review X]" vs "the agent can handle this during Phase N." The whole point is knowing what only a human can do.
- **Verify, don't trust.** The plan might say "the server exists." Check the file. The plan might say "test data is ready." Look at it.
- **Be concrete.** Don't say "data might be insufficient." Say "the plan needs 5 test messages but only 2 exist in source/test/fixtures/."
- **Keep it scannable.** Tables over paragraphs. Short notes over long explanations.
- **Pair with /execute-plan.** The audit section stays in the plan file. When `/execute-plan` reads the plan, it sees the audit and knows what pre-work was completed and what to expect.
