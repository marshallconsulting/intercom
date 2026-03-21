import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Subprocess } from 'bun'

// --- Helpers ---

const SERVER_PATH = join(import.meta.dir, '..', 'intercom.ts')

interface JsonRpcResponse {
  jsonrpc: string
  id: number
  result?: Record<string, unknown>
  error?: { code: number; message: string }
}

/**
 * Spawn the intercom server as a subprocess with JSON-RPC over stdin/stdout.
 * Returns helpers to send requests, read output, and kill the process.
 */
function spawnServer(
  intercomDir: string,
  agentId: string,
): {
  proc: Subprocess
  send: (method: string, params?: Record<string, unknown>, id?: number) => void
  readResponse: () => Promise<JsonRpcResponse>
  readAllOutput: (timeoutMs?: number) => Promise<string>
  kill: () => void
} {
  const proc = Bun.spawn(['bun', 'run', SERVER_PATH], {
    env: {
      ...process.env,
      INTERCOM_DIR: intercomDir,
      CLAUDE_AGENT_ID: agentId,
    },
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  let buffer = ''
  const responseQueue: JsonRpcResponse[] = []
  const waiters: Array<(resp: JsonRpcResponse) => void> = []
  let rawOutput = ''

  // Read stdout continuously and parse JSON-RPC messages
  const reader = proc.stdout.getReader()
  const readLoop = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = new TextDecoder().decode(value)
        rawOutput += text
        buffer += text

        // Parse complete JSON-RPC messages from the buffer.
        // The MCP stdio transport uses newline-delimited JSON.
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const parsed = JSON.parse(trimmed)
            if (waiters.length > 0) {
              const waiter = waiters.shift()
              waiter?.(parsed)
            } else {
              responseQueue.push(parsed)
            }
          } catch {
            // Not JSON, skip
          }
        }
      }
    } catch {
      // Reader closed
    }
  }
  readLoop()

  const send = (
    method: string,
    params?: Record<string, unknown>,
    id?: number,
  ) => {
    const msg = JSON.stringify({
      jsonrpc: '2.0',
      id: id ?? 1,
      method,
      params: params ?? {},
    })
    proc.stdin.write(`${msg}\n`)
  }

  const readResponse = (): Promise<JsonRpcResponse> => {
    if (responseQueue.length > 0) {
      return Promise.resolve(responseQueue.shift() as JsonRpcResponse)
    }
    return new Promise((resolve) => {
      waiters.push(resolve)
    })
  }

  const readAllOutput = async (timeoutMs = 3000): Promise<string> => {
    await Bun.sleep(timeoutMs)
    return rawOutput
  }

  const kill = () => {
    try {
      proc.kill()
    } catch {
      // Already dead
    }
  }

  return { proc, send, readResponse, readAllOutput, kill }
}

/**
 * Initialize the MCP server and return the init response.
 */
async function initializeServer(server: ReturnType<typeof spawnServer>) {
  server.send('initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  })
  const initResp = await server.readResponse()

  // Send initialized notification (no id, no response expected)
  const notif = JSON.stringify({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  })
  server.proc.stdin.write(`${notif}\n`)

  // Give the server a moment to process
  await Bun.sleep(100)

  return initResp
}

/**
 * Write an agent registration (info.json) file.
 */
async function registerAgent(
  intercomDir: string,
  agentId: string,
): Promise<void> {
  const agentDir = join(intercomDir, agentId)
  await mkdir(join(agentDir, 'inbox'), { recursive: true })
  await writeFile(
    join(agentDir, 'info.json'),
    JSON.stringify({
      agent_id: agentId,
      registered_at: new Date().toISOString(),
    }),
  )
}

/**
 * Write a message JSON file into an agent's inbox.
 */
async function placeMessage(
  intercomDir: string,
  targetId: string,
  msg: {
    id: string
    from: string
    to: string
    message: string
    ts: string
  },
): Promise<string> {
  const inbox = join(intercomDir, targetId, 'inbox')
  await mkdir(inbox, { recursive: true })
  const filename = `${msg.id}.json`
  await writeFile(join(inbox, filename), JSON.stringify(msg, null, 2))
  return filename
}

// --- Tests ---

describe('MCP initialization', () => {
  let tmpDir: string
  let server: ReturnType<typeof spawnServer>

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'intercom-test-'))
    server = spawnServer(tmpDir, 'test-agent')
  })

  afterAll(async () => {
    server.kill()
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('responds to initialize with channel capability and server info', async () => {
    const resp = await initializeServer(server)

    expect(resp.jsonrpc).toBe('2.0')
    expect(resp.id).toBe(1)
    expect(resp.result).toBeDefined()

    const result = resp.result as Record<string, unknown>
    expect(result.serverInfo).toEqual({ name: 'intercom', version: '0.1.0' })

    // Check claude/channel capability is present
    const capabilities = result.capabilities as Record<string, unknown>
    const experimental = capabilities.experimental as Record<string, unknown>
    expect(experimental['claude/channel']).toBeDefined()
  })
})

