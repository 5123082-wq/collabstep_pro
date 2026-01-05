# Stage 1 Report: Project Creation API/Data

Summary:
- Added validation and normalization for project creation inputs on the PM API.
- Passed visibility, stage, type, and deadline through to project creation and org sync.
- Ensured stage is persisted in the project table and defaulted when missing.

What changed:
- apps/web/app/api/pm/projects/route.ts: validated type/stage, normalized visibility, parsed deadline, and forwarded stage/visibility to upsert.
- apps/api/src/repositories/projects-repository.ts: normalized visibility on create and defaulted stage to discovery.

Validations/defaults:
- visibility: normalized to private unless exactly "public".
- type: allow-list (product, marketing, operations, service, internal) or 400 INVALID_REQUEST.
- stage: allow-list (discovery, design, build, launch, support) or 400 INVALID_REQUEST.
- deadline: only forwarded when a non-empty, parseable date string is provided.
- defaults: visibility=private, stage=discovery.

Risks/assumptions:
- Assumption: deadline validation uses Date.parse; non-ISO but parseable strings will pass.
- Risk: stage is now always set to discovery on create; any flow relying on missing stage might need review.

Tests:
- Not run (not requested).

Open questions:
- None.
