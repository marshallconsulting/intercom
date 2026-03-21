---
name: mutate
description: Mutate traits from one artifact onto another. Reads theirs and ours, identifies improvements in theirs, and rewrites ours to incorporate them while preserving its existing identity. Use when the user says "/mutate", "mutate this", "pull traits from", or wants to evolve a skill, spec, or CDD.md from another version.
args: "ours=<path> theirs=<path>"
---

# /mutate - Trait-Based Artifact Mutation

Read theirs. Read ours. Identify the traits in theirs worth adopting. Rewrite ours to incorporate them.

## Usage

```
/mutate ours=skills/cdd/execute-plan/SKILL.md theirs=~/.claude/skills/execute-plan/SKILL.md
/mutate ours=CDD.md theirs=~/other-project/CDD.md
/mutate ours=specs/protocol.md theirs=~/other-project/specs/messaging.md
```

Both arguments are required. `ours` is the file that gets rewritten. `theirs` is read-only.

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

## Reverse Mutation

The arguments are interchangeable. To push traits from a local skill back to the global version:

```
/mutate ours=~/.claude/skills/execute-plan/SKILL.md theirs=skills/cdd/execute-plan/SKILL.md
```

Same process, opposite direction. "Ours" is always the file that gets rewritten.

## Examples

**Sync a repo skill with its global counterpart:**
```
/mutate ours=skills/cdd/execute-plan/SKILL.md theirs=~/.claude/skills/execute-plan/SKILL.md
```

**Evolve CDD.md from another project:**
```
/mutate ours=CDD.md theirs=~/data/other-project/CDD.md
```

**Pull a spec pattern from a different repo:**
```
/mutate ours=specs/protocol.md theirs=~/data/other-project/specs/messaging.md
```

**Push local improvements back to global:**
```
/mutate ours=~/.claude/skills/audit-plan/SKILL.md theirs=skills/cdd/audit-plan/SKILL.md
```
