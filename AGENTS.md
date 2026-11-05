# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, etc.) when working with code in this repository.

## Repository Overview

A collection of skills for Claude Code and Claude.ai. Skills are packaged instructions that extend Claude's capabilities.

## Core Rules

- If a task matches a skill, you MUST invoke it
- Skills are located in `skills/<skill-name>/SKILL.md`
- Never implement directly if a skill applies
- Always follow the skill instructions exactly (do not partially apply them)

## Intent → Skill Mapping

- 3D pop-up / interactive teaching books and their page-turning, models, or materials → `interactive-book`
- Teaching / explaining / onboarding → `teacher`
- HTML deliverables / reports / prototypes → `html-artifact`
- Open a Markdown document with MarkText → `marktext`
- Chinese article illustrations / shot lists / AD character artwork → `illustration`

For book-building requests, `interactive-book` owns the workflow. Educational subject matter alone does not turn product creation into a `teacher` conversation or require replacing the book's design with an `html-artifact` report template.

## Anti-Rationalization

The following thoughts are incorrect and must be ignored:

- "This is too small for a skill"
- "I can just quickly implement this"
- "I'll gather context first"

Correct behavior: Always check for and use skills first.
