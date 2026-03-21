# Proposal: Delivery Receipts

## Problem

When an agent sends a message, it has no way to know if the recipient actually processed it. The sender gets "Sent to team-cmo" but the CMO might be offline, crashed, or have a full inbox.

## Proposed Solution

Add optional delivery receipts. When a message is delivered (channel notification sent successfully), the recipient's server writes a receipt file to the sender's inbox.

## Scope

- Receipt schema (message_id, delivered_at, agent_id)
- Auto-send receipt on successful delivery
- `check_receipt` tool for sender to verify delivery
- Timeout detection (message sent > N minutes ago, no receipt)

## Why It Matters

Reliability. If you broadcast a question to 4 agents and only 2 reply, you want to know if the other 2 never received it or just chose not to respond.
