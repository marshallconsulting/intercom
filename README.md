# Intercom

Agent-to-agent messaging for [Claude Code](https://claude.com/claude-code). Send messages between running agents and they arrive in real time as part of the conversation.

```
Agent A:  "Hey CTO, what's the status on the deploy?"
          ↓ send(to: "team-cto", message: "...")
          ↓ writes to team-cto's inbox

Agent B:  <channel source="intercom" from="team-lead" message_id="...">
            Hey CTO, what's the status on the deploy?
          </channel>

          → Agent B sees this as a message in their conversation
          → Replies with the send tool
```

Built on the [MCP channels protocol](https://code.claude.com/docs/en/channels-reference). No database, no external services. Just files on disk and the MCP SDK.

## Why

Claude Code agents are powerful individually. But real work often needs coordination. A CTO agent needs a pipeline update from the CMO. A code reviewer needs to flag something to the architect. A dispatcher needs to route a question to the right specialist.

Intercom gives agents a way to talk to each other without you playing telephone.

## How It Works

Each agent runs the intercom MCP server. The server provides three tools:

| Tool | What it does |
|------|-------------|
| `send` | Send a message to one agent |
| `broadcast` | Send a message to all agents |
| `list_agents` | See who's online |

Messages are JSON files written to the recipient's inbox (`~/.claude/intercom/<agent-id>/inbox/`). The recipient's server polls every 2 seconds and delivers new messages as MCP channel notifications. They show up as `<channel>` tags in the conversation, just like Telegram or Discord messages.

```
~/.claude/intercom/
├── team-cto/
│   ├── info.json        # Agent registration
│   ├── inbox/           # Pending messages
│   └── processed/       # Delivered messages
├── team-cmo/
│   ├── info.json
│   ├── inbox/
│   └── processed/
```

## Quick Start

### 1. Install

```bash
git clone https://github.com/marshallconsulting/intercom.git
cd intercom/source
bun install
```

### 2. Add to your project

Create a `.mcp.json` in your project root (or add to an existing one):

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

### 3. Launch with channels

```bash
claude --dangerously-load-development-channels server:intercom
```

That's it. Your agent can now send and receive messages.

### 4. Test it

Launch two agents in separate terminals with different `CLAUDE_AGENT_ID` values. In Agent A:

> "Send a message to agent-b saying hello"

Agent B will see:

```
<channel source="intercom" from="agent-a" message_id="..." ts="...">
hello
</channel>
```

## Use Cases

**Specialist coordination.** Run a CTO, CMO, and CFO agent. The CTO asks the CMO for a pipeline update. The CMO replies with numbers. The CTO synthesizes and reports back. All without human routing.

**Cross-repo messaging.** The intercom registry lives at `~/.claude/intercom/` (home directory, not per-repo). Agents from different projects can message each other.

**Mobile dispatch.** Add a Telegram bridge and message your agents from your phone. Route questions to the right specialist from anywhere. (See the [telegram-bridge proposal](workflow/proposals/telegram-bridge.md).)

**Autonomous workflows.** Agent A finishes a task and notifies Agent B to start the next step. No human in the loop for handoffs.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Agent A    │     │   File System    │     │   Agent B    │
│              │     │                  │     │              │
│  send(B, m) ─┼────►│  B/inbox/msg.json│     │              │
│              │     │                  │     │              │
│              │     │  poll every 2s  ◄┼─────┤  pollInbox() │
│              │     │                  │     │              │
│              │     │  channel notify ─┼────►│  <channel>   │
│              │     │                  │     │  from="A"    │
└─────────────┘     └──────────────────┘     └─────────────┘
```

- **Transport:** MCP stdio (standard Claude Code MCP server)
- **Channel protocol:** `notifications/claude/channel` (MCP experimental capability)
- **Storage:** JSON files on local filesystem
- **Polling:** 2-second interval
- **Delivery:** At-most-once (delivered messages move to `processed/`)

## What's Next

This repo is built with [Context-Driven Development](CDD.md) (CDD). The `workflow/` folder contains proposals for features that haven't been built yet. Each one is designed to be picked up, planned, and executed using the CDD workflow.

**Ready to build:**

| Proposal | What it adds |
|----------|-------------|
| [Delivery Receipts](workflow/proposals/delivery-receipts.md) | Know if your message was actually received |
| [Telegram Bridge](workflow/proposals/telegram-bridge.md) | Message your agents from your phone |
| [Agent Groups](workflow/proposals/agent-groups.md) | Message subsets of agents by group |
| [Cross-Repo Routing](workflow/proposals/cross-repo-routing.md) | Discover agents across projects |

**How to contribute:**

1. Read [CDD.md](CDD.md) to understand the workflow
2. Pick a proposal from `workflow/proposals/`
3. Accept it, write a plan, execute it
4. Or write your own proposal for something new

**Already built:**

| Plan | What it did |
|------|------------|
| [001: Core Send/Receive](workflow/plans/archived/001-core-send-receive.md) | The foundation. Send, broadcast, list, inbox polling. |

## Context-Driven Development

This project uses CDD, a methodology for building software with AI agents. The key idea: instead of giving agents massive prompts or fine-tuning, you give them well-written context (specs, plans, schemas) and let them make informed decisions.

```
Idea → Proposal → Accept → Plan → Audit → Execute → Archive
```

Every feature in this repo went through this pipeline. The `workflow/` folder is the living record. Archived plans show how things were built. Open proposals show what's next. The specs are the domain authority.

Read [CDD.md](CDD.md) for the full methodology.

## Requirements

- [Bun](https://bun.sh/) runtime
- [Claude Code](https://claude.com/claude-code) v2.1.80+ (channels support)
- MCP SDK (`@modelcontextprotocol/sdk`)

## License

Apache 2.0
