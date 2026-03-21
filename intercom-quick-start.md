# Quick Start

Intercom is messaging between agents, so you need at least two. That could be two agents in different repos, or two agents in the same repo with different IDs. Either way, you'll run through the setup below for each one. One terminal per agent, each with its own `INTERCOM_AGENT_ID`.

Two paths depending on who's reading this.

## For Humans

You have two options:

1. **Let your agent do it.** Point your agent at this file and it will handle the install. See the "For Agents" section at the bottom.
2. **Do it yourself.** Follow the steps below.

### Install

```bash
git clone https://github.com/marshallconsulting/intercom.git
cd intercom
bin/install /path/to/your/project
```

The installer does three things:
1. Runs `bun install` in `source/` for dependencies
2. Registers intercom in `~/.claude/.mcp.json` (global MCP config) so the tools are available everywhere
3. Creates or updates `.mcp.json` in the target project so real-time channel delivery works there

Pass the path to whatever project you want to add intercom to. If you omit it, it defaults to the current directory. Run it again for each project you want intercom in:

```bash
bin/install ~/data/my-app
bin/install ~/data/another-project
```

Re-running is safe (idempotent). If you move the intercom repo, re-run to update the paths.

**Important:** Add `.mcp.json` to your project's `.gitignore`. The generated config contains absolute paths that are machine-specific, so it shouldn't be committed. Same pattern as `.env`.

### Start a Session

Navigate to your project, set your agent identity, and launch:

```bash
cd /path/to/your/project
export INTERCOM_AGENT_ID=my-agent
claude --dangerously-load-development-channels server:intercom
```

The `--dangerously-load-development-channels` flag enables real-time channel notifications. Without it, the tools (send, list_agents) still work, but incoming messages won't be delivered into the conversation.

You'll see a warning prompt asking you to confirm this is for local development. Select "I am using this for local channel development" and press Enter. This is expected. Intercom runs locally on your machine, not from the internet.

The agent ID determines the inbox directory (`~/.claude/intercom/<agent-id>/inbox/`), the `from` field on outgoing messages, and how other agents address this agent. Without it, the agent defaults to `"unknown"`, which is fine for casual use.

**Tip:** If you want a stable agent ID for a project without remembering the export every time, add it to the project's `.mcp.json`:

```json
{
  "mcpServers": {
    "intercom": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/intercom/source/intercom.ts"],
      "env": {
        "INTERCOM_AGENT_ID": "my-app-dev"
      }
    }
  }
}
```

Then you can just launch with `claude --dangerously-load-development-channels server:intercom` and the agent ID is set automatically.

### Use

Once configured, every Claude Code session has these tools:

| Tool | Purpose |
|------|---------|
| `send` | Send a message to one agent by ID |
| `broadcast` | Send a message to all registered agents |
| `list_agents` | See which agents are currently registered |

Messages arrive as `<channel>` tags in the receiving agent's conversation.

### Manual Setup

If you prefer not to use the installer, add the entry to your MCP config by hand. If you already have a `.mcp.json` with other servers, merge the `intercom` entry into your existing `mcpServers` object. Don't replace the whole file.

#### Global (all sessions)

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

#### Per-repo (one project only)

Create `.mcp.json` in the project root:

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

The per-repo config is what enables `--dangerously-load-development-channels` to find the server. You can optionally add an `env` block to set a stable agent ID for this project:

```json
"env": {
  "INTERCOM_AGENT_ID": "my-app-dev"
}
```

This saves you from exporting the variable every launch.

---

## For Agents

If you're an agent and a human pointed you here to set up intercom, follow these steps:

1. **Prerequisites.** The installer needs `bun` and `jq`. Check that both are installed (`which bun jq`). If either is missing, tell the user.

2. **Find the intercom repo.** You're reading this file, so you already know the path. The repo root is the directory containing this file. If you can't determine it, ask the user.

3. **Run the installer.** Pass your current working directory as the target:
   ```bash
   /path/to/intercom/bin/install /path/to/this/repo
   ```
   This installs dependencies, registers the global MCP config, and creates `.mcp.json` in this repo. Make sure `.mcp.json` is in the project's `.gitignore` (it contains absolute paths).

4. **Ask the user what their agent ID should be.** This is the name other agents will use to message them. Suggest something based on the repo name or their role (e.g., `my-app-dev`, `team-cto`, `marshall-main`). Then offer two options:
   - **Quick start:** Export it for this session and launch. Good for trying things out.
     ```
     export INTERCOM_AGENT_ID=<their-chosen-id>
     claude --dangerously-load-development-channels server:intercom
     ```
   - **Persistent:** Write it into the project's `.mcp.json` env block so it's set every launch.
     ```json
     "env": { "INTERCOM_AGENT_ID": "<their-chosen-id>" }
     ```
   They'll see a warning prompt about development channels. They should select "I am using this for local channel development."

5. **After restart.** You will have three tools: `send`, `broadcast`, and `list_agents`. Incoming messages from other agents arrive as `<channel>` tags in your conversation. Reply with `send`.
