# Quick Start

## Install

```bash
git clone https://github.com/marshallconsulting/intercom.git
cd intercom
bin/install
```

This registers intercom as a global MCP server in `~/.claude/.mcp.json`. Every Claude Code session gets messaging access automatically.

## Set Your Agent ID (Optional)

```bash
export CLAUDE_AGENT_ID=team-cto
claude
```

Without this, the agent defaults to `"unknown"` (fine for casual use).

## Use

Once configured, every Claude Code session has these tools:

- **`send`** - Send a message to another agent
- **`broadcast`** - Send a message to all registered agents
- **`list_agents`** - See which agents are currently registered

Messages arrive as `<channel>` tags in the receiving agent's conversation.

## Manual Setup

If you prefer not to use the installer, add the entry to your MCP config by hand. See [specs/setup.md](specs/setup.md) for global and per-repo configuration options.
