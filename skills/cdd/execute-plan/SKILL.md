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
/execute-plan -debug workflow/plans/delivery-receipts.md
```

If no argument is provided, list available plans in `workflow/plans/` (excluding `active/` and `archived/`) and ask the user to pick one.

## Flags

- **`-debug`** — Write the agent prompt file but do NOT launch the agent. Instead, tell the user the file path and ask them to review it. Wait for explicit approval before launching. This lets the user inspect and edit the prompt before the agent runs.

---

# Part 1: Launcher Instructions

**You are the launcher, not the executor.** Do not write code or edit project files. Your job: prepare main, build the agent prompt, launch the agent, and get out of the way.

## Step 1: Clean Up Stale Worktrees

Previous attempts may have left behind worktrees and orphan branches. Clean them up to avoid branch conflicts and "already checked out" errors.

1. Run `git worktree list`.
2. For each worktree beyond the main repo, check if an agent is actively using it:
   - Read `execution.log` in the worktree. If the last entry is recent (within the last few minutes), an agent is likely still running. **Leave it alone.**
   - If there's no `execution.log`, or the last entry is old, or it's a known failed attempt: it's stale. Remove it with `git worktree remove <path> --force`.
   - Ask the user if you're unsure.
3. Delete orphan branches: `git branch | grep 'worktree-agent-' | xargs git branch -D` (these are never renamed, so always stale).
4. Delete the target branch name if it exists from a failed prior run: `git branch -D <plan-branch-name> 2>/dev/null`.
5. Verify: `git worktree list` should show only main plus any actively running agents.

## Step 2: Pick the Plan and Move to Active

Read the plan file. Verify:
- It has clear phases and acceptance criteria
- The readiness audit verdict is READY (if audited)

If the plan isn't ready, stop and tell the user.

Ensure the plan is committed to main (untracked plans break `git mv` and are invisible to other agents):

```bash
git add workflow/plans/<plan>.md workflow/proposals/accepted/
git commit -m "chore: add <plan> plan and accepted proposal"
```

If both files are already tracked, this will be a no-op. That's fine.

Then move to active (skip if already there):

```bash
mkdir -p workflow/plans/active
git mv workflow/plans/<plan>.md workflow/plans/active/<plan>.md
git commit -m "chore: mark <plan> as active (execution started)"
git push
```

The push is important: it makes the lock visible to agents in other repos or worktrees.

## Step 3: Reset Working Directory (MANDATORY - DO NOT SKIP)

**BLOCKING STEP.** You MUST run this command and verify its output BEFORE Step 4. Do NOT proceed to the Agent launch until this step passes. This has caused failed launches multiple times.

The Agent tool creates worktrees relative to the current Bash working directory. If you've been running commands from `source/` or any subdirectory (e.g., `source/test`), the worktree ends up nested inside that subdirectory (e.g., `source/.claude/worktrees/` instead of `.claude/worktrees/`), which breaks the agent.

```bash
cd <repo-root> && pwd
```

**Verify:** The output MUST be the repo root (e.g., `/Users/doug/data/intercom`). If it shows a subdirectory like `.../source`, run `cd` again. Do NOT launch the agent until `pwd` shows the repo root.

## Step 4: Write the Agent Prompt File

**Before writing**, read `playbook/` if it exists. The agent runs in an isolated worktree and only knows what you put in the prompt file. Never tell the agent to "read the playbook" as an optional step. Paste it.

Write the prompt to `.claude/<plan-name>-agent-prompt.md`. Build it in blocks:

### Block 1: Project Context
- Repo path, tech stack, domain summary (from CLAUDE.md)
- Key constraints relevant to this plan

### Block 2: Agent Execution Rules
- Paste everything from **Part 2 below** (dev log rules, execution loop, setup, wrap-up). Paste it verbatim, don't summarize.

### Block 3: The Plan
- Full plan contents: goal, acceptance criteria, all phases with details
- Audit findings if the plan has a readiness audit section

### Block 4: Playbook
- Paste `playbook/*.md` contents verbatim. Agents skip optional reads, so this MUST be in the file.
- Include the code review sub-agent prompt and checklist if `playbook/code-review.md` exists

### Block 5: Reference Material
- Any external patterns the plan references
- Pointers to files the agent should read (e.g., `experiments/<name>/FINDINGS.md`)

The file should be self-contained. An agent reading only this file should have everything it needs to execute the plan without reading any other instructions.

## Step 5: Launch or Pause

### Default mode (no flags)

Launch the agent immediately after writing the prompt file:

```
Agent tool with:
  subagent_type: "general-purpose"
  isolation: "worktree"
  run_in_background: true
  prompt: |
    You are an execution agent. Your full instructions are in `.claude/<plan-name>-agent-prompt.md`.
    Read that file first, then execute the plan.
    Start your dev log immediately:
    echo "[$(date '+%H:%M')] Agent started in $(pwd). Reading prompt file." >> execution.log
```

The Agent tool call must be minimal. All the real content is in the prompt file.

**`subagent_type: "general-purpose"` is required.** Do not omit it.

**Why write to a file first?** Composing the prompt inline in the Agent tool call takes minutes and is a black box. Writing to `.claude/<plan-name>-agent-prompt.md` makes it transparent, reviewable, and the launch instant.

### Debug mode (`-debug` flag)

Do NOT launch the agent. Instead:

1. Tell the user the prompt file path
2. Show a brief summary of what's in it (block count, plan phases, playbook included)
3. Ask: "Review `.claude/<plan-name>-agent-prompt.md` and let me know when you're ready to launch."
4. Wait for the user to say go. They may edit the file first.
5. When approved, launch with the same minimal Agent call as default mode.

## Step 6: Tell the User How to Monitor

After launch (in either mode), find the actual worktree path and give the user the exact `tail -f` command:

```bash
find <repo-root> -maxdepth 4 -name "execution.log" -path "*worktree*" 2>/dev/null
```

Give the user the full absolute path. Do NOT use globs or assume the path. Example:

```
tail -f /Users/doug/data/intercom/.claude/worktrees/agent-abc12345/execution.log
```

Also remind them: `cdd-pulse-tui` in another terminal to watch progress as a structured TUI (reads `.claude/execution-status.json`).

Confirm the agent was launched and they're free to keep working.

## Step 7: Write Usage Report

When the background agent completes, write a usage summary to `.claude/plan_usage/<plan-name>.md`. Create the directory if needed.

**Pull the real numbers from the subagent JSONL transcripts, not from the Agent return message.** The Agent return surfaces a single "tokens" figure that is `cache_creation_input_tokens` only — it omits `cache_read_input_tokens`, which is billed at 10% of input rate but is the dominant component of long runs and routinely under-reports actual quota load by 50–100×.

The transcripts live at:

```
~/.claude/projects/<project-slug>/<parent-session-id>/subagents/agent-<id>.jsonl
```

`<project-slug>` is the cwd with `/` replaced by `-` (e.g. `-Users-doug-data-intercom`). `<parent-session-id>` is the session you (the launcher) are running in.

Run this snippet to compute correct per-agent totals. It dedupes by `message.id` because one assistant turn that emits N parallel `tool_use` blocks writes N duplicated `usage` records, and naively summing the column over-counts those turns by N:

```bash
python3 <<'PY' <subagents-dir>
import json, glob, os, sys
for f in sorted(glob.glob(sys.argv[1] + "/agent-*.jsonl")):
    seen = {}
    for line in open(f):
        try: d = json.loads(line)
        except: continue
        m = d.get("message",{}) or {}
        if m.get("role") != "assistant": continue
        mid, u = m.get("id"), m.get("usage")
        if mid and u and mid not in seen: seen[mid] = u
    g = lambda k: sum((u.get(k) or 0) for u in seen.values())
    inp, out = g("input_tokens"), g("output_tokens")
    cc, cr = g("cache_creation_input_tokens"), g("cache_read_input_tokens")
    meta = json.load(open(f.replace('.jsonl', '.meta.json'))) if os.path.exists(f.replace('.jsonl','.meta.json')) else {}
    desc = f"{meta.get('agentType','?')}: {meta.get('description','?')}"
    print(f"{os.path.basename(f).replace('.jsonl',''):<30} {desc[:50]:<50} turns={len(seen):>4} in={inp:>6} cc={cc:>8} cr={cr:>11} out={out:>6} total={inp+out+cc+cr:>11}")
PY
```

Write the artifact like this:

```markdown
# <plan-name>
**Executed:** <date and time>
**Duration:** <from execution.log first and last timestamps>
**Result:** <success or failure, PR link if created>

## Usage

| Agent | Turns | Input | Cache create | Cache read | Output | **Total** |
|-------|------:|------:|-------------:|-----------:|-------:|----------:|
| Execution agent      | <n> | <n> | <n> | <n> | <n> | <n> |
| Code review          | <n> | <n> | <n> | <n> | <n> | <n> |
| <other subagents>    | <n> | <n> | <n> | <n> | <n> | <n> |

**Total real tokens across all agents:** <sum>

> `cache_read` is the dominant component and is the right number to compare
> against the 5-hour usage window. `cache_creation` alone is misleading.
```

If the agent failed or you can't locate the JSONL, still write the file with what you have (date, duration, result, link to where the transcript should be).

---

# Part 2: Agent Instructions

**Everything below this line is for the execution agent.** The launcher pastes these into the agent's prompt.

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
echo "[$(date '+%H:%M')] Reading intercom.ts to understand pollInbox loop" >> execution.log
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
| Starting a phase | `Phase 2: Online/Offline status in list_agents` |
| Reading a file for context | `Reading intercom.ts to understand registry format` |
| Before editing a file | `Updating list_agents handler to read heartbeat timestamps` |
| After editing a file | `Added getAgentStatus helper that compares heartbeat to now()` |
| A design decision | `Decision: 30s offline threshold - matches the 2s poll interval times 15` |
| Something surprising | `Unexpected: heartbeat file already exists from prior version` |
| Running tests | `Running tests...` |
| Test results | `Tests: 7 pass, 0 fail` |
| Test failure | `FAIL: registry_test - heartbeat field missing from info.json` |
| Fixing a failure | `Fixed: writer was not flushing heartbeat on first registration` |
| Committing | `Committed: feat: add agent heartbeat for online/offline status` |

### Logging Density

The user watches execution in real-time via `tail -f execution.log`. Every Read, Edit, Write, and Bash call gets a log line BEFORE you do it. Decisions, surprises, and design choices get a log line AFTER. Target 10-15 log lines per phase. If a phase has fewer than 5, you're under-logging.

**Bad** (what we've seen agents actually produce):
```
[19:09] Agent started. Reading plan.
[19:09] Branch renamed to agent-heartbeat
[19:10] Phase 1: Heartbeat writer - starting
[19:11] Phase 1 complete. Heartbeat writer added. Tests pass. Committing.
```

**Good** (what we expect):
```
[19:09] Agent started. Reading plan.
[19:09] Branch renamed to agent-heartbeat
[19:10] Phase 1: Heartbeat writer
[19:10] Reading intercom.ts - pollInbox is the place to write heartbeat
[19:10] Adding writeHeartbeat() helper - touches ~/.claude/intercom/<id>/heartbeat
[19:10] Calling writeHeartbeat at top of every poll iteration
[19:11] Decision: also write on registration so new agents are immediately "online"
[19:11] Running tests... 7 pass, 0 fail
[19:12] Committed: feat: add heartbeat writer to pollInbox
```

## Setup

### Rename the Branch

```bash
git branch -m $(git rev-parse --abbrev-ref HEAD) <plan-name-without-extension>
echo "[$(date '+%H:%M')] Branch renamed to <plan-name>" >> execution.log
```

The plan is already in `workflow/plans/active/` on main. Do NOT try to move it again.

### Read the Plan

Read the plan file. Extract the goal, acceptance criteria, phases, scope, and audit verdict. If the plan doesn't have clear steps or acceptance criteria, stop and say what's missing.

Also read `CLAUDE.md` for project conventions and `playbook/` for coding rules (unless these were already pasted into your prompt by the launcher).

### Create Tasks

Use `TaskCreate` for each phase/step. Include enough detail to execute without re-reading the plan. Proceed immediately. Do NOT ask for confirmation.

## Execution Loop

For each task:

1. Mark `in_progress` with `TaskUpdate`
2. Log: `Starting: <description>`
3. **Update execution status** (see Status Reporting below)
4. Do the work. **Log before every Read, Edit, Write, and significant Bash call** (see Rule #1). This is mandatory, not aspirational.
5. Run the project's test command (log before and after)
6. Log test results (pass count, or failure details + fix)
7. **Commit gate: count your log lines for this phase. If fewer than 5, you skipped logging. Go back and retroactively log what you read, edited, and decided before committing.**
8. Mark `completed` with `TaskUpdate`
9. **Update execution status** with new task count
10. Commit (one commit per phase, not one giant commit at the end)
11. Log the commit message
12. Move to next task

**Rules:**
- Follow the project's CLAUDE.md conventions and playbook
- Write tests for new code
- Don't over-engineer beyond what the plan specifies
- If blocked, stop and ask the user rather than guessing

## Wrap-Up

### Final Verification

Run the same checks CI will run. **Do NOT push until these pass.**

1. Full test suite. All tests must pass.
2. Linter with autofix. Fix any remaining violations.
3. Commit lint fixes if any.
4. `git diff main --stat` to review scope.

### Agent Code Review

If `playbook/code-review.md` exists, spawn a review sub-agent before pushing. This is a qualitative review that catches logic errors, domain mistakes, and architectural issues that automated linting can't.

1. Spawn a sub-agent with this prompt:

   > You are a code review agent for the repo at [repo path]. Read `playbook/code-review.md` and any other playbook files for review criteria and project conventions. Use `git diff main` to see what changed on this branch, and read the actual source files to understand the full context (don't rely solely on the diff). Return findings in the format specified in code-review.md (numbered list with file:line, severity, and actionable fix). If everything looks good, return "LGTM - no issues found."

2. The sub-agent returns findings. Fix all **critical** and **important** issues. Fix **minor** issues if straightforward.
3. After fixes, re-run the linter and tests. Commit the fixes.
4. Save the review findings (both original and what was fixed) for inclusion in the archived plan.

**Do NOT skip this.** The review catches domain errors, missing edge cases, and logic bugs that tests and linters miss. If `playbook/code-review.md` doesn't exist, skip this step.

### Update Specs

Specs are the source of truth. If the code changed, specs must match. Check the plan's spec section and any existing specs the work touched. Update divergent specs.

**Do NOT skip this.** Stale specs mislead future agents.

### Archive the Plan

1. Append an **Execution Notes** section: assumptions, deviations, gotchas.
2. Append a **Review Findings** section with the review sub-agent's output and what was fixed:
   ```markdown
   ### Review Findings
   <N> findings: <X> critical, <Y> important, <Z> minor. All fixed.

   <paste the numbered findings here, with a note on each about how it was resolved>
   ```
3. Append an **Execution Stats** section with metadata about the run:
   ```markdown
   ### Execution Stats
   | Metric | Value |
   |--------|-------|
   | Duration | Xm Ys |
   | Input tokens | N |
   | Cache create tokens | N |
   | Cache read tokens | N |
   | Output tokens | N |
   | Total tokens | N |
   | Tool calls | N |
   | Commits | N |
   | Files changed | N |
   | Tests added | N |
   | PR | #NN |
   ```
   Get duration from the first and last execution.log timestamps. Get files changed from `git diff main --stat`. Get commits from `git log main..HEAD --oneline | wc -l`. Count test files you created/modified for tests added. **Report all four token components separately** — a single "tokens" number is misleading because `cache_read` is the dominant component on long runs and is invisible if you only quote the figure the Agent return surfaces (which is `cache_create`). The launcher's Step 7 has the full snippet for computing these from the JSONL transcript.
4. Update acceptance criteria checkboxes.
5. Move to archive:

```bash
git mv workflow/plans/active/<plan>.md workflow/plans/archived/<plan>.md
git commit -m "chore: archive <plan> with execution notes"
```

### Push and PR

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

Log the PR URL.

### Clean Up Worktree

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

### Update Status Files

Update `_status.md` for any spec folders the plan touched. If no `_status.md` exists for an affected spec, create one.

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
workflow/plans/<plan>.md          Ready for execution
       │
       ▼  (launcher moves to active)
workflow/plans/active/<plan>.md   In flight. Other agents: hands off.
       │
       ▼  (agent archives after execution)
workflow/plans/archived/<plan>.md Done. Has execution notes.
       │
       ▼  (agent pushes and opens PR)
origin/<branch>                   PR open for review.
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

**Important:** If running in a worktree, write to the **main repo root**, not the worktree directory. The repo root path is the parent of `.claude/worktrees/`.

**On completion:** Set status to `done` with final task counts. On failure, set to `failed` with the error in `last_message`.

**Monitoring:** Run `cdd-pulse-tui` in another terminal to watch progress live.

## Lessons from Prior Runs

- Worktree is preferred. Keeps main clean for parallel work.
- Commit per phase, not one giant commit.
- Move to active/ first. This signals other agents.
- Clean up the worktree after pushing. Left-behind worktrees break `git checkout`.
- Paste the playbook into the agent prompt. Agents skip optional reads.
- The dev log must be granular. Phase-boundary-only logging is useless.
- Agents consistently under-log despite examples. The "log before every tool call" hard rule was added because guidelines alone don't work. Enforce it.
- **Write the prompt to a file first, then launch with a minimal Agent call.** Composing the prompt inline in the Agent tool call takes minutes and is a black box. Writing to `.claude/<plan-name>-agent-prompt.md` makes it transparent, reviewable, and the launch instant. The `-debug` flag exists specifically to let the user inspect/edit before launch.
- **Read CLAUDE.md** for project-specific commands. Don't assume test/lint commands.
