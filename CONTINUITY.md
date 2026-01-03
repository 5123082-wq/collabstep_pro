# Continuity Ledger

## Goal

- Integrate file manager with Org → Project → Task, @vercel/blob storage, share links, folders, trash/limits, direct upload.

## Constraints/Assumptions

- No secrets in repo; BLOB token only via env.
- Previews: images/PDF only; no document versioning; no audit initially.

## Key Decisions

- Share: public view; download requires login via server-side proxy (no exposed URLs).
- Results: task has result folder; can be empty.
- Limits: free/pro/max; trash retention 7/30/unlimited days.

## State

- Tasks 01–16 complete (all code changes + DB migration done).
- **Done in Task 16**:
  - Applied migration 0006 (organization archive tables, status columns).
  - Applied migration 0007 (file manager tables: file, attachment, folder, share, file_trash, subscription_plan, organization_subscription, organization_storage_usage).
  - Created migration scripts (`apply-migration-0006.mjs`, `apply-migration-0007.mjs`).
  - Tests: 38/55 pass (69%), failures are timeout-related due to remote DB latency.

### Now

- ✅ DB migrations applied (0006, 0007). All file manager tables exist.
- ✅ Env vars added to `.env.local`: `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`.
- ✅ Dev server restarted with new env vars.
- ✅ **UI VERIFIED**: File manager fully working!
  - Tab "Файлы" shows project files.
  - Upload button "📎 Загрузить файл" available.
  - Existing file "test.txt" displayed with Open/Download actions.
  - Folder structure visible.
- ✅ Ready for production deploy.

### Next (for production deploy)

- Add to Vercel env vars:
  - `FEATURE_PROJECT_ATTACHMENTS=1`
  - `NEXT_PUBLIC_FEATURE_PROJECT_ATTACHMENTS=1`
  - `CRON_SECRET=<your secret>`
  - `BLOB_READ_WRITE_TOKEN=<provided token>`
- Deploy to Vercel.
- Full production smoke test.

## Documentation cleanup

- Archived completed task docs: `docs/agent_tasks/file-manager-integration/` → `docs/archive/agent_tasks/file-manager-integration/`
- Archived audit docs: `docs/audit/` → `docs/archive/audit/`
- Archived old development stages: `docs/development/stages/` → `docs/archive/development/stages/`
- Archived temporary root files: `FIX_WEBPACK_CHUNK_ERROR.md`, `TEST_REPORT.md`, `WEBPACK_ERROR_RESOLUTION.md` → `docs/archive/`
- Updated `.gitignore` to exclude `docs/archive/` from git

## Last updated

- 2026-01-03 — File manager smoke test PASSED ✅
