---
name: reconcile
description: Pre-merge spec reconciliation. Diffs the branch against main, reads all affected specs, identifies divergences (code changed but spec didn't, or new behavior undocumented), drafts spec updates, and applies them. Use when the user says "/reconcile", "reconcile specs", "spec review", or wants to sync specs with code before merging.
args: "[branch name or plan path, e.g. delivery-receipts or workflow/plans/archived/delivery-receipts.md]"
---

> **Requires CDD 2025.03.27.** This skill expects the repo to use Context-Driven Delivery folder structure (`workflow/proposals/`, `workflow/plans/`, `specs/`). See `CDD.md` at the repo root.

# /reconcile - Pre-Merge Spec Reconciliation

Reconcile specs with what was actually built before merging. Works for both planned features and ad-hoc branches.

## Where It Fits

```
Big features:  propose -> accept -> audit -> execute -> reconcile -> merge
Ad-hoc work:   hack on branch -> reconcile -> merge
```

For planned features, `/reconcile` catches drift from post-plan polish. For ad-hoc branches, it ensures specs stay current with whatever you built. Either way, specs match code at merge time.

## Usage

```
/reconcile
/reconcile delivery-receipts
/reconcile workflow/plans/archived/delivery-receipts.md
```

If no argument, auto-detect: check the current branch name, look for a matching plan in `workflow/plans/archived/` or `workflow/plans/active/`, and use the branch diff against main.

## Instructions

### Step 1: Identify the Scope

Determine what to reconcile:

1. **Find the plan.** Check (in order):
   - Argument passed by user (plan path or branch name)
   - Current branch name -> match against `workflow/plans/archived/*.md` or `workflow/plans/active/*.md`
   - If no plan found, that's fine. Work from the diff alone.

2. **Get the diff.** Run:
   ```bash
   git diff main --stat
   git diff main --name-only
   ```

3. **Get the full commit history** on this branch:
   ```bash
   git log main..HEAD --oneline
   ```

4. **Identify post-plan commits.** If a plan was found and archived, look for the archive commit (message like "archive <plan>"). Any commits after that are post-plan and are the primary source of spec drift. If no plan was found, all commits on the branch are in scope.

### Step 2: Identify Affected Specs

Use subagents in parallel to:

1. **Read all spec files** in `specs/` (excluding `sandbox/`). Build a map of what each spec covers.

2. **Read the plan** (if found) for its "Specs to Write" section and any spec files it updated.

3. **Cross-reference the diff** against specs. For each changed source file, determine which spec(s) describe that behavior:

   | Source file pattern | Likely spec |
   |---|---|
   | `source/intercom.ts` | `specs/protocol.md` |
   | `source/test/` | Check which spec the tested behavior belongs to |
   | Message format changes | `specs/protocol.md` |
   | New tool definitions | `specs/protocol.md` or feature-specific spec |

   Adapt this mapping to the actual project. Read CLAUDE.md for project structure.

### Step 3: Analyze Divergences

For each affected spec, compare what the spec says against what the code does. Use Explore agents in parallel for speed.

Classify each finding:

| Category | Meaning | Action |
|---|---|---|
| **Stale** | Spec describes behavior the code no longer has | Update spec to remove/replace |
| **Missing** | Code has new behavior the spec doesn't mention | Add to spec |
| **Inaccurate** | Spec describes behavior incorrectly (wrong method signature, wrong message format, etc.) | Fix spec |
| **Cosmetic** | Minor wording that could be clearer but isn't wrong | Note but don't block |

### Spec Altitude Rules (apply when writing edits)

Specs describe the domain, not the implementation. When writing proposed edits, stay at the right altitude:

**Include:** Domain rules, design decisions with reasoning, non-obvious architecture choices, what each piece IS and WHY it exists.

**Exclude:** Type signatures, function names, file paths, JSON field types, configuration constants, internal data structures. If an agent can derive it from reading the code, it doesn't belong in the spec.

**Test:** Would removing this detail from the spec cause an agent to make a wrong decision? If no, leave it out.

### Step 4: Generate the Report

Output a structured reconciliation report to the user:

```markdown
## Reconciliation Report: <branch-name>

**Plan:** <plan path or "ad-hoc branch (no plan)">
**Branch commits:** N total<, M post-plan if plan exists>
**Specs affected:** N files

### Findings

| # | Spec File | Line(s) | Category | Finding |
|---|-----------|---------|----------|---------|
| 1 | specs/protocol.md | 42 | Stale | Delivery semantics documented as at-least-once but code uses at-most-once |
| 2 | specs/protocol.md | 78 | Missing | New `ack` field in message format not documented |
| 3 | specs/protocol.md | - | Missing | Agent group routing not documented |

### Proposed Spec Edits

For each finding, show the before/after:

**Finding 1: ...**
- File: `specs/protocol.md`
- Current: > "Messages are delivered at-least-once..."
- Proposed: > "Messages are delivered at-most-once. Failed deliveries are dropped..."
```

### Step 5: Apply Edits

After presenting the report, ask the user:

> Apply all spec edits? (yes / let me pick / no)

- **yes**: Apply all proposed edits using the Edit tool. Commit with message: `docs: reconcile specs with <branch-name> implementation`
- **let me pick**: Show each edit individually, let user approve/skip
- **no**: Leave the report as-is for manual editing

### Step 6: Update Plan (if applicable)

**Skip this step for ad-hoc branches with no plan.**

If the plan exists and is in `archived/` or `done/`, append a "Post-Execution Reconciliation" section to it documenting what changed after the plan was marked complete:

```markdown
## Post-Execution Reconciliation

Reconciled on YYYY-MM-DD. Post-plan commits added:
- [list of changes not in the original plan]

Specs updated:
- [list of spec files modified]
```

### Step 7: Output Summary

```
Reconcile: N findings across M spec files
  Stale:      X
  Missing:    Y
  Inaccurate: Z
Applied: N spec edits committed (abc1234)
```

If everything was already in sync: `Reconcile: specs match implementation. No changes needed.`

## Key Principles

- **Specs are source of truth, but code wins at merge time.** If code and spec disagree, the spec gets updated to match code. The spec was the plan; the code is what was built. Post-merge, the updated spec becomes the new source of truth.
- **Post-plan drift is normal.** Execution always involves tweaks, polish, and late discoveries. The skill exists to catch these, not to prevent them.
- **Be specific.** Quote the spec line. Show the code. Don't say "protocol spec is outdated." Say "line 42 says at-least-once delivery but code deletes on failure."
- **Don't rewrite specs from scratch.** Make targeted edits. The original spec language was intentional. Update only what diverged.
- **Read before editing.** Always read the full spec file before proposing changes. Context matters.
- **Cosmetic findings are noted, not applied.** Don't rewrite clear prose just because you'd phrase it differently.
