# Plan: Agent Heartbeat and Online/Offline Status

**Goal:** Add heartbeat-based liveness detection so `list_agents` shows online/offline status and `send` warns when the target appears offline.

**Proposal:** [workflow/proposals/accepted/2026-03-21-agent-heartbeat.md](../proposals/accepted/2026-03-21-agent-heartbeat.md)

### Revision Log

| Date | What Changed |
|------|-------------|
| 2026-03-21 18:20 UTC | Plan created from accepted proposal. |
| 2026-03-21 18:21 UTC | Readiness audit: all clear, ready for execution. |

## Why This Matters

`list_agents` currently shows every agent that ever registered. There's no way to tell if an agent is actively running or if you're messaging a dead inbox.

## Acceptance Criteria

- [x] Running agent writes `heartbeat.json` to its directory every poll cycle
- [x] `heartbeat.json` contains a single timestamp, overwritten each cycle (no growth)
- [x] `list_agents` shows `(online)` or `(offline)` next to each agent
- [x] `send` delivers message regardless of status, but response includes "Agent appears offline" when target heartbeat is stale (>10s)
- [x] Agents without a heartbeat file show as `(unknown)` rather than erroring
- [x] `bun test` passes

## Phase 1: Heartbeat Writer

**Files:** `source/intercom.ts`

**Changes:**
- In `pollInbox()` (line 247), add a `writeFile` call at the top of the `while (true)` loop that writes `{ "ts": <Date.now()> }` to `~/.claude/intercom/<agent-id>/heartbeat.json`
- This overwrites the file each cycle (no append, no growth)
- Define `HEARTBEAT_STALE_MS = 10_000` constant near the other constants (line 33-40)

## Phase 2: Online/Offline in `list_agents`

**Files:** `source/intercom.ts`

**Changes:**
- Add a helper function `getAgentStatus(agentId: string): Promise<'online' | 'offline' | 'unknown'>` that:
  - Reads `~/.claude/intercom/<agentId>/heartbeat.json`
  - If file missing: return `'unknown'`
  - If `Date.now() - ts < HEARTBEAT_STALE_MS`: return `'online'`
  - Otherwise: return `'offline'`
- Update `listAgents()` (line 183) to call `getAgentStatus()` for each agent and include the status in the output, e.g. `  agent-a (online)` or `  agent-b (offline)`
- Current agent still shows `(this agent)` - append status after it if desired, or leave as-is since it's always online by definition

## Phase 3: Offline Warning on `send`

**Files:** `source/intercom.ts`

**Changes:**
- In `sendMessage()` (line 142), after writing the message file, check `getAgentStatus(targetId)`
- If offline or unknown, change the response text from `Sent to ${targetId}` to `Sent to ${targetId}. Agent appears offline — message queued in their inbox.`
- Message is always delivered regardless of status

## Phase 4: Spec Update

**Files:** `specs/protocol.md`

**Changes:**
- In "Agent Lifecycle" section, replace the "Deregistration" paragraph (line 43: "No explicit deregistration. Stale agents remain...") with heartbeat semantics: agent writes `heartbeat.json` each poll cycle, considered online if <10s old
- In "Storage Layout" (line 52), add `heartbeat.json` to the example tree under each agent directory
- In `list_agents` tool description (line 28), note that it shows online/offline status

## Phase 5: Tests

**Files:** `source/test/` (new or existing test files)

**Changes:**
- Test that `getAgentStatus` returns `'unknown'` when no heartbeat file exists
- Test that `getAgentStatus` returns `'online'` for a fresh heartbeat
- Test that `getAgentStatus` returns `'offline'` for a stale heartbeat (ts older than 10s)

## What Does NOT Change

- Message format and delivery semantics
- Inbox/processed folder structure
- Registration via `info.json`
- `broadcast` behavior (still sends to all registered agents)

## Readiness Audit

### Audit Log

| Timestamp | Verdict | Summary |
|-----------|---------|---------|
| 2026-03-21 18:21 UTC | READY FOR AUTONOMOUS EXECUTION | All files exist, no dependencies needed, no open questions, spec update phase included. |

### Verdict: READY FOR AUTONOMOUS EXECUTION

Simple feature touching one source file and one spec. No new dependencies, no external APIs, no data requirements. Existing test infrastructure supports all needed test patterns.

### Input Data

| Input | Status | Notes |
|-------|--------|-------|
| No external data required | N/A | All test data is created inline using temp directories and the existing `spawnServer`/`registerAgent` helpers in `source/test/intercom.test.ts` |

### Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `bun` | Installed | v1.3.11 |
| `@modelcontextprotocol/sdk` | Installed | In `source/package.json` |
| `node:fs/promises` (writeFile, readFile, stat) | Built-in | Already used throughout `intercom.ts` |

### Open Questions

| # | Question | Blocking? | Notes |
|---|----------|-----------|-------|
| 1 | Should `(this agent)` also show `(online)`? | No | Agent can decide during execution. The current agent is online by definition, showing both labels is redundant. Keep `(this agent)` alone. |
| 2 | Should `broadcast` skip offline agents? | No | Proposal says no: broadcast still sends to all registered agents. Message queues in inbox regardless. |

### POC Gaps

| # | Assumption | Suggested POC |
|---|-----------|---------------|
| None | All operations use `writeFile` (overwrite) and `readFile` + `JSON.parse`, which are already proven patterns in this codebase | N/A |

### Pre-Work

None required. All prerequisites are in place.

### Blockers

None identified.

## Execution Notes

Executed autonomously on 2026-03-21. All five phases completed in order.

**Phase 1 -- Heartbeat Writer:** Added `HEARTBEAT_STALE_MS = 10_000` constant and a single `writeFile` call at the top of the `pollInbox()` loop. Each cycle overwrites `heartbeat.json` with `{ ts: Date.now() }`. No growth, no append.

**Phase 2 -- Online/Offline in list_agents:** Added `getAgentStatus()` helper that reads `heartbeat.json` and returns `'online'`, `'offline'`, or `'unknown'`. Updated `listAgents()` to show status in parentheses next to each agent. Current agent keeps `(this agent)` label only (online by definition).

**Phase 3 -- Offline Warning on send:** After writing the message file, `sendMessage()` checks `getAgentStatus(targetId)`. If not online, the response includes "Agent appears offline -- message queued in their inbox." Message is always delivered regardless.

**Phase 4 -- Spec Update:** Replaced the "Deregistration" placeholder in `specs/protocol.md` with heartbeat semantics. Added `heartbeat.json` to the storage layout diagram. Updated `list_agents` and `send` tool descriptions.

**Phase 5 -- Tests:** Added four new tests: heartbeat file creation, list_agents status display (online/offline/unknown), send offline warning for unknown targets, and clean response for online targets. All 11 tests pass (7 original + 4 new).

**Final verification:** `bun test` passes (11/11), `bun run lint` passes clean. No changes outside the repo.
