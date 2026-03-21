# Setup

How to install and configure intercom for Claude Code.

## Installation

Clone the repo and run the installer:

```bash
git clone https://github.com/marshallconsulting/intercom.git
cd intercom
bin/install
```

The installer:
1. Runs `bun install` in `source/` to ensure dependencies are present
2. Adds an `intercom` entry to `~/.claude/.mcp.json` (the global MCP config)
3. Uses the absolute path to `source/intercom.ts` based on where you cloned the repo

Re-running `bin/install` is safe. It updates the path if the repo has moved and preserves all other MCP server entries.

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

## Agent ID

Each agent is identified by `CLAUDE_AGENT_ID`. This determines:
- The agent's inbox directory (`~/.claude/intercom/<agent-id>/inbox/`)
- The `from` field on outgoing messages
- How other agents address messages to this agent

Set it by exporting the environment variable before launching Claude Code:

```bash
export CLAUDE_AGENT_ID=team-cto
claude
```

If not set, it defaults to `"unknown"`. That's fine for casual use. The agent can still send messages, receive broadcasts, and call `list_agents`. It just won't have a meaningful identity for others to reply to.

Launcher scripts typically set `CLAUDE_AGENT_ID` automatically. The global MCP config does not set it because the ID varies per session.

## Tools Available After Setup

Once configured, every Claude Code session has these tools:

| Tool | Purpose |
|------|---------|
| `send` | Send a message to one agent by ID |
| `broadcast` | Send a message to all registered agents |
| `list_agents` | See which agents are currently registered |

Messages arrive in the recipient's conversation as `<channel>` tags, delivered in real time via the MCP channels protocol.
