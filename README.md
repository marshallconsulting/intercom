# Intercom

This repo serves two purposes:

**1. Intercom is a working tool.** Agent-to-agent messaging for [Claude Code](https://claude.com/claude-code). If you have agents that need to coordinate, intercom lets them send messages to each other in real time. One agent sends, the other receives it as part of their conversation. No database, no external services, just files on disk and the MCP SDK.

**2. This repo is a showcase for [Context-Driven Development](CDD.md) (CDD).** Every feature was proposed, planned, audited, and executed using the CDD workflow. The `workflow/` folder is the living record. The skills, specs, playbook, and archived plans demonstrate the methodology in practice. If you're here to learn about CDD, read [CDD.md](CDD.md) and then browse the repo to see how it all fits together.

---

## Intercom: Agent-to-Agent Messaging

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

### Origin

We had a primitive version of agent-to-agent messaging at Marshall using tmux and keystrokes to pipe text between terminals. It worked, barely. Then [this post from @trq212](https://x.com/trq212/status/2034761016320696565) showed what was possible with MCP channels, and it unlocked the idea of systematic, protocol-based messaging between agents on the same machine. Intercom is the result.

### Why

Claude Code agents are powerful individually. But real work often needs coordination. A CTO agent needs a pipeline update from the CMO. A code reviewer needs to flag something to the architect. A dispatcher needs to route a question to the right specialist.

Intercom gives agents a way to talk to each other without you playing telephone.

### How It Works

Each agent runs the intercom MCP server. The server provides three tools:

| Tool | What it does |
|------|-------------|
| `send` | Send a message to one agent |
| `broadcast` | Send a message to all agents |
| `list_agents` | See who's online |

Messages are JSON files written to the recipient's inbox (`~/.claude/intercom/<agent-id>/inbox/`). The recipient's server polls every 2 seconds and delivers new messages as MCP channel notifications. They show up as `<channel>` tags in the conversation.

### Quick Start

```bash
git clone https://github.com/marshallconsulting/intercom.git
cd intercom
bin/install
```

The installer registers intercom as a global MCP server in `~/.claude/.mcp.json`. Every Claude Code session gets messaging access automatically.

### 2. Set your agent ID (optional)

```bash
export INTERCOM_AGENT_ID=team-cto
claude
```

Without this, the agent defaults to `"unknown"`, which is fine for casual use.

### 3. Test it

Launch two agents in separate terminals with different `CLAUDE_AGENT_ID` values. In Agent A:

> "Send a message to agent-b saying hello"

Agent B will see:

```
<channel source="intercom" from="agent-a" message_id="..." ts="...">
hello
</channel>
```

### Manual setup

If you prefer not to use the installer, see [intercom-quick-start.md](intercom-quick-start.md) for manual global and per-repo configuration options.

## Use Cases

**Specialist coordination.** Run a CTO, CMO, and CFO agent. The CTO asks the CMO for a pipeline update. The CMO replies with numbers. The CTO synthesizes and reports back. All without human routing.

**Cross-repo messaging.** The intercom registry lives at `~/.claude/intercom/` (home directory, not per-repo). Agents from different projects can message each other.

**Autonomous workflows.** Agent A finishes a task and notifies Agent B to start the next step. No human in the loop for handoffs.

### Architecture

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

- **Transport:** MCP stdio
- **Storage:** JSON files on local filesystem
- **Polling:** 2-second interval
- **Delivery:** At-most-once (delivered messages move to `processed/`)

---

## Context-Driven Development

This repo is built with CDD, a methodology for building software with AI agents. The key idea: the repo accumulates context (specs, plans, playbook, research, transcripts) that makes every agent session better. Instead of massive prompts or fine-tuning, you give agents well-written context and let them make informed decisions.

```
proposal -> plan -> source
```

Every feature in this repo went through this pipeline. The `workflow/` folder is the living record. Archived plans show how things were built. Open proposals show what's next. The specs are the domain authority. The playbook captures how to build well.

**Read [CDD.md](CDD.md) for the full methodology.**

### What's in the Repo

| Folder | Purpose |
|--------|---------|
| `specs/` | Domain knowledge: what intercom is and why |
| `workflow/` | Proposals, plans, and decision records |
| `playbook/` | Coding patterns and guardrails |
| `skills/cdd/` | Pipeline skills: accept, audit, execute, reconcile, mutate, nightshift |
| `research/` | External knowledge (MCP channels protocol, etc.) |
| `transcripts/` | Design session records |
| `experiments/` | POCs and throwaway explorations |
| `source/` | The intercom MCP server |

### Open Proposals

| Proposal | What it adds |
|----------|-------------|
| [Delivery Receipts](workflow/proposals/delivery-receipts.md) | Know if your message was actually received |
| [Telegram Bridge](workflow/proposals/telegram-bridge.md) | Message your agents from your phone |
| [Agent Groups](workflow/proposals/agent-groups.md) | Message subsets of agents by group |
| [Cross-Repo Routing](workflow/proposals/cross-repo-routing.md) | Discover agents across projects |

### Contributing

1. Read [CDD.md](CDD.md) to understand the workflow
2. Pick a proposal from `workflow/proposals/`
3. Accept it, write a plan, execute it
4. Or write your own proposal for something new

## Requirements

- [Bun](https://bun.sh/) runtime
- [Claude Code](https://claude.com/claude-code)
- MCP SDK (`@modelcontextprotocol/sdk`)

## License

Apache 2.0
