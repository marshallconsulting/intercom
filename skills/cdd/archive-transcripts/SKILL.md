> **Requires CDD v1.** This skill expects the repo to use Context-Driven Development folder structure with a `transcripts/` directory.

# /archive-transcripts - Archive Transcripts by Week

Move older transcripts from the flat `transcripts/` folder into weekly archive folders with auto-generated summaries.

## Usage

```
/archive-transcripts
```

No arguments. Operates on the current repo's `transcripts/` folder.

## What This Skill Does

Scans the `transcripts/` folder for dated markdown files (`YYYY-MM-DD-*.md`), identifies which ISO week they belong to, and moves any files from **completed weeks** (not the current week) into weekly subfolders. Generates a `summary.md` in each new weekly folder using a Haiku subagent.

Files from the **current week stay loose** in `transcripts/` so they're easy to find and edit. Only past weeks get archived. Undated files always stay at root.

## Instructions

### Step 1: Scan and Classify

Read the contents of `transcripts/` (top-level only, not subdirectories). For each file:

1. **Dated files** (`YYYY-MM-DD-*.md`): Parse the date from the filename. Compute the ISO week number and year (e.g., `2026-W12`).
2. **Undated files** (no date prefix): Skip. These stay at root.
3. **Already-archived files** (in subdirectories like `2026-W12/`): Skip. Already done.

Determine the **current week** from today's date. Any file whose ISO week matches the current week stays put.

Group the remaining files by week.

If no files need archiving, tell the user: "All transcripts are current. Nothing to archive." and stop.

### Step 2: Preview

Show the user what will happen:

```
Archive plan:
  2026-W10/ (Mar 2-6)
    2026-03-02-craig-ivan-doug-summary.md
    2026-03-04-design-session.md
    2026-03-06-buyer-resolution.md
  2026-W11/ (Mar 9-13)
    2026-03-11-design-session.md

  3 files from current week (W13) stay in transcripts/
  1 undated file stays in transcripts/
```

Ask: "Look good?" Wait for confirmation before proceeding.

### Step 3: Move Files

For each weekly group:

1. Create the directory: `transcripts/YYYY-WNN/` (e.g., `transcripts/2026-W10/`)
2. `git mv` each file into the directory
3. Verify the move succeeded

Use `git mv` so git tracks the rename. Do NOT use plain `mv`.

### Step 4: Generate Weekly Summaries

For each newly created weekly folder, spawn a **Haiku subagent** to generate a `summary.md`. The subagent should:

1. Read all transcript files in the weekly folder
2. Write a `summary.md` with this format:

```markdown
# Week of [Month Day-Day, Year] (YYYY-WNN)

## Meetings This Week

| Date | Topic | Attendees | Duration |
|------|-------|-----------|----------|
| Mar 2 | [Topic from title] | [from frontmatter] | [from frontmatter] |

## Key Decisions
- [Bullet list of decisions made across all transcripts this week]

## Key Topics
- [Bullet list of major topics discussed, with which transcript they're in]

## Action Items
- [Consolidated action items from all Next Steps sections, deduplicated]
```

Rules for the subagent:
- Read the actual transcripts, don't guess from filenames
- Pull attendees and duration from the frontmatter if available
- Key decisions should be concrete: "Chose X over Y because Z"
- Action items should include who owns them
- Keep the summary to one page. This is an index, not a rewrite.

Launch all weekly summary subagents in parallel if there are multiple weeks to process.

### Step 5: Confirm

Tell the user:
- How many files were archived into how many weekly folders
- That summaries were generated
- Remind them to review the summaries and commit when ready

Do NOT commit. Let the user review first.
