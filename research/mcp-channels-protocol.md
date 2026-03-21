# MCP Channels Protocol

Research on Claude Code's channel notification system, the foundation that Intercom builds on.

**Last updated:** 2026-03-20

## What It Is

The MCP channels protocol is a mechanism for MCP servers to push real-time notifications into a running Claude Code conversation. Unlike standard MCP tools (which the agent calls and gets a response), channels deliver unsolicited messages that appear as `<channel>` tags in the conversation context.

This is the same mechanism that powers the Telegram plugin, Discord integrations, and other external message sources in Claude Code.

## How It Works

### Server Declaration

An MCP server declares channel support in its capabilities during initialization:

```typescript
const server = new Server(
  { name: 'my-server', version: '0.1.0' },
  {
    capabilities: {
      experimental: { 'claude/channel': {} },
      tools: {},
    },
  },
)
```

The `experimental` key indicates this is a research preview feature. The capability name is `claude/channel`.

### Sending a Notification

The server pushes messages using the `notifications/claude/channel` method:

```typescript
await server.notification({
  method: 'notifications/claude/channel',
  params: {
    content: 'The message text',
    meta: {
      from: 'sender-name',
      // ... any additional metadata
    },
  },
})
```

### How Claude Code Renders It

Claude Code receives the notification and renders it as a `<channel>` tag in the conversation:

```xml
<channel source="server-name" from="sender-name" message_id="...">
The message text
</channel>
```

The agent sees this inline in its conversation, similar to how a human would see a new message in a chat app. The agent can then decide how to respond (use a tool, reply, ignore, etc.).

### Loading Channel Servers

Channel servers are loaded with the `--dangerously-load-development-channels` flag:

```bash
claude --dangerously-load-development-channels server:my-server
```

This is separate from normal MCP server loading (`--mcp` or `.mcp.json`) because channel servers have elevated capabilities. They can inject content into the conversation at any time, not just in response to tool calls.

## Key Design Properties

- **Push, not pull.** The server sends notifications whenever it wants. The agent doesn't poll for them. This is what makes real-time messaging possible.
- **Unstructured content.** The `content` field is a string. No schema, no required fields beyond that. The `meta` object is freeform.
- **Server-identified.** The `source` attribute in the rendered tag comes from the server's declared name. This lets the agent know which system sent the message.
- **No acknowledgment.** There's no built-in ack/nack from the agent. The server fires the notification and moves on. (This is why Intercom implements at-most-once delivery.)

## What This Means for Intercom

Intercom uses the channels protocol as its delivery layer. When Agent A sends a message to Agent B:

1. The message is written to B's inbox as a file (standard filesystem operation)
2. B's MCP server polls the inbox and finds the message
3. B's server sends a `notifications/claude/channel` notification
4. Claude Code renders it as a `<channel>` tag in B's conversation

The file-based inbox is the transport. The channels protocol is the delivery to the agent's conversation. This two-layer design means Intercom doesn't need the sender and receiver to be connected. Agent A just writes a file. Agent B's server picks it up whenever it's running.

## Competitive Implications

Most other multi-agent coordination tools (MCP Agent Mail, Agent Collab MCP, CrewAI) use tool-call polling: the agent periodically calls a "check messages" tool to see if anything new arrived. This works but has two drawbacks:

1. **Latency.** The agent only checks when it decides to. Could be seconds, could be minutes.
2. **Context cost.** Every poll is a tool call that costs tokens and a conversation turn.

Channels solve both: the message arrives immediately and appears in the conversation without the agent doing anything. The agent doesn't need to remember to check. This is the core differentiator.

## Open Questions

- **Stability.** The protocol is marked `experimental`. Could change or be removed. No stability guarantees from Anthropic yet.
- **Rate limiting.** Unknown if there are limits on notification frequency. Intercom's 2-second poll interval is conservative.
- **Multi-server channels.** What happens if multiple channel servers send notifications simultaneously? Ordering behavior is undocumented.
- **Plugin vs. server.** Claude Code has both "plugins" (loaded via `--channels plugin:name`) and channel servers (loaded via `--dangerously-load-development-channels server:name`). The plugin path may become the stable API while the server path stays experimental.

## Sources

- Claude Code documentation (channels research preview, March 2026)
- MCP SDK source: `@modelcontextprotocol/sdk` npm package
- Observed behavior from building and running Intercom
- Claude Code GitHub issues (particularly #30140 on agent team coordination)
