# Plan: CDD 2025.03.27 - Context-Driven Delivery

### Revision Log

| Date | What Changed |
|------|-------------|
| 2025-03-27 | Plan created from accepted proposal. |
| 2025-03-28 08:00 MT | Audit: tightened Phase 2 language guidance, fixed section placement, added mutate skill to Phase 5, scoped grep acceptance criteria. |

## Goal

Reframe CDD as Context-Driven Delivery, add `data/` and `workflow/ideas/` context layers, add context stratification, and version the methodology.

## Proposal

[workflow/proposals/accepted/2025-03-27-cdd-to-cdp.md](../proposals/accepted/2025-03-27-cdd-to-cdp.md)

## Why This Matters

CDD works for non-software projects but the language assumes code. Two structural gaps (no home for imported external context, no private scratchpad) exist across every CDD project. This update generalizes the methodology and fills those gaps with minimal disruption.

## Acceptance Criteria

- [ ] `grep -r "Context-Driven Development" --exclude-dir=.claude --exclude=INTERNAL.md *.md **/*.md` returns zero hits
- [ ] CDD.md title includes version `CDD 2025.03.27`
- [ ] CDD.md contains a "Context Stratification" section with the four-layer hierarchy
- [ ] CDD.md repo structure diagram includes `data/` and `workflow/ideas/`
- [ ] CDD.md content is generalized for non-software projects (not just code)
- [ ] CLAUDE.md repo structure includes `data/` and `workflow/ideas/`
- [ ] `.gitignore` contains `workflow/ideas/`
- [ ] `cdd-quick-start.md` references Delivery, mentions data/ and ideas/
- [ ] Skills headers say "CDD 2025.03.27" not "CDD v1" (all 6 skills)
- [ ] `bun test` passes
- [ ] `bun run lint` passes

## What Does NOT Change

- Existing folder names (specs/, source/, playbook/, research/, transcripts/, experiments/)
- The pipeline (propose → accept → audit → execute → reconcile → merge)
- Plan lifecycle (filesystem state machine)
- Mutation, skills, playbook concepts
- Any code in source/
- INTERNAL.md (gitignored, private)

## Phase 1: Configuration

**Files:** `.gitignore`

1. Add `workflow/ideas/` to `.gitignore`

## Phase 2: CDD.md Rewrite

**Files:** `CDD.md`

This is the big one. Rewrite CDD.md with these changes:

1. Title: `# Context-Driven Delivery (CDD 2025.03.27)`
2. Opening paragraph: change "A methodology for building software with AI agents" to frame it as a methodology for delivering work products of any kind with AI agents. Software is the primary example but not the only one.
3. Context Layers table (currently lines 15-25): add two new rows:
   - `Data` | Imported external context: documents, Q&A, vendor materials converted to markdown | Anyone needing reference material
   - `Ideas` | Personal scratchpad: uncommitted, gitignored thoughts before they become proposals | The person thinking
4. New section: **Context Stratification**. Insert AFTER "Why Context Accumulates" (after line ~32) and BEFORE "Specs and Code: Shared Authority" (line ~35). Content: the four-layer confidence hierarchy table from the proposal (Specs > Research > Data > Ideas) with a brief explanation that this is naming what's already implicit.
5. Repo Structure diagram (lines 55-72): add `data/` folder (after `source/`) and `workflow/ideas/` (gitignored) inside the workflow section. Add a brief description paragraph for `data/` after the diagram.
6. The Idea Pipeline section (lines 78-86): extend the simple diagram to show `ideas/ (uncommitted) → proposals/ → plans/ → source/`. Keep the existing explanation of proposal → plan → source, just prepend the ideas stage as optional.
7. Spec Types table (lines 273-277): add a row for **Team** specs (`team.md` - people, roles, responsibilities) and **Domain** specs (business rules, constraints, regulatory requirements). Note that specs/ accommodates non-software content.

**Language generalization rules for Phase 2:**

- **CHANGE** the framing/intro language: "building software" → "delivering work products", "software development" → "delivery", "A methodology for building software" → "A methodology for delivering work products"
- **CHANGE** "Context-Driven Development" → "Context-Driven Delivery" everywhere
- **KEEP** software-specific examples intact (N+1 queries, Rails, linters, etc.). These are good concrete examples. Just frame them as "for software projects" rather than implying all projects are software.
- **KEEP** the "Specs and Code" section title and content as-is. The code/spec relationship is accurate for software projects and the section is already well-scoped.
- **KEEP** "code" when it literally means code (e.g., "the code that gets written", "reading code"). Only change "code" to something broader when it's used as a synonym for "work product" or "deliverables".
- **ADD** brief notes where appropriate that non-software projects substitute their deliverables (reports, campaign assets, etc.) for source code. One or two sentences in the intro and repo structure sections is enough. Don't overdo it.

