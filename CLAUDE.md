# Intercom

Agent-to-agent messaging for Claude Code. Uses the MCP channels protocol to deliver messages between running agents in real time.

## What This Is

A lightweight messaging system that lets Claude Code agents talk to each other. One agent sends a message, the other receives it as a `<channel>` tag in their conversation, just like a Telegram or Discord message.

**Use cases:**
- Specialist agents coordinating work (CTO asks CMO for a pipeline update)
- Cross-repo agent communication (agents in different projects messaging each other)
- Broadcast announcements to all running agents
- Mobile dispatch via Telegram bridge (future)

## How It Works

```
Agent A                    File System                   Agent B
   |                          |                            |
   |-- send(to: B, msg) ---->|                            |
   |                     [write to B's inbox]              |
   |                          |                            |
   |                          |--- poll inbox every 2s --->|
   |                          |                            |
   |                          |<-- channel notification ---|
   |                          |   <channel from="A">       |
   |                          |     message content        |
   |                          |   </channel>               |
```

1. Agent A calls the `send` tool with a target agent ID and message
2. Message is written as JSON to the target's inbox (`~/.claude/intercom/<agent-id>/inbox/`)
3. Target's MCP server polls the inbox every 2 seconds
4. Message is delivered as a `notifications/claude/channel` event
5. Target sees it as a `<channel source="intercom" from="agent-a">` tag

## Tech Stack

- TypeScript (Bun runtime)
- MCP SDK (`@modelcontextprotocol/sdk`)
- File-based message storage (no database, no external services)
- MCP channels protocol (`notifications/claude/channel`)

## Repo Structure (CDD)

```
intercom/
├── CDD.md              # Methodology reference
├── CLAUDE.md           # This file
├── quick-start.md      # Setup and configuration instructions
├── bin/
│   └── install         # Installer: registers intercom as global MCP server
├── specs/
│   ├── protocol.md     # Message format, delivery semantics
│   ├── setup.md        # Installation, configuration, agent ID
│   └── sandbox/        # Half-baked spec ideas
├── workflow/
│   ├── proposals/      # Features waiting to be built
│   └── plans/
│       └── archived/   # How existing features were built
├── source/
│   ├── intercom.ts     # The MCP server
│   ├── package.json
│   └── test/
├── skills/
│   └── cdd/            # CDD pipeline skills
│       ├── accept-proposal/
│       ├── audit-plan/
│       ├── execute-plan/
│       └── reconcile/
├── research/           # Distilled external knowledge
├── transcripts/        # Cleaned design session records
├── docs/               # GitHub Pages site (public-facing content)
└── experiments/        # POCs and throwaway explorations
```

## Working in This Repo

```bash
# First-time setup: register intercom as a global MCP server
bin/install

# Install dependencies (also done by bin/install)
cd source && bun install

# Run the server (normally launched by Claude Code, not manually)
CLAUDE_AGENT_ID=my-agent bun run source/intercom.ts

# Run tests
cd source && bun test
```

## Key Concepts

- **Agent ID** — Unique identifier (e.g., `team-cto`, `project-a-builder`). Set via `CLAUDE_AGENT_ID` env var.
- **Inbox** — Per-agent directory at `~/.claude/intercom/<agent-id>/inbox/`. Messages are JSON files.
- **Registry** — Agent writes `info.json` on startup. `list_agents` reads all registrations.
- **Channel delivery** — Messages arrive as MCP channel notifications, rendered as `<channel>` tags.
- **Processed** — After delivery, messages move from `inbox/` to `processed/` for history.
