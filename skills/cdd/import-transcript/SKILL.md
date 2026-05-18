> **Requires CDD v1.** This skill expects the repo to use Context-Driven Development folder structure (`workflow/proposals/`, `workflow/plans/`, `specs/`). See `CDD.md` at the repo root.
  
# /import-transcript - Import and Clean a Call Transcript

Import a raw transcript from a call recording tool, clean it up, and write it to the project's `transcripts/` folder.

**Model:** Launch Steps 0-6 as a Sonnet sub-agent. When `/import-transcript` is invoked, spawn an Agent with `model: "sonnet"` and pass it Steps 0-6 and the arguments. Transcript cleaning is text processing work that doesn't need Opus. Steps 7-8 (research fanout and confirmation) run in the **main session** after the Sonnet agent returns. See "Execution Split" below.

## Usage

```
/import-transcript <filepath>
/import-transcript <filepath> <video_path>
/import-transcript
```

If no filepath is provided, ask the user for the file path. A second path to a video recording (`.mp4`, `.mov`, `.mkv`) can optionally be provided to enable screen capture extraction.

## What This Skill Does

Takes a raw transcript (from Otter, Fireflies, Teams AI, or similar) and produces a cleaned version suitable for a project's `transcripts/` folder. The cleaned transcript preserves the full technical discussion with speaker labels while removing noise that doesn't serve future readers (human or agent).

## Execution Split

The skill runs in two phases to avoid nested background agent issues:

**Phase 1 (Sonnet subagent):** Steps 0-6. Clean the transcript, write it to disk, generate Next Steps. The Sonnet subagent MUST include the following in its response back to the main session:
- The output file path
- How much was removed (rough percentage)
- The main topics covered
- The full list of Agent (automated) items from the Next Steps section, each with its exact text
- The transcript date (for research folder pattern)

**Phase 2 (Main session, Opus):** Steps 7-8. The main session reads the Sonnet agent's response, launches background research agents itself, and confirms to the user. This ensures background agents are direct children of the main session, so their completion notifications arrive reliably. The Sonnet subagent must NOT launch any background agents itself.

When spawning the Sonnet subagent, tell it explicitly: "Do NOT execute Step 7. Return the Agent (automated) items in your response so the main session can launch them."

## Instructions

### Step 0: Handle VTT Files (Microsoft Teams)

If the file is a `.vtt` (WebVTT) file, it's from Microsoft Teams. VTT files have a specific structure:

```
WEBVTT

00:00:00.000 --> 00:00:03.500
<v Speaker Name>The spoken text here.</v>

00:00:03.500 --> 00:00:07.200
<v Another Speaker>More text.</v>
```

VTT files are typically very large because each line of speech is a separate cue with timestamps. Before processing, convert the VTT into a simpler format:

1. **Strip VTT metadata** (the `WEBVTT` header, blank lines between cues, the `-->` timestamp ranges).
2. **Extract speaker and text** from `<v Speaker Name>text</v>` tags.
3. **Merge consecutive lines from the same speaker** into single paragraphs. VTT breaks speech into tiny fragments (2-3 seconds each). Merge them back together so "Doug" speaking for 30 seconds becomes one block, not 15 fragments.
4. **Keep the start timestamp** of each speaker's first line in a block (for the `[MM:SS]` label in output).

For large VTT files that exceed the read limit, read in chunks and process incrementally. Use a subagent if needed to handle the full file.

### Step 0b: Extract Screen Captures from Video Recording

If a video recording path (`.mp4`, `.mov`, `.mkv`) was provided alongside the transcript:

1. **Create a frames directory** in the project's `recordings/frames/<topic-slug>/` folder (create `recordings/` if it doesn't exist).

2. **Get the video duration** using `ffprobe`.

3. **Extract frames at regular intervals** using `ffmpeg`. For a typical 30-minute call, extract every 2 minutes (~15 frames). Adjust interval based on duration:
   - Under 15 min: every 1 minute
   - 15-45 min: every 2 minutes
   - Over 45 min: every 3 minutes

   ```bash
   ffmpeg -ss <seconds> -i <video_path> -frames:v 1 -update 1 -q:v 2 <output.png> -y -loglevel warning
   ```

4. **Read the extracted frames** to understand what was being shown on screen (demos, slides, code, tools, etc.).

