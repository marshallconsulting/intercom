---
name: execute-plan
description: Execute an implementation plan. Takes a plan from workflow/plans/, breaks it into tasks, executes them, tests, commits, pushes, and opens a PR. Use when the user says "/execute-plan", "execute the plan", or wants to run a plan autonomously.
args: "[path to plan file, e.g. workflow/plans/delivery-receipts.md]"
---

> **Requires CDD 2025.03.27.** This skill expects the repo to use Context-Driven Delivery folder structure (`workflow/proposals/`, `workflow/plans/`, `specs/`). See `CDD.md` at the repo root.

# /execute-plan - Execute an Implementation Plan

Take a plan from `workflow/plans/`, break it into tasks, execute them, test, commit, push, and open a PR.

## Usage

```
/execute-plan workflow/plans/delivery-receipts.md
/execute-plan workflow/plans/telegram-bridge.md
```

If no argument is provided, scan `workflow/plans/` for plans (excluding `active/` and `archived/`). If there's exactly one, proceed with it. If there are multiple, ask the user to pick. If there are none, tell the user.

---

## YOU ARE THE LAUNCHER, NOT THE EXECUTOR

**Do not execute the plan inline.** Your only job is to prepare main and launch a background agent. Do not create tasks, write code, or edit files beyond the steps below.

### Step A: Pick the Plan

Read the plan file. Verify:
- It has clear phases and acceptance criteria
- The readiness audit verdict is READY (if audited)

If the plan isn't ready, stop and tell the user.

### Step B: Commit Plan and Move to Active on Main

First, ensure the plan file is committed to main. Untracked plans cause `git mv` failures and also mean other agents can't see the plan in the repo. This commit also acts as a lock: once it's on main, other agents won't pick it up.

```bash
# Commit the plan (and its proposal, if not already tracked)
git add workflow/plans/<plan>.md workflow/proposals/accepted/
git commit -m "chore: add <plan> plan and accepted proposal"
```

If both files are already tracked, this will be a no-op. That's fine.

Then move to active:

```bash
mkdir -p workflow/plans/active
git mv workflow/plans/<plan>.md workflow/plans/active/<plan>.md
git commit -m "chore: mark <plan> as active (execution started)"
git push
```

The push is important: it makes the lock visible to agents in other repos or worktrees.

### Step C: Read the Playbook and Launch the Execution Agent

**Before launching**, read `playbook/` if it exists. The playbook contains coding conventions, size rules, and patterns that the execution agent MUST follow. You need to read it yourself so you can include its contents in the agent prompt. The agent runs in an isolated worktree and only knows what you tell it.

Use the Agent tool with **both** `isolation: "worktree"` and `run_in_background: true`. The agent prompt MUST include:
1. The plan path and phase details
2. Project context from CLAUDE.md (test commands, code location, etc.)
3. **The full playbook contents** (paste the rules verbatim, not just "read the playbook"). The agent cannot be trusted to read files it wasn't told about.
4. Any audit findings or context the agent needs
5. **Dev log instructions.** Tell the agent to write `execution.log` at its worktree root. Its first action must be writing the initial log entry.

```
Agent(
  prompt: "<plan details + CLAUDE.md context + PLAYBOOK CONTENTS + audit context + dev log instructions>",
  isolation: "worktree",
  run_in_background: true
)
```

**Why paste the playbook?** Agents frequently skip optional reads when they have enough context to start coding. Pasting the rules into the prompt makes them impossible to skip.

### Step D: Tell the User How to Monitor

After launching, find the worktree path the agent is running in:

```bash
# The newest worktree is the one we just spawned
ls -dt .claude/worktrees/*/
```

Tell the user: `tail -f .claude/worktrees/<agent-dir>/execution.log` to monitor.

Confirm the agent was launched and they're free to keep working. That's it. You're done.

**Why this matters:** Executing inline blocks the user's conversation for the entire duration. The worktree gives the agent its own branch and copy of the repo. Background mode frees the user immediately.

---

## Agent Instructions

Everything below this line is for the **spawned execution agent**, not the launcher. Copy the relevant parts into the agent's prompt.

---

