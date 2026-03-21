#!/usr/bin/env bun

/**
 * Intercom — Agent-to-agent messaging for Claude Code
 *
 * MCP channel server that lets Claude Code agents send messages to each other.
 * Messages arrive as <channel> tags, just like Telegram or Discord messages.
 *
 * Config: Set CLAUDE_AGENT_ID env var to identify this agent.
 * Storage: ~/.claude/intercom/<agent-id>/inbox/ for pending messages
 *
 * https://github.com/marshallconsulting/intercom
 */

import { existsSync } from 'node:fs'
import {
  mkdir,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const INTERCOM_DIR = join(homedir(), '.claude', 'intercom')
const AGENT_ID =
  process.env.CLAUDE_AGENT_ID || process.env.AGENT_ID || 'unknown'
const POLL_INTERVAL_MS = 2000

// --- MCP Server Setup ---

const mcp = new Server(
  { name: 'intercom', version: '0.1.0' },
  {
    capabilities: {
      experimental: { 'claude/channel': {} },
      tools: {},
    },
    instructions: [
      `Messages from other agents arrive as <channel source="intercom" from="agent-id" message_id="...">`,
      `You are agent "${AGENT_ID}". Reply with the send tool, passing the sender's ID as "to".`,
      `Use broadcast to message all agents. Use list_agents to see who's online.`,
    ].join('\n'),
  },
)

// --- Tools ---

mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'send',
      description: 'Send a message to another agent',
      inputSchema: {
        type: 'object' as const,
        properties: {
          to: {
            type: 'string',
            description: 'Target agent ID (e.g. team-cto)',
          },
          message: { type: 'string', description: 'Message to send' },
        },
        required: ['to', 'message'],
      },
    },
    {
      name: 'broadcast',
      description: 'Send a message to all registered agents',
      inputSchema: {
        type: 'object' as const,
        properties: {
          message: { type: 'string', description: 'Message to broadcast' },
        },
        required: ['message'],
      },
    },
    {
      name: 'list_agents',
      description: 'List all registered agents',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
  ],
}))

mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params
  const a = args as Record<string, string>

  switch (name) {
    case 'send':
      return await sendMessage(a.to, a.message)
    case 'broadcast':
      return await broadcastMessage(a.message)
    case 'list_agents':
      return await listAgents()
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
})

// --- Message Operations ---

interface IntercomMessage {
  id: string
  from: string
  to: string
  message: string
  ts: string
}

async function sendMessage(targetId: string, message: string) {
  const inbox = join(INTERCOM_DIR, targetId, 'inbox')
  await mkdir(inbox, { recursive: true })

  const msgId = `${Date.now()}-${AGENT_ID}`
  const msg: IntercomMessage = {
    id: msgId,
    from: AGENT_ID,
    to: targetId,
    message,
    ts: new Date().toISOString(),
  }

  await writeFile(join(inbox, `${msgId}.json`), JSON.stringify(msg, null, 2))

  return {
    content: [{ type: 'text' as const, text: `Sent to ${targetId}` }],
  }
}

async function broadcastMessage(message: string) {
  const agents = await getRegisteredAgents()
  const targets = agents.filter((a) => a.agent_id !== AGENT_ID)

  for (const agent of targets) {
    await sendMessage(agent.agent_id, message)
  }

  const names = targets.map((a) => a.agent_id).join(', ')
  return {
    content: [
      {
        type: 'text' as const,
        text: targets.length
          ? `Broadcast to ${targets.length} agents: ${names}`
          : 'No other agents registered',
      },
    ],
  }
}

async function listAgents() {
  const agents = await getRegisteredAgents()

  if (!agents.length) {
    return {
      content: [{ type: 'text' as const, text: 'No agents registered' }],
    }
  }

  const lines = agents.map((a) => {
    const status = a.agent_id === AGENT_ID ? '(this agent)' : ''
    return `  ${a.agent_id} ${status}`.trimEnd()
  })

  return {
    content: [
      {
        type: 'text' as const,
        text: `Registered agents:\n${lines.join('\n')}`,
      },
    ],
  }
}

// --- Agent Registry ---

interface AgentInfo {
  agent_id: string
  registered_at: string
}

async function getRegisteredAgents(): Promise<AgentInfo[]> {
  const agents: AgentInfo[] = []
  if (!existsSync(INTERCOM_DIR)) return agents

  const entries = await readdir(INTERCOM_DIR, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const infoPath = join(INTERCOM_DIR, entry.name, 'info.json')
    if (existsSync(infoPath)) {
      try {
        const info = JSON.parse(await readFile(infoPath, 'utf-8'))
        agents.push(info)
      } catch {
        // skip corrupted entries
      }
    }
  }
  return agents
}

async function register() {
  const agentDir = join(INTERCOM_DIR, AGENT_ID)
  await mkdir(join(agentDir, 'inbox'), { recursive: true })

  const info: AgentInfo = {
    agent_id: AGENT_ID,
    registered_at: new Date().toISOString(),
  }
  await writeFile(join(agentDir, 'info.json'), JSON.stringify(info, null, 2))
}

// --- Inbox Polling ---

async function pollInbox() {
  const inbox = join(INTERCOM_DIR, AGENT_ID, 'inbox')
  const processed = join(INTERCOM_DIR, AGENT_ID, 'processed')
  await mkdir(processed, { recursive: true })

  while (true) {
    try {
      const files = await readdir(inbox)
      const jsonFiles = files.filter((f) => f.endsWith('.json')).sort()

      for (const file of jsonFiles) {
        const filePath = join(inbox, file)
        try {
          const msg: IntercomMessage = JSON.parse(
            await readFile(filePath, 'utf-8'),
          )

          // Deliver as channel notification
          await mcp.notification({
            method: 'notifications/claude/channel',
            params: {
              content: msg.message,
              meta: {
                from: msg.from,
                to: msg.to,
                message_id: msg.id,
                ts: msg.ts,
              },
            },
          })

          // Move to processed
          await rename(filePath, join(processed, file))
        } catch (_e) {
          // If we can't process a message, delete it to avoid infinite loops
          try {
            await unlink(filePath)
          } catch {}
        }
      }
    } catch {
      // inbox might not exist yet, that's fine
    }

    await Bun.sleep(POLL_INTERVAL_MS)
  }
}

// --- Main ---

await register()
console.error(`[intercom] agent=${AGENT_ID} ready`)

await mcp.connect(new StdioServerTransport())

// Start polling after connection is established
pollInbox().catch((e) => console.error(`[intercom] Poll error:`, e))
