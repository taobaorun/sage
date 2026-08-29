---
name: marktext
description: Open local Markdown documents in MarkText. Always use when the user asks to open or view a Markdown, MD, or README file with MarkText, even when its path appears only in recent conversation context. Do not use for editing, creating, rendering, or summarizing documents, or when the user specifies another application.
compatibility: macOS with MarkText.app installed
---

# MarkText

1. Select the file in this order: an explicit path in the current request, the most recent contextual path it refers to, then the most recently delivered Markdown path. Ask if the choice is not unique.
2. Accept `.md`, `.markdown`, `.mdown`, `.mkd`, and Markdown links. Strip enclosing `<>` and `:line[:column]`, expand `~`, and resolve relative paths to absolute paths. For a bare filename, use `rg --files` and accept only one match.
3. Verify macOS, a regular file, a supported extension, and an installed MarkText app. Stop on failure; do not substitute another application.
4. The open action may fan out to an agent: pass only the resolved absolute path, instruct it to perform only the next step and report success or error, and run locally when fan-out is unavailable.
5. Run `open -a "MarkText" "$absolute_path"`; pass the path as a separately quoted argument, never use `eval`, and never read, modify, or execute document contents.
6. Briefly confirm the opened absolute path, or preserve the key error details on failure.