### Step 1: Read the Plan and CLAUDE.md

Read the plan file. Extract:
- **Goal**: What we're building
- **Acceptance criteria**: How we know it's done
- **Phases / Steps**: The ordered list of work
- **Scope**: What's in and what's out
- **Dependencies**: What must exist first
- **Readiness Audit**: Check that the audit verdict is READY

Also read `CLAUDE.md` at the repo root for project conventions: language, test commands, code location, linting, etc. If a `playbook/` folder exists, read it before writing any code. The playbook contains patterns, anti-patterns, and guardrails specific to this project. Follow them during execution.

If the plan doesn't have clear steps or acceptance criteria, stop and return: "This plan needs more detail before I can execute it. It's missing [X]."

### Step 2: Start the Dev Log and Rename Branch

**The dev log is mandatory.** Your very first action must be to create the log file and write the first entry:

```bash
echo "[$(date '+%H:%M')] Agent started. Reading plan." >> execution.log
```

This file lives at the root of your worktree. The user is watching it via `tail -f`. You will append to it throughout the entire execution. **Every phase start, every decision, every test result, every commit gets a log line.** If the user runs `tail -f` and sees nothing, you have failed. See "Dev Log" section below for format and examples.

**Then rename the branch** from the auto-generated worktree name to a human-readable name derived from the plan filename:

```bash
# e.g., plan file "delivery-receipts.md" -> branch "delivery-receipts"
git branch -m $(git rev-parse --abbrev-ref HEAD) <plan-name-without-extension>
echo "[$(date '+%H:%M')] Branch renamed to <plan-name>" >> execution.log
```

The plan is already in `workflow/plans/active/` on main. The launcher moved it there before spawning you. Do NOT try to move it again.

### Step 3: Create Tasks

Use `TaskCreate` to create one task per discrete step from the plan. Each task should have:
- A clear, imperative subject
- A description with enough detail to execute without re-reading the plan
- An activeForm for the spinner

Set up dependencies with `addBlockedBy` if tasks must be sequential.

Show the task list briefly, then proceed immediately. Do NOT ask for confirmation. The plan was already approved when it was written.

### Step 4: Execute Tasks

For each task, in order:
1. Mark it `in_progress` with `TaskUpdate`
2. **Log to the dev log:** `echo "[$(date '+%H:%M')] Starting: <task description>" >> execution.log`
3. **Update execution status** (see Status Reporting below)
4. Do the work (write code, edit files, create tests)
5. **Log decisions:** if you make a non-obvious choice, log why
6. Run the project's test command (check CLAUDE.md for the command)
7. **Log test results:** `echo "[$(date '+%H:%M')] Tests: <count> pass, <count> fail" >> execution.log`
8. If tests fail, log the failure, fix the issue, log the fix
9. Mark it `completed` with `TaskUpdate`
10. **Update execution status** with new task count
11. Commit after each phase or logical group (not one giant commit at the end)
12. **Log the commit:** `echo "[$(date '+%H:%M')] Committed: <commit message summary>" >> execution.log`
13. Move to the next task

**Key rules during execution:**
- Follow the project's CLAUDE.md conventions
- Write tests for new code (TDD preferred)
- Don't over-engineer beyond what the plan specifies
- If blocked, stop and return with what you accomplished and what blocked you

### Step 5: Final Verification (MUST PASS BEFORE PUSHING)

After all tasks complete, run the same checks CI will run. **Do NOT push or open a PR until these pass.**

1. Run the full test suite. All tests must pass.
2. Run the project's linter with autofix if configured. Fix any remaining violations.
3. If the project has security scanners (brakeman, bundler-audit), run those too.
4. Commit any lint fixes.
5. Run `git diff main --stat` to review what changed.
6. Show the user a summary of what was built.

**If tests or linting fail, fix them before proceeding to Step 6.** A PR with failing CI wastes review time.

### Step 6: Update Specs

**Specs are the source of truth. If the code changed, the specs must match.**

Check the plan for any "Specs to Write" section and any existing specs that the work touched. For each:

1. If the plan says to write a new spec, write it.
2. If an existing spec describes behavior that changed, update it to match what was actually built.
3. Read each affected spec file in `specs/` and compare against the code. If they diverge, update the spec.