describe('send tool', () => {
  let tmpDir: string
  let server: ReturnType<typeof spawnServer>

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'intercom-test-'))
    server = spawnServer(tmpDir, 'sender-agent')
    await initializeServer(server)
  })

  afterAll(async () => {
    server.kill()
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('sends message and creates inbox file with correct schema', async () => {
    server.send(
      'tools/call',
      {
        name: 'send',
        arguments: { to: 'target-agent', message: 'hello from test' },
      },
      2,
    )
    const resp = await server.readResponse()

    expect(resp.result).toBeDefined()
    const content = resp.result?.content as Array<{
      type: string
      text: string
    }>
    expect(content[0].text).toContain('Sent to target-agent')

    // Verify inbox file
    const inbox = join(tmpDir, 'target-agent', 'inbox')
    const files = await readdir(inbox)
    expect(files.length).toBe(1)
    expect(files[0]).toEndWith('.json')

    const msg = JSON.parse(await readFile(join(inbox, files[0]), 'utf-8'))
    expect(msg.id).toBeDefined()
    expect(msg.from).toBe('sender-agent')
    expect(msg.to).toBe('target-agent')
    expect(msg.message).toBe('hello from test')
    expect(msg.ts).toBeDefined()
  })
})

describe('broadcast tool', () => {
  let tmpDir: string
  let server: ReturnType<typeof spawnServer>

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'intercom-test-'))

    // Register multiple agents
    await registerAgent(tmpDir, 'broadcaster')
    await registerAgent(tmpDir, 'agent-a')
    await registerAgent(tmpDir, 'agent-b')

    server = spawnServer(tmpDir, 'broadcaster')
    await initializeServer(server)
  })

  afterAll(async () => {
    server.kill()
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('sends to all agents except sender', async () => {
    server.send(
      'tools/call',
      { name: 'broadcast', arguments: { message: 'broadcast test' } },
      2,
    )
    const resp = await server.readResponse()

    const content = resp.result?.content as Array<{
      type: string
      text: string
    }>
    expect(content[0].text).toContain('Broadcast to 2 agents')

    // Check agent-a inbox
    const inboxA = join(tmpDir, 'agent-a', 'inbox')
    const filesA = await readdir(inboxA)
    expect(filesA.length).toBe(1)
    const msgA = JSON.parse(await readFile(join(inboxA, filesA[0]), 'utf-8'))
    expect(msgA.from).toBe('broadcaster')
    expect(msgA.message).toBe('broadcast test')

    // Check agent-b inbox
    const inboxB = join(tmpDir, 'agent-b', 'inbox')
    const filesB = await readdir(inboxB)
    expect(filesB.length).toBe(1)

    // Broadcaster's inbox should be empty (no self-send)
    const inboxSender = join(tmpDir, 'broadcaster', 'inbox')
    const filesSender = await readdir(inboxSender)
    expect(filesSender.length).toBe(0)
  })
})

describe('list_agents tool', () => {
  let tmpDir: string
  let server: ReturnType<typeof spawnServer>

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'intercom-test-'))

    await registerAgent(tmpDir, 'my-agent')
    await registerAgent(tmpDir, 'other-agent')

    server = spawnServer(tmpDir, 'my-agent')
    await initializeServer(server)
  })

  afterAll(async () => {
    server.kill()
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('lists all agents with self marked as (this agent)', async () => {
    server.send('tools/call', { name: 'list_agents', arguments: {} }, 2)
    const resp = await server.readResponse()

    const content = resp.result?.content as Array<{
      type: string
      text: string
    }>
    const text = content[0].text

    expect(text).toContain('my-agent')
    expect(text).toContain('other-agent')
    expect(text).toContain('(this agent)')

    // "(this agent)" should appear next to my-agent, not other-agent
    const lines = text.split('\n')
    const myLine = lines.find((l: string) => l.includes('my-agent'))
    const otherLine = lines.find((l: string) => l.includes('other-agent'))
    expect(myLine).toContain('(this agent)')
    expect(otherLine).not.toContain('(this agent)')
  })
})

