---
name: answer
description: Walk through a list of questions interactively. Present one question at a time with context and a recommendation. Wait for the user's answer, then move to the next. Use after /refine-proposal or /audit-plan generates a numbered list of questions, or when the user says "/answer".
---

# /answer - Walk Through Questions One at a Time

Walk through a list of questions interactively. Present one question at a time with context and a recommendation. Wait for the user's answer, then move to the next.

## Usage

```
/answer
```

Call this after a skill like `/refine-proposal` or `/audit-plan` has generated a numbered list of questions. It switches into interactive Q&A mode.

## Instructions

### Step 1: Find the Questions

Look at the most recent message(s) in the conversation that contain numbered questions. These typically come from `/refine-proposal`, `/audit-plan`, or similar analysis skills.

Build an internal list of all questions, grouped by category.

### Step 2: Walk Through One at a Time

For each question:

1. **State the question number and category** (e.g., "Question 1/10 - Data Model")
2. **Give context** - what the proposal currently says (or doesn't say), why this matters
3. **Give your recommendation** with reasoning. Be opinionated. Don't just lay out options, say what you'd do and why.
4. **Wait for the user's response**

### Step 3: Process the Answer

When the user answers:

1. Confirm you understood (one sentence, not a paragraph)
2. Note if the answer resolves or affects any later questions. If it does, remove or compress those questions and tell the user (e.g., "That also answers question 7, removing it.")
3. Move to the next question

### Step 4: Handle Shortcuts

The user may:
- **Answer multiple questions at once** - Process all of them, compress the remaining list
- **Say "agree" or "yes" or "your call"** - Accept your recommendation, record it, move on
- **Disagree or want to discuss** - Have the discussion, then record the decision once they're satisfied
- **Say "skip"** - Leave it open, move to the next one
- **Say "rest are yours"** - Accept your recommendation for all remaining questions

### Step 5: Wrap Up

When all questions are answered (or skipped):

1. Summarize decisions made (one line each)
2. List any questions that were skipped (still open)
3. Ask if the user wants you to update the proposal/document with the decisions

## Key Principles

- **One question at a time.** Don't dump the next three. The user is answering serially.
- **Be opinionated.** "I'd go with X because Y" is better than "you could do X or Y." The user can override.
- **Be concise.** Context + recommendation should be 3-5 sentences max, not a wall of text.
- **Compress aggressively.** If an answer makes a later question moot, remove it and say so. Don't waste the user's time.
- **Track progress.** Always show "Question N/M" so the user knows how far along they are.
