# AI Agent Rules

These rules apply to all automated changes in this repo.

## Mandatory Rules

- Respect `exactOptionalPropertyTypes`: never assign `undefined` to optional props; use conditional spreads or `omitUndefined`.
- Strip `undefined` from Zod payloads before passing into services/repositories.
- Avoid `unknown[]` for tree nodes; define explicit node types or type guards.
- Do not use `any` or `@ts-expect-error` unless there is a clear comment; exception: lucide-react icon types.
- Run `pnpm -w typecheck` after TypeScript changes, or explicitly state if not run.
- Keep edits minimal and scoped to the request.
- New API endpoints must follow existing feature flags and access control patterns.

## How To Request Work

- Provide goal + scope in 1-2 sentences.
- List acceptance criteria (what must be true when done).
- Call out constraints (files to avoid, coding patterns, performance, i18n).
- Mention target environment and required feature flags.
- Specify tests to run (or tests to skip).
