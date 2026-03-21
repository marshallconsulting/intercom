# Installing CDD in Your Repo

You're an agent in a repo that doesn't use CDD yet. This guide helps you understand what CDD is, figure out which pieces make sense for your project, and set them up.

## What CDD Is (30-Second Version)

Context-Driven Development is a way of organizing a repo so that every decision, plan, and piece of domain knowledge is written down alongside the code. The repo becomes the complete picture of the project, not just the code. Agents build better because the context is there. Humans make better decisions because the context is there.

The full methodology is described in [CDD.md](CDD.md). You don't need to read all of it right now. This guide tells you what to start with.

## Before You Start

Read your repo's existing CLAUDE.md (if it has one). Understand the tech stack, how tests run, what conventions exist. CDD adds structure on top of what's already there. It doesn't replace anything.

If your repo doesn't have a CLAUDE.md, that's your actual first step. Write one. It should cover:
- What the project is (one sentence)
- Tech stack and runtime
- How to install dependencies, run tests, run the linter
- Where the code lives
- Key concepts an agent needs to know

## Pick Your Starting Point

You don't need all of CDD. Start with what solves a problem you actually have. Here's how to decide:

### "Agents keep making the same mistakes"

**Start with: `playbook/`**

Create a `playbook/` folder and add your first file. `playbook/conventions.md` is a good start. Write down the rules agents keep violating: "don't mock the database in tests," "use Decimal for money," "always preload associations." Three rules is enough to start. Add more as you catch mistakes in PR review.

```
mkdir playbook
```

### "We're about to build something big and I want to plan it"

**Start with: `workflow/`**

Create the proposal and plan pipeline. Write a proposal describing what you want to build and why. Break it into a plan with phases. Execute.

```
mkdir -p workflow/proposals/accepted workflow/plans/active workflow/plans/archived
```

Write your first proposal as a markdown file in `workflow/proposals/`. It doesn't need to be formal:

```markdown
# Proposal: Add Rate Limiting

**Status:** Draft

## Problem
API has no rate limiting. One bad client can take down the service.

## Proposed Change
Add per-client rate limiting using Redis counters.

## What Changes
- source/middleware/rate_limiter.rb (new)
- specs/api.md (update)

## What Doesn't Change
- Authentication flow
- Existing middleware order
```

### "Agents don't understand the domain well enough"

**Start with: `specs/`**

Write specs for the parts of the system where agents make wrong assumptions. Focus on domain rules and design decisions that aren't obvious from reading the code. Skip anything an agent can figure out by reading source files.

```
mkdir -p specs/sandbox
```

Good first specs: the data model (why things are structured the way they are), the core business rules, any non-obvious architectural decisions.

### "We need to research something before building"

**Start with: `research/`**

Create a folder for distilled external knowledge. One file per topic. Not raw notes, but cleaned-up summaries an agent can reference when writing proposals or specs.

```
mkdir research
```

### "We have design sessions and the context gets lost"

**Start with: `transcripts/`**

Record design calls, clean up the transcripts, and drop them in the repo. A single design session can produce proposals, research tasks, spec updates, and action items. Without transcripts, that knowledge lives in people's heads.

```
mkdir transcripts
```

## Adding CDD.md

Once you've picked your starting layers, copy CDD.md into your repo root:

```bash
# From a clone of the intercom repo, or wherever you got CDD.md
cp /path/to/intercom/CDD.md ./CDD.md
```

Then edit it. Remove sections for layers you're not using yet. Add your own conventions. Change the repo structure diagram to match your actual layout. CDD.md is meant to be modified. Every repo's copy should reflect that repo's needs.

Your CLAUDE.md should reference CDD.md so agents know it exists:

```markdown
## Methodology
This repo uses Context-Driven Development. See [CDD.md](CDD.md) for the workflow.
```

## Installing Skills (Optional)

CDD has slash commands that automate the pipeline: `/accept-proposal`, `/audit-plan`, `/execute-plan`, `/reconcile`, `/mutate`, `/nightshift`. They're optional. The folder structure and workflow work without them.

If you want them, copy the SKILL.md files into your global Claude Code skills directory:

```bash
# Example: install the accept-proposal skill
mkdir -p ~/.claude/skills/accept-proposal
cp /path/to/intercom/skills/cdd/accept-proposal/SKILL.md ~/.claude/skills/accept-proposal/SKILL.md
```

Repeat for whichever skills you want. You can start with just `/accept-proposal` and `/execute-plan` and add others later.

## What to Skip

- **Don't create empty folders "just in case."** Add a layer when you need it, not before.
- **Don't copy the entire CDD structure on day one.** Start with one or two things. Add more when the need is obvious.
- **Don't worry about `source/` separation.** CDD works fine with code at the repo root. The `source/` folder is nice when you have many context folders cluttering the root, but it's not required and it's a pain to move existing code.
- **Don't install skills you won't use.** Each skill is independent. Install them one at a time as you need them.

## The Minimum Viable CDD Repo

If you want the simplest possible starting point:

1. Make sure you have a CLAUDE.md
2. Copy and edit CDD.md
3. Create `playbook/conventions.md` with three rules
4. Create `workflow/proposals/` and write one proposal

That's it. You'll feel the workflow after one proposal-to-PR cycle. Everything else can come later.