**Do NOT skip this step.** Stale specs are worse than no specs because they mislead future agents.

### Step 7: Archive the Plan

1. **Append an "Execution Notes" section** documenting what actually happened: assumptions made, deviations from the plan, gotchas encountered.

2. **Update acceptance criteria checkboxes** in the plan to reflect what was completed.

3. Move the plan to the archive:

```bash
git mv workflow/plans/active/<plan>.md workflow/plans/archived/<plan>.md
git commit -m "chore: archive <plan> with execution notes"
```

### Step 8: Push and Open PR

Push the branch and create a PR. This is the final step. The subagent owns the full lifecycle.

```bash
git push -u origin <branch-name>
gh pr create --title "<type>: <summary from plan goal>" --body "$(cat <<'EOF'
## Summary
<bullet points from the plan's goal and what was built>

## Test plan
<checklist of acceptance criteria, checked off>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Return the PR URL to the user.

### Step 9: Clean Up Worktree

After pushing and creating the PR, clean up the worktree so the branch isn't locked when the user tries to check it out.

```bash
REPO_ROOT=$(dirname "$(git rev-parse --git-common-dir)")
WORKTREE_PATH=$(pwd)

if [ "$REPO_ROOT" != "$WORKTREE_PATH" ]; then
  echo "[$(date '+%H:%M')] Cleaning up worktree. Done." >> execution.log
  cd "$REPO_ROOT"
  git worktree remove --force "$WORKTREE_PATH"
fi
```

**Why this matters:** If the worktree is left behind, `git checkout <branch>` from the main repo fails with "already checked out" errors. The user then has to manually clean up before they can test the PR branch. Always clean up after yourself.

### Step 10: Update Status Files (if applicable)

Update `_status.md` for any spec folders the plan touched. If no `_status.md` exists for an affected spec, create one.

### Step 11: Report Results

Return a summary to the caller:
- The **PR URL**
- What was built (files created/modified)
- Test results (pass count)
- Lint results
- Any deviations from the plan

---

## Error Handling

- **Tests fail**: The subagent should fix. If it can't after 2 attempts, it stops and reports back.
- **Plan is ambiguous**: The subagent stops and reports what's unclear.
- **Scope creep**: Note but don't do. Suggest a follow-up plan.
- **Dependencies missing**: Stop and report.
- **Push fails**: Report the error. The caller can retry or push manually.

## Plan Lifecycle

```
workflow/plans/plan.md           Ready. Audit can check it. Execute can pick it up.
       │
       ▼  (Part 1: caller moves to active)
workflow/plans/active/plan.md    In flight. Subagent working in worktree.
       │
       ▼  (Step 7: subagent archives with notes)
workflow/plans/archived/plan.md  Done. Decision record with execution notes.
       │
       ▼  (Step 8: subagent pushes and opens PR)