describe('inbox polling and channel delivery', () => {
  let tmpDir: string
  let server: ReturnType<typeof spawnServer>

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'intercom-test-'))
  })

  afterAll(async () => {
    server.kill()
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('delivers message as channel notification', async () => {
    const agentId = 'receiver'

    // Place a message in the inbox BEFORE starting the server
    await placeMessage(tmpDir, agentId, {
      id: 'test-msg-1',
      from: 'external-agent',
      to: agentId,
      message: 'hello via polling',
      ts: new Date().toISOString(),
    })

    // Start server (it will register and start polling)
    server = spawnServer(tmpDir, agentId)
    await initializeServer(server)

    // Wait for the poll cycle (2 seconds) plus buffer
    const output = await server.readAllOutput(4000)

    // The output should contain a notifications/claude/channel JSON-RPC notification
    expect(output).toContain('notifications/claude/channel')
    expect(output).toContain('hello via polling')
    expect(output).toContain('external-agent')
    expect(output).toContain('test-msg-1')
  }, 10000)
})

describe('message lifecycle (inbox -> processed)', () => {
  let tmpDir: string
  let server: ReturnType<typeof spawnServer>

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'intercom-test-'))
  })

  afterAll(async () => {
    server.kill()
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('moves message from inbox to processed after delivery', async () => {
    const agentId = 'lifecycle-agent'

    await placeMessage(tmpDir, agentId, {
      id: 'lifecycle-msg',
      from: 'some-agent',
      to: agentId,
      message: 'lifecycle test',
      ts: new Date().toISOString(),
    })

    server = spawnServer(tmpDir, agentId)
    await initializeServer(server)

    // Wait for poll cycle
    await Bun.sleep(4000)

    // Inbox should be empty
    const inbox = join(tmpDir, agentId, 'inbox')
    const inboxFiles = await readdir(inbox)
    expect(inboxFiles.length).toBe(0)

    // Processed should have the file
    const processed = join(tmpDir, agentId, 'processed')
    const processedFiles = await readdir(processed)
    expect(processedFiles.length).toBe(1)
    expect(processedFiles[0]).toBe('lifecycle-msg.json')

    // Verify content is preserved
    const msg = JSON.parse(
      await readFile(join(processed, processedFiles[0]), 'utf-8'),
    )
    expect(msg.message).toBe('lifecycle test')
  }, 10000)
})

describe('error handling', () => {
  let tmpDir: string
  let server: ReturnType<typeof spawnServer>

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'intercom-test-'))
  })

  afterAll(async () => {
    server.kill()
    await rm(tmpDir, { recursive: true, force: true })
  })

  test('deletes corrupt files and still delivers valid messages', async () => {
    const agentId = 'error-agent'
    const inbox = join(tmpDir, agentId, 'inbox')
    await mkdir(inbox, { recursive: true })

    // Place a corrupt (non-JSON) file
    await writeFile(join(inbox, 'aaa-corrupt.json'), 'this is not json!!!')

    // Place a valid message (sorted after the corrupt one)
    await placeMessage(tmpDir, agentId, {
      id: 'zzz-valid-msg',
      from: 'good-agent',
      to: agentId,
      message: 'valid message',
      ts: new Date().toISOString(),
    })

    server = spawnServer(tmpDir, agentId)
    await initializeServer(server)

    // Wait for poll cycle (2s interval + buffer)
    await Bun.sleep(3000)

    // Corrupt file should be deleted
    const inboxFiles = await readdir(inbox)
    expect(inboxFiles).not.toContain('aaa-corrupt.json')

    // Valid message should be processed
    const processed = join(tmpDir, agentId, 'processed')
    const processedFiles = await readdir(processed)
    expect(processedFiles).toContain('zzz-valid-msg.json')

    // Verify the valid message was delivered via channel (output already accumulated)
    const output = await server.readAllOutput(100)
    expect(output).toContain('valid message')
  }, 10000)
})
