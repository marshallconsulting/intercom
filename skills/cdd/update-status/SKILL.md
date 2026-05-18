---
name: update-status
description: Update _status.md files to reflect current implementation state. Reads specs and code, updates checkboxes. Use when the user says "/update-status", "update status", or wants to refresh implementation tracking.
args: "[spec folder path, e.g. specs/payment-flow] or 'all' to scan all spec folders"
---

# /update-status - Update Implementation Status

Refresh `_status.md` files to reflect what's actually built. Reads the spec, reads the code, updates the checkboxes.

## Usage

```
/update-status specs/payment-flow
/update-status all
```

If no argument is provided, list spec folders that have a `_status.md` and ask the user to pick one (or offer "all").

## Instructions

### Step 1: Find Spec Folders

If a specific folder is given, use that. If "all", scan `specs/` for folders containing either a `_status.md` or a `README.md` spec.

### Step 2: For Each Spec Folder

#### 2a. Read the Spec

Read the spec's `README.md` to understand what's defined. Extract the major sections and features.

#### 2b. Read Current Status

Read `_status.md` if it exists. Note which items are checked vs unchecked.

#### 2c. Verify Against Code

For each unchecked item, search the codebase to see if it's now implemented:
- Use Grep/Glob to find relevant code
- Check if the functionality described actually works (look at imports, function signatures, test coverage)
- Don't just check if a file exists. Verify the feature is actually implemented.

For each checked item, do a quick sanity check that it hasn't been removed or broken. If the referenced file no longer exists, uncheck it.

#### 2d. Update the Status File

- Flip `[ ]` to `[x]` for newly implemented items, with file path references
- Flip `[x]` to `[ ]` for items that were removed or broken (rare, but check)
- Add new items that the spec defines but the status file doesn't track yet
- Update the "Last updated" date
- Add new sections if the spec has grown beyond what status tracks

If no `_status.md` exists, create one following the convention in `specs/README.md`:
- Header with "cache, not source of truth" disclaimer
- Sections matching the spec's major sections
- Checkboxes for each discrete feature/capability
- File path references for implemented items

### Step 3: Output Summary

Show the user:
- Which spec folders were updated
- Count of items flipped (newly implemented, newly broken)
- Any items that are ambiguous (partially implemented, unclear)
- Overall implementation coverage (checked/total)

## Key Principles

- **Verify, don't trust.** A file existing doesn't mean the feature works. Check function signatures, test coverage, actual behavior.
- **Be conservative.** Only check an item if you're confident it's fully implemented. Partially implemented stays unchecked with a note.
- **Reference code paths.** Every checked item should mention the file(s) that implement it.
- **Keep it scannable.** Checkboxes, file paths, short notes. No paragraphs.
- **Match the spec structure.** Status sections should mirror spec sections so you can read them side by side.
