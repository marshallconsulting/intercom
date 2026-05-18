---
name: execute-plan
description: Execute an implementation plan. Takes a plan from workflow/plans/, breaks it into tasks, executes them, tests, commits, pushes, and opens a PR. Use when the user says "/execute-plan", "execute the plan", or wants to run a plan autonomously.
args: "[-debug] [path to plan file, e.g. workflow/plans/delivery-receipts.md]"
---

> **Requires CDD 2025.03.27.** This skill expects the repo to use Context-Driven Delivery folder structure (`workflow/proposals/`, `workflow/plans/`, `specs/`). See `CDD.md` at the repo root.

# /execute-plan - Execute an Implementation Plan

Take a plan from `workflow/plans/`, break it into tasks, execute them, test, commit, push, and open a PR.

## Usage

```
/execute-plan workflow/plans/delivery-receipts.md
/execute-plan workflow/plans/telegram-bridge.md
/execute-plan workflow/plans/active/buyer-signals.md
/execute-plan -debug workflow/plans/delivery-receipts.md
```

If no argument is provided, scan `workflow/plans/` for plans (excluding `active/` and `archived/`). If there's exactly one, proceed with it. If there are multiple, ask the user to pick. If there are none, tell the user.

## Flags

- **`-debug`** — Write the agent prompt file but do NOT launch the agent. Instead, tell the user the file path and stop. Wait for the user to invoke `/execute-plan` again without `-debug` once they've reviewed/edited the prompt. This lets the user inspect and edit the prompt before the agent runs.

---

# Part 1: Launcher Instructions

**You are the launcher, not the executor.** Do not execute the plan inline, write code, or edit project files. Your only job is to prepare main, build the agent prompt, launch the background agent, and get out of the way.

### Step A: Pick the Plan

Read the plan file. Verify:
- It has clear phases and acceptance criteria
- The readiness audit verdict is READY (if audited)

If the plan isn't ready, stop and tell the user.

### Step B: Clean Up Stale Worktrees

Previous attempts may have left behind worktrees and orphan branches. Clean them up to avoid branch conflicts and "already checked out" errors.

1. Run `git worktree list`.
2. For each worktree beyond the main repo, check if an agent is actively using it:
   - Read `execution.log` in the worktree. If the last entry is recent (within the last few minutes), an agent is likely still running. **Leave it alone.**
   - If there's no `execution.log`, or the last entry is old, or it's a known failed attempt: it's stale. Remove it with `git worktree remove <path> --force`.
   - Ask the user if you're unsure.
3. Delete orphan branches: `git branch | grep 'worktree-agent-' | xargs git branch -D` (these are never renamed, so always stale).
4. Delete the target branch name if it exists from a failed prior run: `git branch -D <plan-branch-name> 2>/dev/null`.
5. Verify: `git worktree list` should show only main plus any actively running agents.

### Step C: Commit Plan and Move to Active on Main

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

### Step D: Reset Working Directory (MANDATORY - DO NOT SKIP)

**BLOCKING STEP.** You MUST run this command and verify its output BEFORE Step E. Do NOT proceed to the Agent launch until this step passes. This has caused failed launches multiple times.

The Agent tool creates worktrees relative to the current Bash working directory. If you've been running commands from `source/` or any subdirectory (e.g., `bin/test`, `bin/lint`), the worktree ends up nested inside that subdirectory (e.g., `source/.claude/worktrees/` instead of `.claude/worktrees/`), which breaks the agent.

```bash
cd <repo-root> && pwd
```

**Verify:** The output MUST be the repo root (e.g., `/Users/doug/data/marshallconsulting/intercom`). If it shows a subdirectory like `.../source`, run `cd` again. Do NOT launch the agent until `pwd` shows the repo root.

### Step E: Write the Agent Prompt File

**Before writing**, read `playbook/` if it exists. The agent runs in an isolated worktree and only knows what you put in the prompt file. Never tell the agent to "read the playbook" as an optional step. Paste it.

