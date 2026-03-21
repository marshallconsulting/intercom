# Conventions

## Code

- **Single-file server.** `source/intercom.ts` is the entire MCP server. Keep it that way. Don't split into modules until the file becomes genuinely hard to navigate. One file is easier for agents to read and reason about.
- **No external services.** Intercom is file-based by design. No databases, no Redis, no HTTP calls. If a feature can't be done with the filesystem and the MCP SDK, it probably doesn't belong here.
- **Use `node:fs/promises`**, not sync fs operations. The poll loop is async and must not block.
- **Graceful degradation over errors.** Missing files, corrupt JSON, stale data: handle them silently. A missing heartbeat is "unknown," not a crash. A corrupt inbox message gets deleted, not retried forever.
- **Constants at the top.** `INTERCOM_DIR`, `AGENT_ID`, `POLL_INTERVAL_MS`, `HEARTBEAT_STALE_MS`. All config lives as constants near the top of the file.

## TDD

- **Write tests early, not last.** When adding a new feature, write the test alongside the implementation, not as a cleanup step after everything works. Tests written after the fact tend to just confirm what the code already does rather than defining what it should do.
- **Bug fix? Failing test first.** When fixing a bug, write a test that reproduces it before touching the code. This proves the bug is real, proves the fix works, and prevents regression. If you can't reproduce it in a test, you don't understand it yet.
- **Run tests after every change.** Don't batch up multiple changes and hope they all work. Make a change, run `bun test`, see green, move on. Catching failures immediately is cheaper than debugging a stack of changes.
- **Tests are the safety net for agents.** Agents make confident changes because tests catch mistakes. The more coverage exists, the more aggressively an agent can refactor. Skipping tests to save time costs more time later.

## Testing

- **Tests use temp directories.** Every test suite creates its own `mkdtemp` directory and sets `INTERCOM_DIR` to it. Tests never touch the real `~/.claude/intercom/`.
- **Tests spawn real server processes.** Use the `spawnServer` helper, not mocks. The server is small enough to run as a subprocess in tests. This catches integration issues that mocks would miss.
- **Run `bun test` from `source/`.** Tests live in `source/test/`. Always `cd source && bun test`.
- **Run `bun run lint` before pushing.** Biome is the linter. It's fast. No reason to skip it.

## TypeScript

- **Bun runtime, not Node.** Use `Bun.sleep`, `Bun.spawn`, etc. where Bun provides better APIs.
- **`as const` on object literal types** in MCP tool definitions (e.g., `type: 'object' as const`). Required by the MCP SDK's type system.
- **Prefer `try/catch` with empty catch** for expected failures (file not found, parse error) rather than checking existence first. The filesystem is the source of truth, not `existsSync`.
