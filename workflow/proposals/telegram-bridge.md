# Proposal: Telegram Bridge

## Problem

Intercom only works between Claude Code agents on the same machine. There's no way to send or receive messages from a mobile device or external system.

## Proposed Solution

A Telegram bot that bridges messages between Telegram and the intercom bus. Text the bot from your phone, it routes to the right agent via intercom. Agent replies flow back through the bot to your phone.

## Scope

- Telegram Bot API integration (grammY or raw HTTP)
- Message routing: Telegram -> intercom send -> agent
- Response relay: agent reply -> intercom -> Telegram
- Access control (allowlist by Telegram user ID)
- Agent discovery from Telegram ("who's online?")

## Why It Matters

Mobile access. Check on your agents from anywhere. "What's the pipeline status?" from the gym, reply lands in 3 seconds.

## Prior Art

The Claude Code Telegram plugin (`plugin:telegram@claude-plugins-official`) does human-to-agent chat but doesn't integrate with intercom. This proposal bridges the two systems.
