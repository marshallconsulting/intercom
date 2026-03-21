# Plan 001: Core Send/Receive

**Status:** DONE
**Accepted from:** Initial build
**Executed:** 2026-03-19

## Goal

Build the minimum viable intercom: one agent sends a message, another agent receives it as a `<channel>` tag in their conversation.

## Steps

1. [x] Set up MCP server with channel capability declaration
2. [x] Implement `send` tool (write JSON to target's inbox)
3. [x] Implement `broadcast` tool (send to all registered agents)
4. [x] Implement `list_agents` tool (read agent registry)
5. [x] Implement agent registration (write info.json on startup)
6. [x] Implement inbox polling (2s interval, deliver via channel notification)
7. [x] Move processed messages from inbox/ to processed/
8. [x] Test: send message between two agents, verify delivery

## Result

Working. Tested live with 3 agents (CTO, CMO, CFO) sending messages to each other. Messages arrive as `<channel source="intercom" from="team-cto">` tags. Round-trip confirmed.

## Files Created

- `source/intercom.ts` — MCP channel server (~260 lines)
- `source/package.json` — Dependencies
- `specs/protocol.md` — Protocol specification
- `specs/schemas/message.md` — Message schema

## Decisions Made

- **File-based inbox** over database or network. Simplest thing that works. No dependencies.
- **Poll every 2 seconds** over websockets or file watchers. Reliable, cross-platform.
- **At-most-once delivery.** Delete on failure rather than retry. Avoids infinite loops.
- **No authentication.** Single-user, single-machine. Trust boundary is the OS.
