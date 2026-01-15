# AI Agent Rules

These rules apply to all automated changes in this repo.

## Mandatory Rules

### Core Engineering

- Respect `exactOptionalPropertyTypes`: never assign `undefined` to optional props; use conditional spreads or `omitUndefined`.
- Strip `undefined` from Zod payloads before passing into services/repositories.
- Avoid `unknown[]` for tree nodes; define explicit node types or type guards.
- Do not use `any` or `@ts-expect-error` unless there is a clear comment; exception: lucide-react icon types.
- Run `pnpm -w typecheck` after TypeScript changes, or explicitly state if not run.
- Keep edits minimal and scoped to the request.

### Platform & Architecture

- Always consider platform-wide impact: permissions, analytics events, notifications, dashboards, and other sections.
  If a feature introduces new state, action, or entity, check where else it should be reflected.

- Prefer extending existing patterns over introducing new abstractions unless clearly justified.
- Avoid introducing new concepts, statuses, or systems if an existing one can be reused.

- Treat data models, enums, analytics events, and API payloads as contracts.
  Do not rename or remove existing fields, events, or enum values without explicit approval.

- When adding or changing user-facing functionality, verify whether analytics events should be added or updated.
  If unsure, flag this explicitly.

### Product & UX Thinking

- Before implementing a feature, explicitly identify key user scenarios (happy path + edge cases).
  If scenarios are unclear, ask for clarification before coding.

- For any new entity or feature, consider its lifecycle: creation, update, visibility, permissions, archival, and deletion.

- Do not silently assume business rules or product decisions.
  If something is ambiguous, state assumptions explicitly or ask before proceeding.
- Communicate with the user in Russian by default: ask questions and provide results (summaries, plans, issues/specs/PR texts) in Russian unless the user explicitly requests another language.

### Documentation & Context

- If a task depends on external library/framework APIs (Next.js, React, Prisma, Vercel, etc.) or you are unsure about the current syntax/behavior,
  use MCP Context7 to fetch up-to-date, version-specific docs/examples before coding.

- When designing or changing a feature in any section (PM / Marketplace / Marketing, etc.),
  first review the relevant project documentation for that section and any cross-cutting docs
  (permissions, feature flags, events/analytics) to ensure the change works consistently across the platform.

- Code changes that alter behavior, flows, or data structures must be reflected in documentation.
  If documentation updates are not included, explicitly ask whether they are required.

- New API endpoints must follow existing feature flags and access control patterns.

## How To Request Work

- Provide goal + scope in 1-2 sentences.
- List acceptance criteria (what must be true when done).
- Call out constraints (files to avoid, coding patterns, performance, i18n).
- Mention target environment and required feature flags.
- Specify tests to run (or tests to skip).

- Point to the relevant docs to read first (files/paths/sections) when the change may affect multiple parts of the platform.

## Agent Thinking Checklist (Before Coding)

- What user problem is being solved?
- Which sections of the platform are affected (PM / Marketplace / Marketing / Docs)?
- What permissions and roles apply?
- What analytics events should fire?
- Does this reuse existing patterns or introduce something new?
- What assumptions am I making?
- Which docs did I read before starting?
- Am I responding in Russian (questions + results) unless the user asked otherwise?
