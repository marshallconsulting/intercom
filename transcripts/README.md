# Transcripts

This folder holds cleaned records of design sessions, team calls, and working conversations.

In a typical CDD project, transcripts are one of the most powerful context sources. A raw recording from Otter, Fireflies, Teams AI, or any transcription tool gets cleaned up and dropped here. The cleanup strips filler, crosstalk, and personal chatter while preserving every technical decision, domain insight, and action item.

## Why This Matters

Meetings are where domain knowledge first appears in natural language. Someone explains how a system works, debates a tradeoff, or makes a decision on the spot. Without transcripts, that knowledge lives only in the heads of the people who were there. With transcripts, it becomes durable context that agents and future team members can reference.

A single design call can produce:

- **Proposals** from decisions made during the conversation
- **Research tasks** from questions nobody could answer on the spot
- **Experiments** from "we should try X" moments
- **Spec updates** from clarified domain rules or corrected assumptions
- **Glossary updates** from vocabulary collisions ("wait, what do YOU mean by 'tenant'?")

## The Import Pipeline

The `/import-transcript` skill automates the cleanup:

1. Read the raw transcript (VTT, plain text, etc.)
2. Normalize speaker names to short labels
3. Remove noise (scheduling logistics, filler, off-topic chatter)
4. Keep everything technical (decisions, reasoning, domain knowledge, debates)
5. Map terminology to canonical project terms where possible
6. Write to `transcripts/YYYY-MM-DD-topic.md` with speaker labels and sections
7. Append next steps split into agent-actionable items and human action items

The output is a faithful record of what was said, minus the noise. Not a summary. A clean transcript that reads like the actual conversation.

## For This Repo

Intercom is a developer tool, so there aren't client design calls to transcribe here. This folder exists to demonstrate the CDD methodology. In a real product repo, this is where meeting transcripts would accumulate and feed back into the development pipeline.