origin/<branch>                  PR open for review.
```

## Execution Notes (Lessons from Prior Runs)

- **Worktree is preferred.** Keeps main clean for other agents working in parallel.
- **Commit per phase**, not one giant commit. Makes the PR reviewable.
- **Move to active/ first.** This is the signal to other agents that the plan is being worked on.
- **Archive path** is `workflow/plans/archived/`, not `specs/archive/_plans/`.
- **Read CLAUDE.md** for project-specific commands. Don't assume test/lint commands.
- **Clean up the worktree** after pushing. If left behind, `git checkout <branch>` fails from the main repo with "already checked out" errors.
- **Paste the playbook** into the agent prompt. Don't rely on the agent reading it on its own.

## Project-Specific Reference

Common patterns by stack. Check CLAUDE.md for the actual commands.

| Task | TypeScript/Bun | Python | Node |
|------|---------------|--------|------|
| Run tests | `bun test` | `pytest -x -q` | `npm test` |
| Run linter | `bun run lint` (if configured) | `ruff check --fix && ruff format` | `npm run lint` |
| Install deps | `bun install` | `uv sync` or `pip install -e .` | `npm install` |
| Code location | `source/` | `src/` | `src/` |
| Test location | `source/test/` | `tests/` | `__tests__/` or `*.test.ts` |
| Config | `package.json` | `pyproject.toml` | `package.json` |

## Dev Log (MANDATORY)

**The dev log is not optional.** It is the user's only window into what you're doing. You initialize it in Step 2 and write to it throughout execution. If the user runs `tail -f` and sees nothing, you have failed.

The log file is `execution.log` at the root of your worktree. Every append is one bash command:

```bash
echo "[$(date '+%H:%M')] your message here" >> execution.log
```

**When to log (all of these, every time):**
- Starting a phase or task
- What you're thinking/deciding (especially non-obvious choices)
- Creating or modifying a file and why
- Test results (pass count, or failure details)
- Committing
- Anything that didn't go as planned
- Completion or failure

**Examples:**

```
[11:20] Starting Phase 1: Rewriting report-rate-limits.sh
[11:20] Removing jq parsing, writing raw stdin to inbox/<ts>_<session_id>.json
[11:21] Phase 2: Creating sessions migration
[11:21] Made repo_id nullable - unknown repos get nil, keeps things simple
[11:22] Using bigint for token columns - can exceed int max in long sessions
[11:22] Running db:migrate... clean
[11:23] Phase 3: Renaming RateLimitImportService -> UsageImportService
[11:24] Decision: deleting processed files rather than moving to processed/ - simpler, no disk growth
[11:25] Tests: 410 runs, 0 failures
[11:28] Lint: clean
[11:29] Phase 4: Replacing TokenTrackingService
[11:29] Summaries controller generate action now aggregates from Session records
[11:30] Tests: 2 failures in summaries_controller_test - fixing
[11:31] Fixed: test was creating TokenTrackingService expectations, switched to Session factory data
[11:32] Tests: 412 runs, 0 failures
```

**Keep it natural.** Write like a developer would in a work log. Short lines. No JSON, no structure to maintain. Just what you're doing, why, and what happened.

**Monitoring:** `tail -f .claude/worktrees/<agent-dir>/execution.log` from another terminal. The launcher tells the user the exact path.

## Status Reporting

The execute agent must write progress to `.claude/execution-status.json` at the **repo root** (not the worktree) so the `cdd-pulse-tui` can monitor it. This file is gitignored.

**When to update:** After each task starts, completes, or when the phase changes. Also update `thinking` when starting a new piece of work.

**How to update:** Write the JSON file using bash:

```bash
cat > /path/to/repo/.claude/execution-status.json << 'STATUSEOF'
{
  "plan": "agent-heartbeat",
  "status": "executing",
  "current_phase": "Phase 2: Online/Offline in list_agents",
  "current_task": "Add getAgentStatus helper",
  "tasks_done": 1,
  "tasks_total": 5,
  "thinking": "Adding heartbeat reader and status display",
  "last_message": "Tests passing after Phase 1",
  "recent_activity": [
    "Added heartbeat writer to pollInbox",
    "Tests: 7 pass, 0 fail"
  ],
  "last_update": "2026-03-21T18:30:00Z"
}
STATUSEOF
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `plan` | string | Plan filename without extension |
| `status` | string | `executing`, `testing`, `linting`, `pushing`, `done`, `failed` |
| `current_phase` | string | e.g., "Phase 2: Online/Offline in list_agents" |
| `current_task` | string | The task currently being worked on |
| `tasks_done` | int | Number of completed tasks |
| `tasks_total` | int | Total number of tasks |
| `thinking` | string | What the agent is currently reasoning about (1 line) |
| `last_message` | string | Last notable event (test results, commit, etc.) |
| `recent_activity` | array | Last 3-5 actions taken (file created, test run, etc.) |
| `last_update` | string | ISO timestamp |

**Important:** If running in a worktree, write to the **main repo root**, not the worktree directory. The repo root path is the parent of `.claude/worktrees/`. Use `git -C . rev-parse --show-superproject-working-tree` or hardcode based on the worktree path.

**On completion:** Set status to `done` with final task counts. On failure, set to `failed` with the error in `last_message`.

**Monitoring:** Run `cdd-pulse-tui` in another terminal to watch progress live.
