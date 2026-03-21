# Proposal: Agent Heartbeat and Online/Offline Status

**Status:** Accepted

## Problem

`list_agents` shows all registered agents but doesn't distinguish online vs offline. An agent registered in a previous session still appears even if no Claude Code instance is running for it. You can't tell if you're messaging someone active or shouting into a dead inbox.

## Proposed Change

Add a heartbeat file that each agent updates every poll cycle. Use it to determine online/offline status in `list_agents` and warn on `send` when the target appears offline.

### Heartbeat Mechanism

Each agent writes `heartbeat.json` to its directory (`~/.claude/intercom/<agent-id>/heartbeat.json`) every poll iteration (every 2 seconds). The file contains a timestamp:

```json
{ "ts": 1711036800000 }
```

An agent is considered online if its heartbeat is less than 10 seconds old. Anything older is offline (accounts for slight delays without being too generous).

### Changes to Tools

**`list_agents`:** Show online/offline status next to each agent.

**`send`:** If the target agent's heartbeat is stale, still deliver the message (it queues in their inbox) but include a note in the response: "Message queued. Agent appears offline."

## What Changes

- `source/intercom.ts` - `pollInbox()` writes heartbeat each cycle, `listAgents()` reads heartbeats, `sendMessage()` checks target heartbeat
- `specs/protocol.md` - Document heartbeat semantics

## What Doesn't Change

- Message format and delivery semantics
- Inbox/processed folder structure
- Registration via `info.json`
- `broadcast` behavior (still sends to all registered agents)

## Design Principles

- **Simple.** One file, one timestamp, one threshold. No background processes or cleanup daemons.
- **Graceful degradation.** Missing heartbeat = unknown status, not an error. Old agents without heartbeat support still work.
- **No false positives.** 10-second threshold is generous enough that a busy agent won't flicker offline between polls.
