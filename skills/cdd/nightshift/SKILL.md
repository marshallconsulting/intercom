---
name: nightshift
description: Execute all queued plans sequentially overnight using stacked PRs. Picks up plans from workflow/plans/, executes each one in a worktree, runs tests, opens PRs stacked on each other, and moves to the next. Skips stuck plans with notes. Use when the user says "/nightshift", "execute all plans", "run overnight", or wants batch plan execution.
---

> **Requires CDD 2025.03.27.** This skill expects the repo to use Context-Driven Delivery folder structure (`workflow/proposals/`, `workflow/plans/`, `specs/`). See `CDD.md` at the repo root.
  
# /nightshift - Overnight Batch Plan Execution

Execute all queued plans sequentially, producing stacked PRs for morning review.

## The Idea

Spend the day writing proposals, accepting plans, and auditing them. Before bed, run `/nightshift`. The agent picks up every ready plan and executes them in order, each branching off the previous one. By morning there's a stack of PRs to review and merge in order.

Inspired by [Jamon Holmgren's Night Shift workflow](https://x.com/jamonholmgren/status/2032885424209932711): human time is the constrained resource, agent tokens are cheap. Structure your day around decisions, let agents handle execution overnight.

## Usage

```
/nightshift
/nightshift --dry-run
```

`--dry-run` lists the plans that would be executed, in order, without executing them.

## Instructions

### Step 1: Discover Plans

Find all ready plans:

```bash
ls workflow/plans/*.md
```

Exclude `active/`, `archived/`, `done/`, and any README files. These are the plans to execute.

If no plans are found, tell the user: "No plans queued. Nothing to do."

### Step 2: Order the Plans

Read each plan file and check for:
- **Explicit ordering**: Plans may reference other plans as dependencies ("requires dashboard-v2 to be done first")
- **Readiness audit**: Plans with a "READY FOR AUTONOMOUS EXECUTION" verdict go first. Plans with "NEEDS HUMAN INPUT" are skipped with a note.

If no explicit ordering, execute alphabetically by filename. Show the execution order to the user.

### Step 3: Confirm

Show the execution queue:

```
Nightshift queue (3 plans):
  1. spec-overhaul.md (READY)
  2. time-charts-v2.md (READY)
  3. mobile-responsive.md (READY)

Skipping:
  - api-endpoints.md (NEEDS HUMAN INPUT: blocking question about auth)

Execute all 3 plans sequentially as stacked PRs? (yes / no)
```

Wait for confirmation. This is the last human checkpoint before autonomous execution.

### Step 4: Execute Plans Sequentially

Track the current base branch. It starts as `main` and changes as each plan creates a new branch.

```
current_base = "main"
```

For each plan, in order:

#### 4a. Pre-flight

1. Check out the current base branch and make sure it's clean:
   ```bash
   git checkout <current_base>
   git pull  # only if current_base is main
   git status  # must be clean
   ```

2. If the previous plan's branch touched `db/migrate/`, run migrations on the current base before proceeding. Check `CLAUDE.md` for project-specific database commands. Skip for the first plan.

#### 4b. Move plan to active

On the current base branch, signal that this plan is in flight:

```bash
git mv workflow/plans/<plan>.md workflow/plans/active/<plan>.md
git commit -m "chore: mark <plan> as active (nightshift execution)"
git push
```

#### 4c. Launch execute agent

Spawn a subagent with `isolation: "worktree"` to execute the plan:

```
Agent(
  subagent_type: "general-purpose",
  isolation: "worktree",
  prompt: "Execute the plan at workflow/plans/active/<plan>.md using the /execute-plan skill. Follow all instructions in the skill. The plan has already been moved to active/. Do NOT ask the user any questions - make reasonable decisions autonomously. If you encounter a blocker you truly cannot resolve after 2 attempts, stop and return a summary of what you accomplished and what blocked you."
)
```

**IMPORTANT:** The execute agent runs in a worktree. It will:
- Read the plan and CLAUDE.md
- Create tasks, implement phases, run tests
- Update specs, archive the plan
- Push the branch and create a PR

#### 4d. Handle the result

**If the agent succeeded** (PR created):

1. **Update the PR base** to point at the correct parent branch:
   ```bash
   # If this is the first plan, base is main (already correct)
   # If this is plan 2+, update the PR base to the previous plan's branch
   gh pr edit <number> --base <current_base>
   ```

2. **Record the branch name** from the PR for the next plan's base:
   ```bash
   current_base = <this plan's branch name>
   ```

3. **Check out the new branch** so the next plan branches from it:
   ```bash
   git checkout <current_base>
   git pull
   ```

4. Log the success with PR number and branch name.

**If the agent got stuck** (returned with errors or incomplete work):
- Do NOT change `current_base`. The next plan will still branch from the last successful plan.
- Move the plan back from `active/` to `workflow/plans/` on the current base:
  ```bash
  git checkout <current_base>
  git mv workflow/plans/active/<plan>.md workflow/plans/<plan>.md
  git commit -m "chore: unstick <plan> (nightshift could not complete)"
  git push
  ```
- Log what went wrong
- Continue to the next plan

### Step 5: Morning Report

After all plans are processed, output a summary:

```
## Nightshift Report

**Started:** 11:30 PM ET
**Finished:** 3:45 AM ET
**Plans processed:** 3 of 4

### Stacked PRs (merge in order)

| # | Plan | Status | PR | Branch | Base | Notes |
|---|------|--------|-----|--------|------|-------|
| 1 | spec-overhaul | Ready for review | #12 | spec-overhaul | main | 7 spec files rewritten |
| 2 | time-charts-v2 | Ready for review | #13 | time-charts-v2 | spec-overhaul | Added granularity toggle |
| 3 | mobile-responsive | Stuck | - | - | - | Tailwind breakpoints failing, stopped after 2 attempts |

**Merge order:** #12 first, then #13. GitHub will auto-rebase #13 when #12 is merged.

**Skipped:**
- api-endpoints.md - audit verdict: NEEDS HUMAN INPUT

**Stuck plans (returned to queue):**
- mobile-responsive.md - Tailwind breakpoints failing on grid after 2 attempts

**Next steps:**
- Review and merge PRs #12 and #13 in order
- Fix mobile-responsive blocker and re-queue
- Resolve blocking question in api-endpoints.md audit
```

Write this report to `.claude/nightshift-report.md` in the repo root (gitignored) so it's available if the conversation context is lost.

## Key Principles

- **Sequential, not parallel.** One plan at a time. Each branches from the previous plan's branch. This avoids database locks, port conflicts, merge conflicts, and browser contention.
- **Stacked PRs, not auto-merge.** Each plan creates a PR based on the previous plan's branch. The user reviews and merges them in order the next morning. No code lands on main without human review.
- **Fail forward.** If a plan gets stuck, log it, move it back to the queue, and continue. The next plan branches from the last successful branch. Don't let one stuck plan block the rest.
- **No human interaction during execution.** The execute agent must not ask questions. If it hits ambiguity, it makes a reasonable call and documents the decision in execution notes. The only human checkpoint is the initial confirmation.
- **DB migrations between plans.** If a previous plan added migrations, run them before the next plan starts. Check the branch diff for `db/migrate/` files. Refer to `CLAUDE.md` for project-specific commands.
- **Morning report is the deliverable.** The user wakes up to a clear summary of what's ready to review, what's stuck, and what needs attention. The merge order is explicit.

## Error Recovery

- **Git state gets weird:** `git checkout <current_base> && git pull && git status`. If dirty, stash or reset.
- **Plan has no audit:** Execute anyway. The audit is a nice-to-have, not a gate for nightshift. The plan was queued, so the user wants it executed.
- **Worktree cleanup:** Git worktrees from stuck agents may linger. Clean up with `git worktree list` and `git worktree remove` for any stale entries.
- **PR base is wrong:** Fix with `gh pr edit <number> --base <correct-branch>`.

## Morning Workflow

When the user wakes up:

1. Read `.claude/nightshift-report.md` (or the conversation summary)
2. Review PRs in order, starting from the one based on main
3. Squash-merge each PR in order. GitHub auto-rebases the next PR in the stack.
4. Deal with stuck plans: fix blockers, re-audit, re-queue for the next nightshift
5. Write new proposals and plans for tonight's run

```
Day:    Write proposals, accept plans, audit plans
Night:  /nightshift executes everything
Morning: Review stacked PRs, merge in order, handle stuck plans
```
