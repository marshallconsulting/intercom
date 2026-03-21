# Proposal: Cross-Repo Agent Discovery

## Problem

Intercom's registry is global (`~/.claude/intercom/`) but agents only register when their session starts. There's no way to know which agents exist across repos without them all being online.

## Proposed Solution

A static registry file that maps agent IDs to their repo/project context. Agents can discover who *could* be online, not just who *is* online.

## Scope

- Static registry config (`~/.claude/intercom/registry.json`)
- Agent metadata: ID, repo path, role description
- `list_agents` enhancement: show registered (online) vs. known (offline)
- Optional: auto-start an agent in its repo when a message arrives for an offline agent

## Why It Matters

Cross-repo coordination. When the dispatcher routes a Telegram message to `project-a-agent`, it needs to know that agent exists and where its repo lives, even if it's not currently running.
