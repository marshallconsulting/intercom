---
name: mutate
description: Mutate traits from one artifact onto another. Reads theirs and ours, identifies improvements in theirs, and rewrites ours to incorporate them while preserving its existing identity. Use when the user says "/mutate", "mutate this", "pull traits from", or wants to evolve a skill, spec, or CDD.md from another version.
args: "ours=<path> theirs=<path> [-sync]"
---

> **Requires CDD 2025.03.27.** This skill expects the repo to use Context-Driven Delivery folder structure (`workflow/proposals/`, `workflow/plans/`, `specs/`). See `CDD.md` at the repo root.

# /mutate - Trait-Based Artifact Mutation

Read theirs. Read ours. Identify the traits in theirs worth adopting. Rewrite ours to incorporate them.

## Usage

```
/mutate ours=skills/cdd/execute-plan/SKILL.md theirs=~/.claude/skills/execute-plan/SKILL.md
/mutate ours=CDD.md theirs=~/other-project/CDD.md
/mutate ours=skills/cdd/execute-plan/SKILL.md theirs=~/.claude/skills/execute-plan/SKILL.md -sync
```

`ours` and `theirs` are required. `ours` is the file that gets rewritten first. Add `-sync` to automatically run it again with the roles swapped (see "Sync Mode" below).

## What This Is

Mutation is a core CDD concept. Artifacts (skills, specs, CDD.md) diverge across repos and locations because each context has different needs. When one version develops a good idea, mutation pulls that idea into the other version without overwriting what already works.

This is not copying. This is not merging. The agent understands the *intent* of what's better in theirs and applies that understanding to ours. Theirs and ours don't need to be the same shape or even about the same topic.

## Instructions

### Step 1: Read Both Files

Read ours and theirs completely. Understand the structure, purpose, and context of each.

### Step 2: Identify Traits

Compare them. Look for traits in theirs that ours would benefit from. A trait is a discrete improvement: a structural pattern, a new section, a clearer explanation, a better workflow step, a missing guardrail.

For each trait found, note:
- **What it is** (one line)
- **Why it's better** (what problem it solves or what clarity it adds)
- **Whether ours already has a version of it** (if so, is theirs meaningfully better?)

Skip traits that:
- Are project-specific details from theirs that don't apply to ours
- Would contradict existing design decisions in ours
- Are just stylistic differences with no functional improvement

### Step 3: Present the Trait List

Show the user the traits you found. For each one, show:

```
Trait: <name>
Theirs: <brief description of how theirs does it>
Ours: <what ours currently has, or "missing">
Recommendation: adopt / skip / adapt
```

Ask: "These are the traits I found. Want me to apply all of them, or pick specific ones?"

If the user says "all" or "go ahead," proceed. If they pick specific ones, only apply those.

### Step 4: Rewrite Ours

Apply the selected traits to ours. For each trait:

1. If ours is missing it entirely, write the new content in the appropriate location within ours, adapted to ours' context and conventions.
2. If ours has a weaker version, rewrite that section to incorporate the improvement while keeping any ours-specific details that are still valid.
3. If the trait requires restructuring, do it, but preserve all existing content that isn't being replaced.

**Key rules:**
- Preserve ours' voice, structure, and project-specific details.
- Don't import theirs' project-specific references (paths, names, tools that don't exist in ours' context).
- Don't remove content from ours that theirs doesn't have. Mutation is additive. If ours has something theirs doesn't, keep it.
- Write in ours' existing style. If ours uses terse bullet points and theirs uses long paragraphs, use terse bullet points.

### Step 5: Show the Diff

After rewriting, show the user a summary of what changed:
- Which traits were applied
- Which sections were added or rewritten
- Anything you chose NOT to apply and why

Do not commit. The user reviews the changes and decides next steps.

## Sync Mode (`-sync`)

When `-sync` is passed, the skill runs the standard mutation (Steps 1-5) as normal, then **automatically runs it again with ours and theirs swapped**.

### How It Works

1. **Pass 1:** Normal mutation. `ours` gets rewritten with traits from `theirs`. User reviews and approves.
2. **Pass 2:** Roles reverse. Now the original `theirs` becomes `ours` and gets rewritten with traits from the (now-updated) original `ours`. User reviews and approves.

Each pass is a full mutation: read both, identify traits, present them, get approval, apply. The second pass may find different traits than the first, because each file may have unique improvements the other lacks.

### When to Use

After editing a CDD skill that has a local/global counterpart. Instead of running `/mutate` twice manually:

```
# Without sync: two separate invocations
/mutate ours=~/.claude/skills/execute-plan/SKILL.md theirs=skills/cdd/execute-plan/SKILL.md
/mutate ours=skills/cdd/execute-plan/SKILL.md theirs=~/.claude/skills/execute-plan/SKILL.md

# With sync: one invocation, both directions
/mutate ours=skills/cdd/execute-plan/SKILL.md theirs=~/.claude/skills/execute-plan/SKILL.md -sync
```

The order of ours/theirs determines which file gets mutated first. Start with whichever side you want to update first.

## Examples

**Bidirectional sync between local and global:**
```
/mutate ours=~/.claude/skills/execute-plan/SKILL.md theirs=skills/cdd/execute-plan/SKILL.md -sync
```

**One-directional mutation (no sync):**
```
/mutate ours=CDD.md theirs=~/data/other-project/CDD.md
```

**Pull a spec pattern from a different repo:**
```
/mutate ours=specs/protocol.md theirs=~/data/other-project/specs/messaging.md
```
