# Research

This folder holds distilled knowledge about the world outside the codebase: platforms, competitors, protocols, design patterns, and vendor evaluations. Each file covers one topic.

Research is durable reference material that informs specs and proposals but is not itself a spec. It describes what exists out there, not what we're building. When research leads to a decision about what to build, that decision becomes a proposal in `workflow/proposals/`.

## How Research Gets Here

- An agent investigates a question and distills findings into a file
- A team member drops in notes from evaluating a tool or reading docs
- A transcript surfaces a question nobody could answer, triggering a research task
- A proposal audit reveals an assumption that needs external validation

## Guidelines

- **One topic per file.** `mcp-channels-protocol.md`, not `misc-notes.md`.
- **Update, don't duplicate.** If new info comes in on an existing topic, update the file.
- **Distill, don't dump.** Raw API docs belong in external links. The research file captures what matters for this project's decisions.
- **Date your findings.** Platforms change. Note when you checked so future readers know the freshness.
