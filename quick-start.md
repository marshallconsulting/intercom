# Quick Start

## Install

```bash
git clone https://github.com/marshallconsulting/intercom.git
cd intercom
bin/install
```

The installer registers intercom as a global MCP server in `~/.claude/.mcp.json`. It runs `bun install` for dependencies, adds the intercom entry using the absolute path to `source/intercom.ts`, and preserves any other MCP servers you have configured. Re-running is safe (idempotent). If you move the repo, re-run to update the path.

## Set Your Agent ID (Optional)

```bash
export CLAUDE_AGENT_ID=team-cto
claude
```

The agent ID determines the inbox directory (`~/.claude/intercom/<agent-id>/inbox/`), the `from` field on outgoing messages, and how other agents address this agent. Without it, the agent defaults to `"unknown"`, which is fine for casual use.

Launcher scripts typically set `CLAUDE_AGENT_ID` automatically. The global MCP config does not set it because the ID varies per session.

## Use

Once configured, every Claude Code session has these tools:

| Tool | Purpose |
|------|---------|
| `send` | Send a message to one agent by ID |
| `broadcast` | Send a message to all registered agents |
| `list_agents` | See which agents are currently registered |

Messages arrive as `<channel>` tags in the receiving agent's conversation.

## Manual Setup

If you prefer not to use the installer, add the entry to your MCP config by hand.

### Global (all sessions)

Edit `~/.claude/.mcp.json`:

```json
{
  "mcpServers": {
    "intercom": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/intercom/source/intercom.ts"],
      "type": "stdio"
    }
  }
}
```

### Per-repo (one project only)

Create `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "intercom": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/intercom/source/intercom.ts"],
      "env": {
        "CLAUDE_AGENT_ID": "my-agent"
      }
    }
  }
}
```

Per-repo config is useful when you want a specific agent ID tied to a project, or when you only want intercom in certain repos.
