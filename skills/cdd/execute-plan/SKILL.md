---
name: execute-plan
description: Execute an implementation plan. Takes a plan from workflow/plans/, breaks it into tasks, executes them, tests, commits, pushes, and opens a PR. Use when the user says "/execute-plan", "execute the plan", or wants to run a plan autonomously.
args: "[path to plan file, e.g. workflow/plans/delivery-receipts.md]"
---

> **Requires CDD v1.** This skill expects the repo to use Context-Driven Development folder structure (`workflow/proposals/`, `workflow/plans/`, `specs/`). See `CDD.md` at the repo root.

# /execute-plan - Execute an Implementation Plan

Take a plan from `workflow/plans/`, break it into tasks, execute them, test, commit, push, and open a PR.

## Usage

```
/execute-plan workflow/plans/delivery-receipts.md
/execute-plan workflow/plans/telegram-bridge.md
```

If no argument is provided, scan `workflow/plans/` for plans (excluding `active/` and `archived/`). If there's exactly one, proceed with it. If there are multiple, ask the user to pick. If there are none, tell the user.

---

## Part 1: What YOU Do (the caller)

**You are the orchestrator.** You do NOT execute the plan yourself. You prepare the repo, then spawn a subagent to do the work in isolation. The subagent handles everything end-to-end: implementation, testing, push, and PR.

### 1a. Pick the Plan

Read the plan file. Verify:
- It has clear phases and acceptance criteria
- The readiness audit verdict is READY (if audited)

If the plan isn't ready, stop and tell the user.

### 1b. Commit Plan and Move to Active on Main

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

### 1c. Launch the Execute Agent

Spawn a subagent with **both** `isolation: "worktree"` **and** `run_in_background: true`. This gives the agent its own copy of the repo and frees the main conversation so the user can keep working.

```
Agent tool call:
  isolation: "worktree"
  run_in_background: true
  prompt: <the full execution instructions from Part 2 below, with plan details filled in>
```

**You MUST set `run_in_background: true`.** The whole point of worktree execution is that it runs independently. If you run it in the foreground, you block the user's conversation for the entire execution.

**Include in the prompt:**
- The plan path: `workflow/plans/active/<plan>.md`
- A reminder to read CLAUDE.md for project conventions
- All the instructions from Part 2 below

You will be notified when the agent completes. Relay the PR URL and results to the user.

### 1d. After the Agent Completes

When notified that the agent finished:
1. Relay the PR URL and summary to the user
2. Clean up any leftover local branches from the worktree (the worktree directory is cleaned up automatically, but the local branch may linger):

```bash
git branch -D <branch-name>  # safe — the work is on origin now
```

---

## Part 2: What the SUBAGENT Does (in the worktree)

Everything below is for the execute agent running in the worktree. Copy these instructions into the agent prompt.

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

### Step 2: Rename Branch

Rename the branch from the auto-generated worktree name to a human-readable name derived from the plan filename:

```bash
git branch -m $(git branch --show-current) <plan-name-without-extension>
```

### Step 3: Create Tasks

Use `TaskCreate` to create one task per phase from the plan. Each task should have:
- A clear, imperative subject
- A description with enough detail to execute without re-reading the plan

Set up dependencies with `addBlockedBy` if tasks must be sequential.

Show the task list briefly, then proceed immediately. Do NOT ask for confirmation. The plan was already approved when it was written.

### Step 4: Execute Tasks

For each task, in order:
1. Mark it `in_progress` with `TaskUpdate`
2. **Update execution status** (see Status Reporting below)
3. Do the work (write code, edit files, create tests)
4. Run the project's test command (check CLAUDE.md for the command)
5. If tests fail, fix the issue before moving on
6. Mark it `completed` with `TaskUpdate`
7. **Update execution status** with new task count
8. Commit after each phase or logical group (not one giant commit at the end)

**Key rules during execution:**
- Follow the project's CLAUDE.md conventions
- Write tests for new code
- Don't over-engineer beyond what the plan specifies
- If blocked, stop and return with what you accomplished and what blocked you

### Step 5: Final Verification

After all tasks complete, run the same checks CI will run. **Do NOT push until these pass.**

1. Run the full test suite. All tests must pass.
2. Run the project's linter with autofix if configured. Fix any remaining violations.
3. Commit any lint fixes.
4. Run `git diff main --stat` to review what changed.
5. Show the user a summary of what was built.

**If tests or linting fail, fix them before proceeding.**

### Step 6: Update Specs

**Specs are the source of truth. If the code changed, the specs must match.**

Check the plan for any "Specs to Write" section and any existing specs that the work touched. For each:

1. If the plan says to write a new spec, write it.
2. If an existing spec describes behavior that changed, update it to match what was actually built.
3. Read each affected spec file in `specs/` and compare against the code. If they diverge, update the spec.

**Do NOT skip this step.** Stale specs are worse than no specs.

### Step 7: Archive the Plan

1. **Update acceptance criteria checkboxes** in the plan to reflect what was completed.

2. **Append an "Execution Notes" section** documenting what actually happened: assumptions made, deviations from the plan, gotchas encountered.

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

### Step 9: Report Results

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
       ▼  (Step 6: subagent archives with notes)
workflow/plans/archived/plan.md  Done. Decision record with execution notes.
       │
       ▼  (Step 7: subagent pushes and opens PR)
origin/<branch>                  PR open for review.
```

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
