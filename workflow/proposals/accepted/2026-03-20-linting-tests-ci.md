# Proposal: Linting, Tests, and CI

**Status:** Accepted (2026-03-20)

## Problem

The intercom MCP server has zero automated quality checks. No linter, no tests, no CI pipeline. The server works (manually verified), but there's nothing preventing regressions or catching code quality issues. For a showcase repo that demonstrates CDD methodology, this is a gap. People cloning this repo should see a project that takes quality seriously.

## Proposed Change

Add three things:

1. **Linter** - Biome for TypeScript linting and formatting. Fast, zero-config, single dependency.
2. **Tests** - Bun test suite covering the core MCP server functionality: initialization, send, broadcast, list_agents, inbox polling, channel delivery, and message lifecycle (inbox -> processed).
3. **CI** - GitHub Actions workflow that runs lint and tests on push and PR.

## What Changes

- `source/package.json` - Add Biome dev dependency, add `lint` and `format` scripts
- `source/biome.json` - Biome configuration
- `source/test/intercom.test.ts` - Test suite for the MCP server
- `.github/workflows/ci.yml` - GitHub Actions pipeline (lint + test)
- `CLAUDE.md` - Update "Working in This Repo" section with lint/test commands

## What Doesn't Change

- `source/intercom.ts` - No functional changes to the server itself (lint fixes only if needed)
- Delivery semantics, message format, polling behavior - all stay the same
- No new runtime dependencies

## Design Principles

- **Keep it simple.** Biome over ESLint+Prettier (one tool, not three). Bun's built-in test runner, not Jest or Vitest.
- **Test real behavior.** Tests should exercise the actual MCP server through JSON-RPC, not mock internals. Same approach we used for manual verification.
- **CI should be fast.** Bun install + lint + test should complete in under 30 seconds.
- **No over-engineering.** No coverage thresholds, no matrix builds, no deploy steps. Just lint and test on push.
