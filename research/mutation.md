# Mutation in Practice

Mutation is how good ideas flow between CDD repos without flattening the differences each repo has developed. This doc covers how it works, why it's not merging, and how it shaped CDD itself.

## The Concept

Every CDD repo has its own copy of CDD.md. Over time, each repo's copy diverges as teams adapt the methodology to their needs. One repo adds a compliance review stage. Another drops transcripts and adds a data-quality phase. A third restructures how specs are organized. Each version reflects what that team actually needs.

When one repo discovers something useful, you want other repos to pick it up. But you can't copy-paste CDD.md between repos because each one has its own customizations that would get clobbered. You need a way to adopt the useful idea without losing what you already have.

That's mutation. Point the `/mutate` skill at two files, and the agent reads both, identifies the discrete improvements in theirs (called **traits**), and rewrites ours to incorporate them. It skips anything that's specific to their context. What you end up with is your file, still shaped for your project, but with the useful idea adopted and adapted.

```
/mutate ours=CDD.md theirs=~/data/other-project/CDD.md
```

## Why Not Merging

Merging is mechanical: line-by-line diff, resolve conflicts, combine text. It works when two files started from the same base and diverged slightly. It breaks when the files have different structures, different conventions, or different levels of detail.

Mutation is comprehension-based. The agent understands the intent of what's better in theirs and applies that understanding in ours' context. The two files don't need to be the same shape. They don't even need to be about the same topic. A trait from a spec about message schemas can be mutated onto a spec about payment processing if the underlying pattern (say, a consistent way to document delivery semantics) is the useful idea.

## Traits

A trait is a discrete improvement: a structural pattern, a new section, a clearer explanation, a workflow step, a missing guardrail. When the agent compares two files, it identifies traits in theirs that ours would benefit from. For each trait, it notes what the improvement is, why it's better, and whether ours already has a version of it.

Not everything in theirs is a trait worth adopting. The agent skips:
- Project-specific details that don't apply to ours
- Changes that would contradict existing design decisions in ours
- Stylistic differences with no functional improvement

The user reviews the trait list before anything is applied. You pick which traits to adopt, and the agent rewrites ours to incorporate only those.

## Bidirectional Sync

When two repos have each picked up different improvements independently, the `-sync` flag handles both directions in one shot:

```
/mutate ours=CDD.md theirs=~/data/other-project/CDD.md -sync
```

This runs two full mutation passes:
1. **Pass 1:** Identify traits in theirs, apply selected ones to ours.
2. **Pass 2:** Swap roles. Identify traits in the now-updated ours, apply selected ones to theirs.

Each pass has its own trait identification, presentation, and approval step. The second pass often finds different traits than the first, because each file had unique improvements the other lacked.

## What Can Be Mutated

Mutation works on any text artifact:
- **CDD.md** between repos
- **Skills** (e.g., a repo's `/execute-plan` skill vs the global version)
- **Specs** across repos with similar domains
- **Playbook** entries when patterns apply across projects

The source and target don't need to match structurally. You're extracting ideas, not lines of text.

## How `research/` Was Born

This is a real example of how mutation shaped CDD.

Early on, CDD didn't have a research layer. One of our repos at Marshall hit a project that required deep domain exploration: evaluating third-party APIs, comparing platform capabilities, reading vendor docs, understanding a regulatory landscape we hadn't worked in before. Agents kept producing useful findings, but there was nowhere to put them. They weren't specs (no decision to build anything yet). They weren't proposals (no decision being made). They were knowledge about the outside world that needed to be referenced later.

So that repo's CDD.md grew a `research/` section. We added the folder, wrote conventions for how research files should be structured (one topic per file, distilled not raw, updated as new info comes in), and kept working. After a few days, the pattern had proven itself. Research files were feeding directly into better proposals. Agents were writing more informed specs because the domain knowledge was right there in the repo.

We wanted other repos to pick this up. But each repo's CDD.md had diverged by then. One had added a playbook section the others didn't have. Another had restructured the pipeline stages. A third had different conventions for specs. Copy-pasting would have meant clobbering their customizations or carefully hand-editing each one.

Mutation handled it cleanly. We pointed `/mutate` at the repo that had the research trait and let the agent pull it into each target. The agent understood the concept (a layer for external knowledge that informs specs and proposals), found the right place in each target's structure, and wrote it in each target's voice. One repo got a brief paragraph. Another got a more detailed section because its CDD.md was more verbose. Neither lost anything they already had.

That's the pattern: a repo solves a real problem for itself, the solution proves out over a few days of use, and mutation spreads the idea without flattening differences.

## How CDD Evolved

CDD itself was built this way. The methodology started at Marshall Consulting across ten-plus repos, each adapting the workflow to its own needs. Skills diverged. CDD.md diverged. Good ideas surfaced in one repo, got mutated onto others, and the weaker versions fell away.

After enough rounds of this, the methodology stabilized enough to share publicly. But there's no canonical version. Every repo is a peer. The version in this repo is just another copy that happened to be written up first.
