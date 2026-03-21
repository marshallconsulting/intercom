# Proposal: Global MCP Server Configuration

**Status:** Draft

## Problem

Intercom currently requires per-repo `.mcp.json` configuration or manual `--dangerously-load-development-channels` flags to load the MCP server. This means every new repo needs setup before agents can message each other. The Marshall repo has its own `.mcp.json` entry pointing to the intercom source. Any new project Doug opens in Claude Code has no intercom access by default.

## Proposed Change

Configure intercom as a global MCP server in `~/.claude.json` under `mcpServers`. One entry, one copy of the server at `~/data/intercom/source/intercom.ts`, available in every Claude Code session automatically.

The `CLAUDE_AGENT_ID` env var continues to be set per-session by launcher scripts. Ad-hoc sessions default to `"unknown"`, which is fine for casual use (they can still receive broadcasts and send messages).

## What Changes

- `~/.claude.json` — Add `intercom` entry to `mcpServers`:
  ```json
  "intercom": {
    "command": "bun",
    "args": ["run", "/Users/doug/data/intercom/source/intercom.ts"],
    "type": "stdio"
  }
  ```
- Marshall repo `.mcp.json` — Remove the per-repo intercom entry (it pointed to `tech/tools/intercom-mcp/intercom.ts`, which is the old POC location)
- `docs/quick-start.md` — Document both setup options: global (`~/.claude.json`) and per-repo (`.mcp.json`)

## What Doesn't Change

- `source/intercom.ts` — No code changes. The server already reads `CLAUDE_AGENT_ID` from env.
- Launcher scripts — They already `export CLAUDE_AGENT_ID=...` before starting Claude Code. The server inherits it from the parent process.
- Message format, delivery, registry — All unchanged.
- Per-repo `.mcp.json` remains a valid option for users who don't want global setup.

## Design Principles

- **Zero-config for Doug's machine.** After this change, any new Claude Code session has intercom. No setup per repo.
- **Don't break per-repo setup.** Global and per-repo configs should coexist. Document both.
- **Agent ID is the session's responsibility.** The global config can't set `CLAUDE_AGENT_ID` because it's different per agent. Launchers handle this.
