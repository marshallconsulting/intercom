---
name: audit-plan
description: Audit a plan's readiness before execution. Checks sample data, dependencies, open questions, POC gaps, and blockers. Appends a Readiness Audit section to the plan file. Use when the user says "/audit-plan", "audit the plan", or wants to check if a plan is ready to execute.
args: "[path to plan file, e.g. workflow/plans/delivery-receipts.md]"
---

> **Requires CDD 2025.03.27.** This skill expects the repo to use Context-Driven Delivery folder structure (`workflow/proposals/`, `workflow/plans/`, `specs/`). See `CDD.md` at the repo root.

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
- The list of phases/steps
- Referenced files, specs, and dependencies mentioned in the plan

If the plan doesn't have clear phases or acceptance criteria, note that as a blocker and stop.

### Step 2: Launch Audit Subagent

Launch an **Explore** subagent in the background to perform the full audit investigation. The subagent does all file verification, dependency checks, and gap analysis, then returns structured results to you.

**Use `Agent` with `subagent_type: "Explore"` and `run_in_background: true`.** While the audit runs, tell the user it's running in the background.

Give the subagent a prompt that includes:
1. The full plan content (paste it into the prompt so the subagent has it)
2. Instructions to perform all six audit checks (2a-2f below)
3. Instructions to return structured results in a specific format

**Subagent audit checks to perform:**

#### 2a. Input Data
- Does sample/test data exist at expected paths?
- Is it synthetic and safe to commit?
- Is there enough of it?
- Are there answer keys / expected outputs?

#### 2b. Dependencies & Tools
- Are required libraries installed and declared?
- Are credentials configured? (check .env for keys, don't print values)
- Do prerequisite code artifacts exist with expected interfaces?

#### 2c. Open Questions
Collect unresolved decisions from the plan and gaps discovered during audit. Classify each as Blocking / Non-blocking / Deferred.

#### 2d. POC Gaps
What assumptions hasn't the plan validated? For each gap, suggest a concrete small POC that could verify it. The subagent should NOT run the experiments itself. Instead, return a structured list of suggested experiments with:
- What assumption needs validation
- A concrete experiment description (what to fetch, parse, or test)
- Why it matters (what changes in the plan if the assumption is wrong)
- Estimated effort (quick = under 5 min, medium = 5-30 min, needs-live-data = requires specific timing/conditions)

#### 2e. Blockers
Missing files, missing credentials, circular dependencies, references to nonexistent code/specs.

#### 2f. Spec Update Step

**This is critical. Stale specs are worse than no specs because they mislead future agents.**

Every plan must include a step that updates specs in `specs/` to reflect what was actually built. Check whether the plan includes this. List all spec files in `specs/` that the plan's changes would affect. If the plan is missing a spec update step, flag it as a required addition and note it in the Revision Log.

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
| # | Assumption | Experiment | Why It Matters | Effort |
...
(Effort: quick / medium / needs-live-data)

### Blockers
[list or "None identified"]

### Spec Update
[which specs need updating, whether the plan already covers this]

### Recommended Plan Changes
[any phases to add/modify, acceptance criteria to add, etc.]

### Verdict
[READY / NEEDS HUMAN INPUT / NOT READY] with one-sentence summary
```

### Step 2.5: Run Experiments to Resolve POC Gaps

After the audit subagent returns, review the POC Gaps section. If there are gaps that can be resolved with quick experiments (API calls, data inspection, dependency checks), propose them to the user before writing the audit.

**How to propose experiments:**

Present the user with a summary like:

> The audit found N assumptions that haven't been verified. I can run experiments to check them now:
>
> 1. **[Assumption]** - [What the experiment does, 1 sentence]. (~5 min)
> 2. **[Assumption]** - [What the experiment does, 1 sentence]. (~5 min)
> 3. **[Assumption]** - [What the experiment does, 1 sentence]. (needs live data, can't run now)
>
> Want me to run 1 and 2 now? #3 needs [specific condition] so we'd note it as pre-work.

**If the user says yes:**

Launch experiment subagents (general-purpose, NOT Explore) in parallel for each approved experiment. Give each subagent a complete prompt that includes:
- The assumption to test
- What to do (fetch, parse, check, etc.)
- The experiment folder path to use
- The project's experiment rules (below)

**Experiment folder structure and rules:**

Every experiment MUST live in `experiments/` at the project root. Each gets its own subfolder:

```
experiments/
  YYYY-MM-DD-descriptive-name/
    explore.ts (or explore.py, explore.sh, etc.)   # The experiment script
    raw/                                             # Cached API/HTTP responses
      response_1.json
      response_2.html
    FINDINGS.md                                      # What was tested, what was found
```

Rules for experiment subagents:
- **Folder:** `experiments/YYYY-MM-DD-short-description/` (e.g., `experiments/2026-04-04-check-channel-delivery/`)
- **Cache raw responses:** Every API call or HTTP fetch saves its raw response to `raw/` BEFORE parsing. Never re-fetch what's already cached. This lets us re-analyze without hitting endpoints again.
- **Sleep between requests:** Minimum 2 seconds between calls to the same host.
- **Stop on errors:** If an endpoint returns 429, 403, or 5xx, stop immediately. Log it and move on.
- **Write FINDINGS.md:** Summarize what was tested, what was found, and what it means for the plan. Include the key data points, not just "it worked."
- **Return structured results:** The subagent must return: assumption tested, result (confirmed/denied/partial), specific findings, and impact on the plan.
- **Check for project-specific experiment rules:** If the repo has experiment conventions in CLAUDE.md or a playbook (e.g., browser UA requirements, rate limit rules, caching conventions), follow those too.

**After experiments complete:**

1. Read each experiment's FINDINGS.md to confirm results.
2. Update the plan's POC Gaps table with results and a link to the experiment:
   ```
   | 1 | API returns expected fields | Confirmed. See `experiments/YYYY-MM-DD-name/FINDINGS.md` | quick |
   ```
3. If an experiment resolves a blocking question, update the Open Questions table too.
4. If findings change the plan approach (e.g., a dependency is missing, an API field doesn't exist), update the relevant plan phase and add a Revision Log entry explaining what changed and why, linking to the experiment:
   ```
   | YYYY-MM-DD | Phase N updated: [what changed]. See experiments/YYYY-MM-DD-name/FINDINGS.md |
   ```
5. Re-evaluate the verdict based on combined audit + experiment results.

**If the user says no or skip:**

Record the unverified assumptions in the POC Gaps table as "Not verified" and note them in Pre-Work.

**When NOT to propose experiments:**
- All POC gaps are trivially verifiable during execution (e.g., "does this method accept the right args?")
- All gaps require conditions that can't be met now (e.g., needs a live event, third-party system is down, needs production data)
- The Explore subagent already verified the assumption by reading code/data

### Step 3: Process Audit Results and Write the Readiness Audit

When the subagent returns (and any experiments complete), process all results. Apply any recommended plan changes (add missing phases, fix references, add acceptance criteria). Then write the audit to the plan file.

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
