# Proposal: Agent Groups

## Problem

`broadcast` sends to everyone. Sometimes you want to message a subset: "all agents on Project Alpha" or "all CTOs across repos."

## Proposed Solution

Named groups that agents can join. Groups are defined in a config file or self-declared during registration.

## Scope

- Group membership (agent declares groups on registration)
- `send_group` tool (message all members of a named group)
- Group discovery (`list_groups` tool)
- Convention-based groups (e.g., agents with IDs matching `project-a-*` auto-join group `project-a`)

## Why It Matters

As the number of agents grows, broadcast becomes noisy. Groups let you target the right audience without knowing every agent ID.
