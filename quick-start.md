# Quick Start

## Install

```bash
cd source && bun install
```

## Configure

Add Intercom to your Claude Code MCP config (`.claude/settings.json` or project settings):

```json
{
  "mcpServers": {
    "intercom": {
      "command": "bun",
      "args": ["run", "/path/to/intercom/source/intercom.ts"],
      "env": {
        "CLAUDE_AGENT_ID": "my-agent"
      }
    }
  }
}
```

## Use

Once configured, the agent has access to:

- **`send`** - Send a message to another agent
- **`list_agents`** - See which agents are currently registered
- **`read_messages`** - Check inbox for messages

Messages arrive as `<channel>` tags in the receiving agent's conversation.
