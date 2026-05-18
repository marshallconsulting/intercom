# /code-review - Review the Current Branch Against the Project Playbook

Run an opinionated code review on whatever's currently checked out. The review criteria come exclusively from the project's `playbook/code-review.md` — this skill does not substitute generic advice if that file is absent.

## Usage

```
/code-review               # diff against main
/code-review develop       # diff against any branch name
/code-review 3             # review the last 3 commits
/code-review abc123..HEAD  # review a specific commit range
```

The skill does NOT check out any branch — review whatever's currently there. To review a PR, pair with `/checkout-review <N>`, which does `gh pr checkout N` first, then delegates to this skill.

## Prerequisite: `playbook/code-review.md` must exist

This skill is useless without a project-specific review-criteria file. If `playbook/code-review.md` is missing, **stop and tell the user**:

> This skill requires `playbook/code-review.md` at the repo root — it's the criteria the review is run against. Create that file with your project's review principles and run this again.

Do not proceed, do not substitute defaults, do not run a generic review. The whole point of this skill is to review against *your* conventions. If those conventions aren't captured in a file, the right next step is to capture them, not to hand-wave.

## Step 1: Determine the Diff Range

| Argument | Diff base |
|----------|-----------|
| (none) | `main...HEAD` |
| A branch name (e.g. `develop`) | `<branch>...HEAD` |
| A number N | `HEAD~N..HEAD` |
| A range `A..B` | `A..B` |

If the diff is empty, tell the user there's nothing to review and stop.

## Step 2: Gather Breadcrumbs

Collect what a reviewer needs to orient:

```bash
# File list with stats (exclude test-support noise if desired)
git diff <base>..HEAD --stat

# File types in the diff
git diff <base>..HEAD --name-only | sed 's/.*\.//' | sort -u

# Recent commits for context
git log --oneline <base>..HEAD
```

## Step 3: Load the Playbook

First, verify the required file exists:

```bash
test -f playbook/code-review.md || echo "MISSING"
```

If missing, stop with the message from the "Prerequisite" section above — do not proceed.

If present, read `playbook/code-review.md` — it is THE review criteria. Also read the following supporting files **if they exist** (skip any that don't):

**Baseline context:**
- `playbook/conventions.md` — naming, commit style, common pitfalls

**Conditional reads based on files in the diff:**

| Files in diff | Also read |
|---------------|-----------|
| `lib/**/*.ex` (non-LiveView context) | `playbook/contexts.md`, `playbook/data-layer.md` |
| `lib/**/workers/*.ex` or Oban-related | `playbook/infrastructure.md` |
| `lib/**_web/**/live/**/*.ex` or `.heex` | `playbook/liveview.md` |
| `priv/repo/migrations/*.exs` | `playbook/data-layer.md` |
| `test/**/*.exs` | `playbook/testing.md` |
| `.scss` / `.heex` styling | `playbook/frontend.md` |

Supporting files are optional — don't error if they're missing. Only `playbook/code-review.md` is load-bearing.

## Step 4: Dispatch the Reviewer Subagent (in background)

Use the `Agent` tool with `subagent_type: "general-purpose"` **and `run_in_background: true`**. The review typically takes 1-4 minutes; backgrounding lets the user keep working. Do NOT paste the full diff into the prompt — let the subagent explore via `git diff`, `Read`, `Grep`.

When dispatched in background, the Agent call returns immediately and a completion notification fires later. At that point, jump to Step 5 to present the findings. Tell the user you've kicked off the review so they know something's in flight.

Prompt structure:

```
You are reviewing a code change in the repo at {repo_root}.

**Diff base:** {base_ref}
**Scope:** {file-extension list or "all files in diff"}

## Files Changed
{paste --stat output}

## Commit History
{paste git log --oneline}

## Review Criteria

{paste playbook/code-review.md verbatim — this IS the criteria}

## Context (playbook excerpts relevant to the diff)

{for each conditional playbook file that applies, paste its content verbatim — skip any that don't exist}

## Project Conventions

{paste playbook/conventions.md verbatim if it exists; otherwise omit this section}

## How to Work

1. `git -C {repo_root} diff {base}...HEAD -- <path>` to see what changed.
2. Use `Read`/`Grep`/`Glob` to verify patterns exist elsewhere before flagging inconsistencies.
3. Don't flag whitespace or formatting — `mix format` handles those.
4. Don't flag pre-existing issues unrelated to the diff.

## Output

Return a flat numbered list. For each finding:
- **File + line** (e.g. `lib/foo/bar.ex:45`)
- **Principle violated** (number or short name from criteria above)
- **1-2 sentences** on what's wrong
- **1 sentence** on the specific fix

If the code is clean, return `LGTM — no issues found.`

Be direct. No praise. No softening.
```

## Step 5: Present Findings

Relay the subagent's review verbatim, preserving the numbered list.

After the list, ask:

> Want me to fix these? Which items?
> - **All** — I'll fix every item in one follow-up commit
> - **Critical only** — I'll fix items flagged under principles 1-3
> - **Let me pick** — specify numbers (e.g. "1, 3, 7-9")
> - **None** — informational only

If the code is clean, just say LGTM and stop.

## Step 6: Fix (Optional)

If the user asks for fixes:
1. Work through the approved items in dependency order — fix structural items first, then touch-ups.
2. Run the project's pre-push checks before declaring done (e.g. `mix format && mix credo && mix test` for Elixir/Phoenix).
3. Commit with a conventional message referencing the review (e.g. `refactor(reports): address code review findings`).
4. Don't push unless the user asks.

## Key Principles for the Skill Itself

- **Project-independent, playbook-required.** This skill works in any repo that has a `playbook/code-review.md`. If that file is absent, stop — the skill has no basis to review against. Do NOT substitute generic advice; the caller explicitly wants THEIR conventions applied.
- **Read the playbook at runtime.** Don't assume the content; actually read the files into the subagent prompt. Playbooks change.
- **Don't check out branches.** That's `/checkout-review`'s job. `/code-review` always operates on whatever HEAD points to.
- **The subagent does the work.** The top-level skill just sets up context and presents findings.
- **Default to background.** The reviewer subagent runs with `run_in_background: true` so the user isn't blocked during the review. Resume at Step 5 when the completion notification fires.
