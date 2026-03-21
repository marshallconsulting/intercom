# Plan: Linting, Tests, and CI

**Goal:** Add Biome linting, a Bun test suite, and GitHub Actions CI to the intercom MCP server.

**Proposal:** [workflow/proposals/accepted/2026-03-20-linting-tests-ci.md](../proposals/accepted/2026-03-20-linting-tests-ci.md)

### Revision Log

| Date | What Changed |
|------|-------------|
| 2026-03-20 | Plan created. 4 phases: linter, tests, CI, docs. |
| 2026-03-20 | Readiness audit. Verdict: READY. No blockers, no human input needed. |

## Why This Matters

The server works but has no automated quality checks. A showcase repo needs lint, tests, and CI to be taken seriously. Tests also protect against regressions as proposals get built.

## Acceptance Criteria

- [x] `cd source && bun run lint` passes with no errors
- [x] `cd source && bun run format` passes with no errors
- [x] `cd source && bun test` runs and all tests pass
- [x] Tests cover: MCP initialization, `send` tool, `broadcast` tool, `list_agents` tool, inbox polling + channel delivery, message lifecycle (inbox -> processed)
- [x] `.github/workflows/ci.yml` exists and runs lint + test on push and PR
- [x] `CLAUDE.md` documents the lint and test commands
- [x] `source/intercom.ts` passes lint with no changes to behavior
- [x] `specs/protocol.md` is still accurate after changes (verify, no update expected)

## Phases

### Phase 1: Linter Setup

**Files:**
- `source/package.json` — Add `@biomejs/biome` as devDependency. Add scripts: `"lint": "biome check ."`, `"format": "biome format . --write"`, `"lint:fix": "biome check . --fix"`
- `source/biome.json` — Create Biome config. Target: ES2022, JSX disabled, TypeScript enabled. Ignore `node_modules/`, `test/fixtures/`. Use default recommended rules.

**Verify:** `cd source && bun install && bun run lint` exits 0.

**If intercom.ts has lint violations:** Fix them. These should be style-only (formatting, unused imports, etc.), not behavioral changes.

### Phase 2: Test Suite

**Files:**
- `source/test/intercom.test.ts` — Create test file using Bun's test runner (`bun:test`).

**Tests to write:**

1. **MCP initialization** — Spawn the server as a subprocess, send an `initialize` JSON-RPC request, assert the response includes `claude/channel` capability and correct server info.

2. **send tool** — Call `tools/call` with `send`, verify response says "Sent to <target>". Verify a JSON file exists in `~/.claude/intercom/<target>/inbox/` with correct schema (id, from, to, message, ts).

3. **broadcast tool** — Register multiple agents (write info.json files), call broadcast, verify messages land in each agent's inbox (except sender).

4. **list_agents tool** — Register agents, call `list_agents`, verify all appear in the response. Verify the current agent is marked "(this agent)".

5. **Inbox polling and channel delivery** — Place a message JSON file in the agent's inbox, start the server, capture stdout for the `notifications/claude/channel` notification. Verify the notification contains the message content and correct metadata (from, to, message_id, ts).

6. **Message lifecycle** — After channel delivery, verify the message file moved from `inbox/` to `processed/`. Verify inbox is empty.

7. **Error handling** — Place a corrupt (non-JSON) file in the inbox. Verify it gets deleted (not stuck in an infinite loop). Verify other valid messages still get delivered.

**Test infrastructure:**
- Each test should use a unique temp directory for `INTERCOM_DIR` (not `~/.claude/intercom/`) to avoid polluting the real registry. Override via environment variable or by setting the constant.
- Helper function to spawn the server subprocess, send JSON-RPC messages, and collect responses.
- Clean up temp dirs in afterEach/afterAll.

**Important:** The server currently hardcodes `INTERCOM_DIR` to `~/.claude/intercom/`. To make tests isolated, either:
- Add an `INTERCOM_DIR` env var override to `intercom.ts` (preferred, minimal change: `const INTERCOM_DIR = process.env.INTERCOM_DIR || join(homedir(), '.claude', 'intercom')`)
- Or create/clean unique agent IDs per test

The env var approach is better. This is the one behavioral change to `intercom.ts`: reading `INTERCOM_DIR` from env. It doesn't change any functionality.

**Verify:** `cd source && bun test` passes all tests.

### Phase 3: CI Pipeline

**Files:**
- `.github/workflows/ci.yml` — GitHub Actions workflow.

**Workflow spec:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Setup Bun (oven-sh/setup-bun)
      - bun install (in source/)
      - bun run lint (in source/)
      - bun test (in source/)
```

Single job, not matrix. No caching needed (bun install is fast). No deploy step.

**Verify:** File is valid YAML. Workflow references correct paths.

### Phase 4: Update Docs and Final Verification

**Files:**
- `CLAUDE.md` — Update "Working in This Repo" section to include lint and test commands.

**CLAUDE.md changes:**
Add to the existing code block:
```bash
# Lint
cd source && bun run lint