**Preserve entirely:** Mutation section, Execution section, Playbook section, Transcript section, Skills section, Getting Started section, Collaboration and Scale section. Light touch only (change "Development" to "Delivery" in any headers/references, but don't rewrite prose).

## Phase 3: CLAUDE.md Update

**Files:** `CLAUDE.md`

1. Update repo structure tree to include `data/` (after `source/`) and `workflow/ideas/` (inside workflow section)
2. Add brief description comments for each: `# Imported external context (NEW)` and `# Personal scratchpad (gitignored, NEW)`
3. Change any "Context-Driven Development" reference to "Context-Driven Delivery"

## Phase 4: Quick-Start and README

**Files:** `cdd-quick-start.md`, `README.md`

1. `cdd-quick-start.md`: Change "Context-Driven Development" → "Context-Driven Delivery" in all occurrences
2. `cdd-quick-start.md`: Add brief mention of `data/` and `workflow/ideas/` in the repo structure or getting-started section. One paragraph each is sufficient.
3. `README.md`: Change "Context-Driven Development" → "Context-Driven Delivery" in all occurrences

## Phase 5: Skills Headers

**Files:**
- `skills/cdd/accept-proposal/SKILL.md`
- `skills/cdd/audit-plan/SKILL.md`
- `skills/cdd/execute-plan/SKILL.md`
- `skills/cdd/reconcile/SKILL.md`
- `skills/cdd/nightshift/SKILL.md`
- `skills/cdd/mutate/SKILL.md`

1. Update the `> **Requires CDD v1.**` header in each to `> **Requires CDD 2025.03.27.**`
2. Change "Context-Driven Development" → "Context-Driven Delivery" in each header
3. If mutate/SKILL.md doesn't have a CDD version header, add one consistent with the others

## Phase 6: Test and Lint

1. Run `cd source && bun test` - confirm all tests pass
2. Run `cd source && bun run lint` - confirm no lint errors
3. Run `grep -r "Context-Driven Development" --exclude-dir=.claude --exclude=INTERNAL.md *.md **/*.md` from repo root to verify zero remaining occurrences

## Readiness Audit

### Audit Log

| Timestamp | Verdict | Summary |
|-----------|---------|---------|
| 2025-03-28 08:00 MT | NEEDS HUMAN INPUT | Phase 2 language scope ambiguous, section placement unclear, mutate skill missing from Phase 5. |
| 2025-03-28 08:05 MT | READY FOR AUTONOMOUS EXECUTION | All blockers resolved. Phase 2 language rules explicit, placement specified, mutate added, grep scoped. |

### Verdict: READY FOR AUTONOMOUS EXECUTION

All blocking items resolved. Phase 2 has explicit language generalization rules. No code changes, so tests will pass.

### Input Data

| Input | Status | Notes |
|-------|--------|-------|
| Test data | Not needed | Documentation-only changes. No test data required. |
| Accepted proposal | Ready | `workflow/proposals/accepted/2025-03-27-cdd-to-cdp.md` exists. |

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| .gitignore | Ready | Exists, writable. |
| CDD.md | Ready | 331 lines, already has version in title. |
| CLAUDE.md | Ready | Has repo structure to update. |
| cdd-quick-start.md | Ready | Exists. |
| README.md | Ready | Exists, 2 occurrences to change. |
| 6 SKILL.md files | Ready | All exist. mutate now included. |
| bun test | Ready | 11 tests passing. |
| bun run lint | Ready | Clean, 4 files. |

### Open Questions

| # | Question | Blocking? | Notes |
|---|----------|-----------|-------|
| 1 | Phase 2 generalization scope | Resolved | Added explicit language rules to plan. |
| 2 | Context Stratification placement | Resolved | Specified: after "Why Context Accumulates", before "Specs and Code: Shared Authority". |
| 3 | Context Layers table merge | Resolved | Add two new rows to existing table, don't replace. |
| 4 | Idea Pipeline extension | Resolved | Prepend ideas/ as optional stage, keep existing flow. |
| 5 | INTERNAL.md | Resolved | Excluded from scope. Gitignored, private. Added to "What Does NOT Change". |
| 6 | Worktree artifacts | Resolved | Grep scoped with --exclude-dir=.claude. |

### POC Gaps

None. All assumptions verified during audit.

### Pre-Work

None required. All files exist and are ready.

### Blockers

None identified.

## Execution Notes

**Executed:** 2026-03-28
**Branch:** cdd-to-cdp
**Agent:** intercom-dev (Opus 4.6)

### Summary

All 6 phases completed successfully. Documentation-only changes, no source code modified.

### Phase Results

1. **Configuration:** Added `workflow/ideas/` to `.gitignore`.
2. **CDD.md Rewrite:** Title, opening paragraph, Context Layers table (added Data + Ideas rows), new Context Stratification section, Repo Structure diagram (added `data/` and `workflow/ideas/`), Idea Pipeline (extended with ideas stage), Spec Types table (added Team + Domain types). "Development" replaced with "Delivery" throughout.
3. **CLAUDE.md:** Updated repo structure tree with `data/` and `workflow/ideas/`.
4. **Quick-Start and README:** Changed "Development" to "Delivery" in both files. Added `data/` and `ideas/` starting point sections to cdd-quick-start.md.
5. **Skills Headers:** Updated 5 of 6 SKILL.md files (accept-proposal, audit-plan, execute-plan, nightshift, reconcile). Mutate skill had no CDD v1 header or Development reference to change.
6. **Test and Lint:** 11 tests pass, lint clean, zero grep hits for "Context-Driven Development" outside the plan file.