Write the prompt to `workflow/plans/artifacts/<plan-name>-agent-prompt.md`. Build it in blocks. (Create the `workflow/plans/artifacts/` directory if it doesn't exist. The directory should be gitignored by the project — these are launcher-written runtime artifacts, not shared docs.)

#### Block 1: Project Context
- Repo path, tech stack, domain summary (from CLAUDE.md)
- Test commands, code location, linting
- Key constraints relevant to this plan

#### Block 2: Agent Execution Rules
- Paste everything from **Part 2 below** (dev log rules, execution loop, setup, wrap-up). Paste it verbatim, don't summarize.

#### Block 3: The Plan
- Full plan contents: goal, acceptance criteria, all phases with details
- Audit findings if the plan has a readiness audit section

#### Block 4: Playbook
- Paste `playbook/*.md` contents verbatim. Agents skip optional reads, so this MUST be in the file.
- Include the code review sub-agent prompt and checklist if `playbook/code-review.md` exists

#### Block 5: Reference Material
- Any external patterns the plan references
- Pointers to files the agent should read (e.g., `experiments/<sketch>.ts`)

The file should be self-contained. An agent reading only this file should have everything it needs to execute the plan without reading any other instructions.

**Why write a file instead of composing inline?** Composing the prompt inline in the Agent tool call takes minutes and is a black box. Writing to a file makes it transparent, reviewable, and the launch instant. The `-debug` flag exists specifically to let the user inspect/edit before launch.

### Step F: Launch or Pause

#### Default mode (no flags)

Launch the agent immediately after writing the prompt file. Use the Agent tool with **both** `isolation: "worktree"` and `run_in_background: true`. The Agent call must be minimal — all the real content is in the prompt file.

```
Agent tool with:
  isolation: "worktree"
  run_in_background: true
  prompt: |
    You are an execution agent. Your full instructions are in
    `workflow/plans/artifacts/<plan-name>-agent-prompt.md`.
    Read that file first, then execute the plan.
    Start your dev log immediately:
    echo "[$(date '+%H:%M')] Agent started in $(pwd). Reading prompt file." >> execution.log
```

**Default mode: just launch.** Never summarize the prompt, never ask the user to review it, never pause. The prompt is already figured out when the plan is figured out.

**Why this matters:** Executing inline blocks the user's conversation for the entire duration. The worktree gives the agent its own branch and copy of the repo. Background mode frees the user immediately.

#### Debug mode (`-debug` flag)

Do NOT launch the agent. Write the prompt file and stop; tell the user the file path so they can inspect or edit it. **Do not offer a review summary. Do not ask anything.** If the user wants to launch after editing, they will invoke `/execute-plan` again without `-debug`. That's it.

### Step G: Tell the User How to Monitor

After launch, find the actual worktree path and give the user the exact `tail -f` command:

```bash
find <repo-root> -maxdepth 4 -name "execution.log" -path "*worktree*" 2>/dev/null
```

Give the user the full absolute path. Do NOT use globs or assume the path. Example:

```
tail -f /Users/doug/data/marshallconsulting/intercom/.claude/worktrees/agent-abc12345/execution.log
```

Confirm the agent was launched and they're free to keep working. That's it. You're done.

### Step H: Write Usage Report (after agent completes)

When the background agent completes, write a usage summary to `workflow/plans/artifacts/<plan-name>-usage.md`. (Same gitignored runtime-artifact location as the prompt file.)

The agent result message includes token counts and cost data from the session. Write whatever usage data is available from the return message:

```markdown
# <plan-name>
**Executed:** <date and time>
**Duration:** <from execution.log first and last timestamps>
**Result:** <success or failure, PR number if created>

## Usage
<token counts, cost, cache stats, or whatever is visible from the agent result>
```

This is a best-effort capture. Don't query external systems. Just write what you can see from the agent's return. If the agent failed or returned no usage data, still write the file with what you have (date, duration, result).

---

# Part 2: Agent Instructions

**Everything below this line is for the spawned execution agent.** The launcher pastes these into the agent's prompt file.

---

## Rule #1: The Dev Log

The dev log is not a nice-to-have. It is the user's only window into what you're doing. They are watching `tail -f execution.log` in another terminal. If the log is sparse, they can't tell whether you're working, stuck, or making bad decisions.

**Your very first action** must be:

```bash
echo "[$(date '+%H:%M')] Agent started in $(pwd). Reading plan." >> execution.log
```

Then log continuously throughout execution using:

```bash
echo "[$(date '+%H:%M')] your message here" >> execution.log
```

### Hard Rule: Log Before Every Action

**You MUST write a log line before every Read, Edit, Write, or significant Bash call.** This is not optional. The log is the user's only real-time view of your work. If you read a file without logging, you are invisible. If you edit a file without logging, you are untrusted.

Pattern:
```bash
echo "[$(date '+%H:%M')] Reading intercom.ts to understand poll loop" >> execution.log
# then do the Read

echo "[$(date '+%H:%M')] Adding heartbeat writer to pollInbox" >> execution.log
# then do the Edit

echo "[$(date '+%H:%M')] Running tests..." >> execution.log
# then run tests

echo "[$(date '+%H:%M')] Tests: 7 pass, 0 fail" >> execution.log
```

**Log after edits too** when the result is worth noting (design decisions, surprises, what you chose and why).

### What to Log

Log at the granularity of **individual actions**, not phase boundaries:

| Moment | Example |
|--------|---------|
| Starting a phase | `Phase 2: Online/Offline in list_agents` |
| Reading a file for context | `Reading intercom.ts to understand pollInbox` |
| Before editing a file | `Updating intercom.ts - adding getAgentStatus helper` |
| After editing a file | `Added heartbeat reader; status display now considers staleness > 30s` |
| A design decision | `Decision: keeping JSON registry for now, agent-status.json is a separate file` |
| Something surprising | `Unexpected: heartbeat was already being written by another path` |
| Running tests | `Running tests...` |
| Test results | `Tests: 7 pass, 0 fail` |
| Test failure | `FAIL: list_agents_test - missing status field` |
| Fixing a failure | `Fixed: status field defaulted to "online"` |
| Committing | `Committed: feat: add agent heartbeat and online/offline status` |

### Logging Density

The user watches execution in real-time via `tail -f execution.log`. Every Read, Edit, Write, and Bash call gets a log line BEFORE you do it. Decisions, surprises, and design choices get a log line AFTER. Target 10-15 log lines per phase. If a phase has fewer than 5, you're under-logging.

**Bad** (under-logging):
```
[19:09] Agent started. Reading plan.
[19:09] Branch renamed to agent-heartbeat
[19:10] Phase 1: Heartbeat writer - starting
[19:11] Phase 1 complete. Tests pass. Committing.
```

**Good** (what we expect):
```
[19:09] Agent started. Reading plan.
[19:09] Branch renamed to agent-heartbeat
[19:10] Phase 1: Heartbeat writer
[19:10] Reading intercom.ts - pollInbox runs every 2s, hook in there
[19:10] Adding heartbeat write to pollInbox - writes ~/.claude/intercom/<id>/heartbeat.json
[19:10] Decision: ISO timestamp string, not epoch ms (matches other registry files)
[19:11] Running tests... 7 pass, 0 fail
[19:12] Committed: feat: write per-agent heartbeat on each poll
```

## Setup

### Rename the Branch

```bash
git branch -m $(git rev-parse --abbrev-ref HEAD) <plan-name-without-extension>
echo "[$(date '+%H:%M')] Branch renamed to <plan-name>" >> execution.log
```

The plan is already in `workflow/plans/active/` on main. The launcher moved it there before spawning you. Do NOT try to move it again.

### Read the Plan

Read the plan file. Extract the goal, acceptance criteria, phases, scope, and audit verdict. If the plan doesn't have clear steps or acceptance criteria, stop and say what's missing.

Also read `CLAUDE.md` for project conventions and `playbook/` for coding rules (unless these were already pasted into your prompt by the launcher).

### Create Tasks

Use `TaskCreate` to create one task per discrete step from the plan. Each task should have:
- A clear, imperative subject
- A description with enough detail to execute without re-reading the plan
- An activeForm for the spinner

Set up dependencies with `addBlockedBy` if tasks must be sequential.

Show the task list briefly, then proceed immediately. Do NOT ask for confirmation. The plan was already approved when it was written.

## Execution Loop

For each task, in order:

1. Mark it `in_progress` with `TaskUpdate`
2. Log: `Starting: <description>`
3. **Update execution status** (see Status Reporting below)
4. Do the work. **Log before every Read, Edit, Write, and significant Bash call** (see Rule #1). This is mandatory, not aspirational.
5. Run the project's test command (log before and after; check CLAUDE.md for the command)
6. Log test results (pass count, or failure details + fix)
7. If tests fail, fix the issue before moving on
8. **Commit gate: count your log lines for this phase. If fewer than 5, you skipped logging. Go back and retroactively log what you read, edited, and decided before committing.**
9. Mark `completed` with `TaskUpdate`
10. **Update execution status** with new task count
11. Commit after each phase or logical group (not one giant commit at the end)
12. Log the commit message
13. Move to next task

**Rules during execution:**
- Follow the project's CLAUDE.md conventions and playbook
- Write tests for new code (TDD preferred)
- Don't over-engineer beyond what the plan specifies
- If blocked, stop and ask the user rather than guessing

## Wrap-Up

### Final Verification (MUST PASS BEFORE PUSHING)

Run the same checks CI will run. **Do NOT push or open a PR until these pass.**

1. Run the full test suite. All tests must pass.
2. Run the project's linter with autofix if configured. Fix any remaining violations.
3. If the project has security scanners (brakeman, bundler-audit), run those too.
4. Commit any lint fixes.
5. Run `git diff main --stat` to review what changed.
6. Show the user a summary of what was built.

**If tests or linting fail, fix them before proceeding.** A PR with failing CI wastes review time.

### Agent Code Review

If `playbook/code-review.md` exists, spawn a review sub-agent before pushing. This is a qualitative review that catches logic errors, domain mistakes, and architectural issues that automated linting can't.

1. Spawn a sub-agent with this prompt:

   > You are a code review agent for the repo at [repo path]. Read `playbook/code-review.md` and any other relevant playbook files for review criteria and project conventions. Use `git diff main` to see what changed on this branch, and read the actual source files to understand the full context (don't rely solely on the diff). Return findings in the format specified in code-review.md (numbered list with file:line, severity, and actionable fix). If everything looks good, return "LGTM - no issues found."

2. The sub-agent returns findings. Fix all **critical** and **important** issues. Fix **minor** issues if straightforward.
3. After fixes, re-run lint and tests. Commit the fixes.
4. Save the review findings (both original and what was fixed) for inclusion in the archived plan.

**Do NOT skip this.** The review catches domain errors, missing edge cases, and logic bugs that tests and linters miss. If `playbook/code-review.md` doesn't exist, skip this step.

### Update Specs

**Specs are the source of truth. If the code changed, the specs must match.**

Check the plan for any "Specs to Write" section and any existing specs that the work touched. For each:

1. If the plan says to write a new spec, write it.
2. If an existing spec describes behavior that changed, update it to match what was actually built.
3. Read each affected spec file in `specs/` and compare against the code. If they diverge, update the spec.

**Do NOT skip this step.** Stale specs are worse than no specs because they mislead future agents.

### Archive the Plan

1. **Append an "Execution Notes" section** documenting what actually happened: assumptions made, deviations from the plan, gotchas encountered.

2. **Append a "Review Findings" section** with the review sub-agent's output and what was fixed:
   ```markdown
   ### Review Findings
   <N> findings: <X> critical, <Y> important, <Z> minor. All fixed.

   <paste the numbered findings here, with a note on each about how it was resolved>
   ```

3. **Append an "Execution Stats" section** with metadata about the run:
   ```markdown
   ### Execution Stats
   | Metric | Value |
   |--------|-------|
   | Duration | Xm Ys |
   | Tokens | N |
   | Tool calls | N |
   | Commits | N |
   | Files changed | N |
   | Tests added | N |
   | PR | #NN |
   ```
   Get duration from the first and last execution.log timestamps. Get files changed from `git diff main --stat`. Get commits from `git log main..HEAD --oneline | wc -l`. Count test files you created/modified for tests added.

4. **Update acceptance criteria checkboxes** in the plan to reflect what was completed.

5. Move the plan to the archive:

```bash
git mv workflow/plans/active/<plan>.md workflow/plans/archived/<plan>.md
git commit -m "chore: archive <plan> with execution notes"
```

### Push and Open PR

Push the branch and create a PR. This is the final step. The subagent owns the full lifecycle.

```bash
git push -u origin <branch-name>
gh pr create --title "<type>: <summary from plan goal>" --body "$(cat <<'EOF'
## Context
<2-3 sentences from the proposal's Problem section explaining what problem this solves
and why it matters. Plain English, no code. Someone jumping between 6 repos should
immediately know why this PR exists without reading the diff.>

## Summary
<technical bullet points of what was built and what changed>

## Test plan
<checklist of acceptance criteria, checked off>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Log and return the PR URL.

### Clean Up Worktree

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

### Update Status Files (if applicable)

Update `_status.md` for any spec folders the plan touched. If no `_status.md` exists for an affected spec, create one.

### Report Results

Return a summary to the caller:
- The **PR URL**
- What was built (files created/modified)
- Test results (pass count)
- Lint results
- Any deviations from the plan

---

# Part 3: Reference

## Error Handling

- **Tests fail**: Fix it. If you can't after 2 attempts, stop and ask the user.
- **Plan is ambiguous**: Stop and ask before writing code.
- **Scope creep**: Note it, don't do it. Suggest a follow-up plan.
- **Dependencies missing**: Stop and tell the user.
- **Push fails**: Report the error. The caller can retry or push manually.

## Plan Lifecycle

```
workflow/plans/plan.md           Ready. Audit can check it. Execute can pick it up.
       │
       ▼  (launcher commits and moves to active)
workflow/plans/active/plan.md    In flight. Subagent working in worktree.
       │
       ▼  (subagent archives with notes)
workflow/plans/archived/plan.md  Done. Decision record with execution notes.
       │
       ▼  (subagent pushes and opens PR)
origin/<branch>                  PR open for review.
```

## Lessons from Prior Runs

- **Worktree is preferred.** Keeps main clean for other agents working in parallel.
- **Commit per phase**, not one giant commit. Makes the PR reviewable.
- **Move to active/ first.** This is the signal to other agents that the plan is being worked on.
- **Archive path** is `workflow/plans/archived/`, not `specs/archive/_plans/`.
- **Read CLAUDE.md** for project-specific commands. Don't assume test/lint commands.
- **Clean up the worktree** after pushing. If left behind, `git checkout <branch>` fails from the main repo with "already checked out" errors.
- **Paste the playbook** into the agent prompt. Don't rely on the agent reading it on its own.
- **The dev log must be granular.** Phase-boundary-only logging is useless. Agents consistently under-log despite examples; the "log before every tool call" hard rule was added because guidelines alone don't work. Enforce it.
- **Write the prompt to a file first, then launch with a minimal Agent call.** Composing the prompt inline in the Agent tool call takes minutes and is a black box. Writing to `workflow/plans/artifacts/<plan-name>-agent-prompt.md` (gitignored) makes it transparent, reviewable, and the launch instant. The `-debug` flag exists specifically to let the user inspect/edit before launch. Prior versions of this skill wrote prompts to `.claude/` — that triggered per-file approval prompts in many setups, so artifacts moved to `workflow/plans/artifacts/`.

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

**Monitoring:** Run `cdd-pulse-tui` in another terminal to watch progress live, or `tail -f execution.log` in the worktree for the granular dev log.
