# Context-Driven Development (CDD)

A methodology for building software with AI agents. The agent reads context (specs, plans, code) to make informed decisions instead of relying on massive prompts or fine-tuning.

## Core Principle

**Context is the product.** The specs, schemas, and plans in this repo aren't documentation. They're the input that drives AI-assisted development. Write them well and the agent builds well.

## Folder Structure

```
specs/          — Domain knowledge (what and why)
  schemas/      — Data model definitions
workflow/       — Decision and execution pipeline
  proposals/    — Ideas waiting for acceptance
    accepted/   — Approved, ready for planning
  plans/        — Execution plans
    active/     — Currently being worked
    archived/   — Completed plans (reference)
source/         — All code
docs/           — External-facing content
experiments/    — Prototyping, trying things
```

## Workflow

```
Idea → Proposal → Accept → Plan → Audit → Execute → Archive
```

1. **Propose** — Write a proposal in `workflow/proposals/`. Describe the feature, why it matters, and rough scope.
2. **Accept** — Move to `workflow/proposals/accepted/` with a date prefix. This means "we're doing this."
3. **Plan** — Write an execution plan in `workflow/plans/`. Break into steps, identify files to create/modify, note dependencies.
4. **Audit** — Review the plan for readiness. Check: sample data exists? Dependencies resolved? Open questions answered?
5. **Execute** — Build it. The plan tells the agent exactly what to do.
6. **Archive** — Move completed plan to `workflow/plans/archived/`. It becomes reference for future work.

## Skills

CDD ships with skills that automate the workflow:

- `/accept-proposal` — Accept a proposal and generate an execution plan
- `/audit-plan` — Check a plan's readiness before execution
- `/execute-plan` — Execute a plan step by step

## Why This Works

- **Agents don't guess.** They read specs and follow plans.
- **Humans stay in control.** Every accept/audit step is a decision point.
- **History is useful.** Archived plans show how the system was built.
- **New contributors onboard fast.** Read the specs, look at the plans, understand the system.
