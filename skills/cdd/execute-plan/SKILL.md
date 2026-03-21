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

### 1b. Move Plan to Active on Main

Signal to other agents that this plan is taken:

```bash
git add workflow/plans/<plan>.md
git commit -m "chore: mark <plan> as active (execution started)"
```

Then move the file:

```bash
mv workflow/plans/<plan>.md workflow/plans/active/<plan>.md
```

Note: if the plan file isn't tracked yet, use `mv` instead of `git mv`.

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

Also read `CLAUDE.md` at the repo root for project conventions: language, test commands, code location, linting, etc.

If the plan doesn't have clear steps or acceptance criteria, stop and return: "This plan needs more detail before I can execute it. It's missing [X]."

### Step 2: Rename Branch

Rename the branch from the auto-generated worktree name to a human-readable name derived from the plan filename:

```bash
git branch -m $(git branch --show-current) <plan-name-without-extension>
```

### Step 3: Execute Phases

For each phase in the plan, in order:
1. Do the work (write code, edit files, create tests)
2. Run the project's test command (check CLAUDE.md for the command)
3. If tests fail, fix the issue before moving on
4. Run the project's linter if configured
5. Commit with a descriptive message after each phase

**Key rules during execution:**
- Follow the project's CLAUDE.md conventions
- Write tests for new code
- Don't over-engineer beyond what the plan specifies
- If blocked, stop and return with what you accomplished and what blocked you
- Commit after each phase or logical group (not one giant commit at the end)

### Step 4: Final Verification

After all phases complete, run the same checks CI will run. **Do NOT push until these pass.**

1. Run the full test suite. All tests must pass.
2. Run the project's linter if configured. Fix any remaining violations.
3. Commit any lint fixes.

**If tests or linting fail, fix them before proceeding.**

### Step 5: Update Specs

**Specs are the source of truth. If the code changed, the specs must match.**

Check the plan for any "Specs to Write" section and any existing specs that the work touched. For each:

1. If the plan says to write a new spec, write it.
2. If an existing spec describes behavior that changed, update it to match what was actually built.
3. Read each affected spec file in `specs/` and compare against the code. If they diverge, update the spec.

**Do NOT skip this step.** Stale specs are worse than no specs.

### Step 6: Archive the Plan

1. **Update acceptance criteria checkboxes** in the plan to reflect what was completed.

2. **Append an "Execution Notes" section** documenting what actually happened: assumptions made, deviations from the plan, gotchas encountered.

3. Move the plan to the archive:

```bash
git mv workflow/plans/active/<plan>.md workflow/plans/archived/<plan>.md
git commit -m "chore: archive <plan> with execution notes"
```

### Step 7: Push and Open PR

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

### Step 8: Report Results

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