# Format
cd source && bun run format
```

**Final verification:**
1. `cd source && bun run lint` — passes
2. `cd source && bun test` — all tests pass
3. Verify `specs/protocol.md` still accurately describes the server behavior (the `INTERCOM_DIR` env var override is an implementation detail, not a protocol change)

## What Does NOT Change

- `source/intercom.ts` — No functional changes. Only: (1) lint fixes if needed, (2) `INTERCOM_DIR` env var override for test isolation
- Message format, delivery semantics, polling behavior — unchanged
- No new runtime dependencies (Biome is devDependency only)
- Specs — no updates expected (verify in Phase 4)

## Readiness Audit

### Audit Log

| Timestamp | Verdict | Summary |
|-----------|---------|---------|
| 2026-03-20 21:00 CDT | READY FOR AUTONOMOUS EXECUTION | All dependencies available, no input data needed, no blocking questions. Clean plan. |

### Verdict: READY FOR AUTONOMOUS EXECUTION

All prerequisites are in place. No human input needed before execution.

### Input Data

| Input | Status | Notes |
|-------|--------|-------|
| Test data / fixtures | Not needed | Tests create their own temp directories and message JSON. No fixtures to prepare. |

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Bun runtime | Installed | v1.3.11 |
| @modelcontextprotocol/sdk | Installed | v1.27.1 in source/node_modules/ |
| @biomejs/biome | Not yet installed | Will be added in Phase 1. Available on npm (v2.4.8). Bun can install it. |
| oven-sh/setup-bun GitHub Action | Available | v2.2.0, actively maintained |
| source/intercom.ts | Exists | All interfaces (IntercomMessage, AgentInfo) present. No unused imports. |
| source/package.json | Exists | Currently has "start" and "test" scripts only. "lint"/"format" to be added. |
| gh CLI | Installed | v2.76.2 (not needed for execution, but available for PR step) |

### Open Questions

| # | Question | Blocking? | Notes |
|---|----------|-----------|-------|
| — | None identified | — | Plan decisions are clear. INTERCOM_DIR env var approach is specified. |

### POC Gaps

| # | Assumption | Suggested POC | Result |
|---|-----------|---------------|--------|
| 1 | Biome installs and runs via Bun | `bun add -d @biomejs/biome && bun biome check .` | Validated: Biome 2.4.8 available, Bun compatible |
| 2 | intercom.ts has no lint violations | Subagent code review | Validated: no unused imports, clean structure |
| 3 | Bun subprocess stdin/stdout for JSON-RPC testing | Manual test earlier in conversation | Validated: piped JSON-RPC to server, got correct responses |
| 4 | Channel notification appears on stdout when polling | Manual test earlier in conversation | Validated: receiver emitted `notifications/claude/channel` with correct payload |

All POC gaps were already validated during the manual testing session. No experiments needed.

### Pre-Work

None. The agent can proceed directly to Phase 1.

### Blockers

None identified.

### Spec Update Check

The plan includes spec verification in Phase 4 (acceptance criteria #8: "specs/protocol.md is still accurate after changes"). The only code change to intercom.ts is adding `INTERCOM_DIR` env var support, which is an implementation detail not covered by the protocol spec. Verification is sufficient; no spec update expected.

## Execution Notes

**Executed:** 2026-03-20

### Phase 1: Linter Setup
- Biome 2.4.8 installed as devDependency.
- Biome v2.x config differs from v1.x: `organizeImports` moved under `assist.actions.source`, `files.ignore` replaced by `files.includes`, schema version updated.
- The `biome` CLI binary launcher uses a Node.js shebang, which caused issues on this machine where Node.js is x86_64 but Bun is arm64 (Rosetta environment). Worked around by using `bunx --bun biome` in package.json scripts. This is transparent on CI (ubuntu-latest) where architectures align.
- Lint fixes applied to `intercom.ts`: added `node:` protocol to all Node.js built-in imports, reordered imports alphabetically, reformatted long lines, renamed unused `catch (e)` to `catch (_e)`. All style-only, no behavioral changes.

### Phase 2: Test Suite
- Added `INTERCOM_DIR` env var override to `intercom.ts` (the only code change beyond lint fixes).
- Created comprehensive test suite with 7 tests covering all required scenarios.
- Tests use temp directories (mkdtemp) for isolation, spawn the server as a subprocess with JSON-RPC over stdin/stdout.
- Polling-dependent tests (channel delivery, lifecycle, error handling) use 10-second timeouts since the poll interval is 2 seconds.
- All 7 tests pass, 36 expect() calls.

### Phase 3: CI Pipeline
- Created `.github/workflows/ci.yml` with single job: checkout, setup-bun, install, lint, test.
- No deviations from plan.

### Phase 4: Update Docs
- Added lint and format commands to CLAUDE.md "Working in This Repo" section.
- Verified `specs/protocol.md` is still accurate. No update needed.

### Deviations
- Branch named `linting-tests-ci-2` instead of `linting-tests-ci` because the original branch name was already in use by another worktree.
- Package.json scripts use `bunx --bun biome` instead of plain `biome` to work around Node.js/Bun architecture mismatch on the dev machine. This is functionally equivalent and works on CI.
- Biome config adapted for v2.x API (the plan referenced v1.x-style config keys that no longer exist in Biome 2.4.8).
