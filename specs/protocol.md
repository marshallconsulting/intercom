# Intercom Protocol

## Overview

Intercom is a file-based messaging system for Claude Code agents. Messages are JSON files written to per-agent inboxes and delivered via MCP channel notifications.

## Message Flow

1. Sender calls `send` tool with target agent ID and message text
2. Server writes a JSON message file to `~/.claude/intercom/<target>/inbox/<msg-id>.json`
3. Target's MCP server polls its inbox every 2 seconds
4. On finding a new message, server emits `notifications/claude/channel`
5. Claude Code renders the notification as a `<channel>` tag in the conversation
6. Message file moves from `inbox/` to `processed/`

## Tools

### `send`
Send a direct message to one agent. If the target agent appears offline or has no heartbeat, the message is still delivered but the response includes an offline warning.
- `to` (string, required) — Target agent ID
- `message` (string, required) — Message content

### `broadcast`
Send a message to all registered agents (except self).
- `message` (string, required) — Message content

### `list_agents`
List all registered agents with online/offline status. Each agent is shown as `(online)`, `(offline)`, or `(unknown)` based on its heartbeat. The current agent is labeled `(this agent)` instead.

## Agent Lifecycle

### Registration
On startup, the MCP server:
1. Creates `~/.claude/intercom/<agent-id>/inbox/` if it doesn't exist
2. Writes `~/.claude/intercom/<agent-id>/info.json` with agent metadata
3. Begins polling the inbox

### Discovery
Any agent can call `list_agents` to see all registered agents. Registration persists across sessions (info.json stays until cleaned up).

### Heartbeat
Each poll cycle, the agent writes `heartbeat.json` to its directory with the current timestamp. An agent is considered **online** if its heartbeat is less than 10 seconds old, **offline** if older, and **unknown** if no heartbeat file exists (e.g., agents registered before heartbeat support). There is no explicit deregistration. Registration persists via `info.json`; liveness is determined solely by the heartbeat.

## Delivery Semantics

- **At-most-once delivery.** Messages are moved to `processed/` after the channel notification is sent. If the notification fails, the message is deleted to avoid infinite retry loops.
- **No ordering guarantees.** Messages are sorted by filename (timestamp-based) within a single poll cycle, but cross-agent ordering is not guaranteed.
- **No persistence after delivery.** Once delivered, messages exist only in `processed/` as history. The recipient's conversation context is the authoritative record.

## Storage Layout

```
~/.claude/intercom/
├── agent-a/
│   ├── info.json           # { agent_id, registered_at }
│   ├── heartbeat.json      # { ts: <epoch ms> } -- written every poll cycle
│   ├── inbox/              # Pending messages (JSON files)
│   │   └── 1234-agent-b.json
│   └── processed/          # Delivered messages (moved here)
│       └── 1200-agent-c.json
├── agent-b/
│   ├── info.json
│   ├── heartbeat.json
│   ├── inbox/
│   └── processed/
```

## Message Schema

```typescript
interface IntercomMessage {
  id: string        // Unique ID: `${timestamp}-${sender-agent-id}`
  from: string      // Sender agent ID
  to: string        // Recipient agent ID
  message: string   // Message content (plain text)
  ts: string        // ISO 8601 timestamp
}
```

## Security Model

- **No authentication.** Any process that can write to `~/.claude/intercom/` can send messages. This is appropriate for a single-user, local-machine setup.
- **No encryption.** Messages are plaintext JSON on the local filesystem.
- **Trust boundary is the machine.** All agents on the same machine are trusted.