5. **Embed relevant screenshots** in the cleaned transcript where the conversation clearly references what's on screen. Use relative paths:
   ```markdown
   ![Screen share](../recordings/frames/<topic-slug>/frame-MM-SS.png)
   ```
   Only embed frames that add context (tool demos, architecture diagrams, code walkthroughs). Skip frames that just show talking heads or generic meeting UI.

6. **Leave the source video in place.** Do not delete it. If the user wants to re-extract at a different cadence, grab additional frames to fill a gap, or just re-watch a moment, the video needs to still exist. Videos are too large to commit to the repo — but that's handled by `.gitignore`, not by deletion. If the video is in `~/Downloads`, leave it to the user to archive or remove; if it's already inside the repo, confirm it's gitignored and leave it alone.

If no video path is provided, skip this step entirely.

### Step 1: Read the Raw Transcript

Read the entire file provided by the user. Understand:
- Who the speakers are (normalize names: "Doug Hathaway" -> "Doug", "craig.j.oneill" -> "Craig", etc.)
- What topics are discussed
- The approximate date (from content, filename, or metadata; fall back to today's date)
- The general structure (timestamps, speaker format, sections)

**Speaker misattribution is common.** Transcription tools frequently assign the wrong speaker, especially during crosstalk or when voices are similar. Use context clues to fix obvious misattributions:
- Pay attention to what each person is talking about. If "Speaker A" suddenly starts discussing a topic that "Speaker B" has been leading, the tool probably swapped them.
- Use the project's CLAUDE.md, memory files, or other context to understand each person's role and expertise. That helps identify who would actually say what.
- If you can't tell who said something, leave the attribution as-is. Don't guess.

### Step 2: Identify Content to Remove

Flag and remove the following:
- **Personal chatter.** Kids, weekend plans, lunch, health, personal scheduling, vacations.
- **Small talk.** Greetings, "how's it going", "talk to you later", "sounds good" filler.
- **Profanity.** Replace curse words with clean alternatives or remove the phrase if it adds nothing.
- **Pure filler.** "Yeah yeah yeah", "right right", "uh huh", acknowledgment-only lines with no content.
- **Scheduling logistics.** Calendar coordination, meeting time negotiation, "can you send me that link."
- **Audio/transcription artifacts.** "[inaudible]", "[crosstalk]", repeated words from transcription glitches.
- **Billing and consulting logistics.** Hours worked, bill rates, invoicing, retainer discussions, contractor arrangements, margins, payment terms. This repo may be shared with clients and team members. Keep the focus on the product and the work, not the business relationship behind it.
- **Tail-end noise.** If the transcript keeps running after the meeting clearly ends (wrap-up goodbyes, background audio, a different conversation, or content that doesn't connect to anything discussed), cut it. The meeting is over when the meeting is over.

### Step 3: Identify Content to KEEP

Keep everything else, including:
- **All technical discussion**, even if tangential to the main topic. Tangential technical talk often seeds future ideas.
- **Business context.** Client discussions, market observations, competitive analysis, strategy.
- **Decisions and reasoning.** Any time someone explains why something should be done a certain way.
- **Action items and commitments.** "I'll send that over", "let's do X next week."
- **Disagreements and debates.** These capture the reasoning behind decisions.
- **Domain knowledge.** Explanations of how things work, industry patterns, institutional knowledge.

### Step 4: Derive the Filename

Generate the output filename: `YYYY-MM-DD-topic.md`

- **Date:** From transcript metadata or content. If ambiguous, use today's date.
- **Topic:** Derive a short slug from the primary discussion topic (e.g., `entity-model-review`, `team-sync`, `quarterly-planning`). Keep it to 2-4 words, lowercase, hyphenated.

### Step 5: Write the Cleaned Transcript

Write to the project's `transcripts/` folder. Format:

```markdown
  
# Topic Title - Month Day, Year

**Attendees:** Alice, Bob, Carol
**Source:** [transcription tool] (cleaned)
**Duration:** ~XX:XX (if known)

---

**Alice [0:04]:** The actual content here...

**Bob [0:31]:** Response content here...
```

Rules for the output:
- **Speaker labels in bold** with timestamps if available: `**Alice [4:32]:**`
- If timestamps aren't in the source, omit them. Don't fabricate.
- **Preserve the conversation flow.** This is a cleaned transcript, not a summary. Keep the back-and-forth structure.
- **Light copyediting only.** Fix obvious transcription errors (wrong words, broken sentences) but don't rewrite people's speech patterns. It should still sound like them.
- **Section headers for topic changes.** If the conversation shifts to a clearly different topic, add a `## Topic Name` header to help navigation.
- **Keep it readable but raw.** This is a clean transcript, not a digest or summary. An agent or person reading it should feel like they're reading what was actually said, minus the noise. The goal is a faithful record of the conversation that's pleasant to read, not a condensed version.

### Step 6: Append Next Steps

After the transcript content, add a `---` separator and a `## Next Steps` section with two subsections. This should be brief and actionable, not a summary of the call.

**Read the project's CLAUDE.md, CDD.md, and any relevant specs/research** to understand what work is already in progress. The suggestions should be aware of the project's methodology (proposals, plans, research, experiments) and existing artifacts.

```markdown
---

## Next Steps

### Agent (automated)
- [ ] Research [topic] — write to `research/filename.md`
- [ ] Create proposal for [decision] — write to `workflow/proposals/`
- [ ] Run experiment to validate [assumption] — write to `experiments/`

### Human
- [ ] **Yates:** [action item from the call]
- [ ] **Doug:** [action item from the call]
```

Rules:
- **Agent items** are things this agent can do right now: web research, competitor analysis, writing proposals or specs, running experiments, updating existing research docs. Frame them in terms of the project's CDD artifacts (research, proposals, plans, experiments).
- **Human items** are things that require a person: sending emails, making phone calls, signing up for accounts, making business decisions, having conversations with third parties. Tag each with who should do it.
- Keep it to 3-5 items per section max. Only include items that actually came up in the call.
- Don't repeat things that are already tracked elsewhere in the repo.

### Step 7: Return Research Items to Main Session

**This step is executed by the Sonnet subagent.** The subagent does NOT launch background agents itself. It returns the information the main session needs to do so.

Check for a project-level config at `.claude/import-transcript.json` in the project root.

Config format:
```json
{
  "auto_research": true,
  "research_folder_pattern": "research/{date}/"
}
```

If `auto_research` is `true`, include the following in your response back to the main session:

```
RESEARCH_FANOUT:
- transcript_path: <absolute path to the transcript file written in Step 5>
- transcript_date: <YYYY-MM-DD>
- research_folder: <resolved path from research_folder_pattern, e.g. research/2026-04-17/>
- items:
  1. <exact text of first Agent (automated) bullet, minus checkbox>
  2. <exact text of second Agent (automated) bullet>
  ...
```

If the config is missing or `auto_research` is false, omit the `RESEARCH_FANOUT` block entirely.

**The Sonnet subagent MUST NOT:**
- Launch any Agent calls itself
- Call WebSearch or do research inline
- Skip returning the items because they "seem like they need internal input"

### Step 7b: Fan Out Research Agents (Main Session Only)

**This step runs in the main session (Opus), NOT in the Sonnet subagent.** After the Sonnet subagent returns, the main session parses the `RESEARCH_FANOUT` block and launches background research agents.

For EACH item in the fanout list, launch ONE background subagent with:

- `subagent_type: "general-purpose"`
- `model: "sonnet"` — research is well-defined text work
- `run_in_background: true` — **non-negotiable**
- `description`: 3-5 word title derived from the item
- `prompt`: self-contained brief using this template:

```
You are doing targeted research to back up a discussion from a call Doug just had. You have no memory of the call — the transcript is on disk and you should read it for context.

**Transcript (read first for context):** <transcript_path>

**Your research task:** <the item text>

**Output file:** <research_folder + slug derived from item>

**Rules:**
- Every factual claim needs a source. Cite URLs inline, not as footnotes.
- Prefer primary sources (vendor docs, press releases, SEC filings, analyst reports) over blog summaries.
- If you can't find a reliable source for a claim, don't make the claim.
- 80-150 lines of markdown. Tight, not padded.
- Structure: short intro, then sections per sub-topic, then a closing "implications" section.
- If the task needs internal design input you don't have, write what you CAN produce (outline, open questions, external precedents) and flag the gaps. Do NOT refuse or skip.
```

**Rules for the main session:**
- Launch ALL items in a single message (parallel tool calls). Don't serialize them.
- Return control to the user immediately after launching. Do not wait.
- When a background agent later reports completion, update the transcript's Next Steps section to mark that item `[x]`.
- One item = one subagent. No merging, no dropping, no judging.

### Step 8: Confirm

Tell the user:
- The output file path
- How much was removed (rough percentage or description)
- The main topics covered
- If auto-research was triggered: which research agents were launched
