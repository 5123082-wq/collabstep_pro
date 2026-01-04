# Continuity Ledger

## Goal

- Integrate file manager with Org → Project → Task, @vercel/blob storage, share links, folders, trash/limits, direct upload.
- **NEW**: Multi-Organization Premium Feature - allow paid users to create multiple organizations.

## Constraints/Assumptions

- No secrets in repo; BLOB token only via env.
- Previews: images/PDF only; no document versioning; no audit initially.
- Multi-org: free plan = 1 org, pro/max = unlimited.

## Key Decisions

- Share: public view; download requires login via server-side proxy (no exposed URLs).
- Results: task has result folder; can be empty.
- Limits: free/pro/max; trash retention 7/30/unlimited days.
- **Multi-org**: First created org = primary; user can switch between orgs; data filtered by current org.

## State

- Tasks 01–16 complete (file manager).
- **Multi-Org Feature implemented** (2026-01-03):
  - DB migration 0008: `is_primary` column in `organization_member`, `user_subscription` table
  - Zustand store: `organization-store.ts` for org state
  - Context: `OrganizationContext.tsx` with `useOrganization()` hook
  - Updated `OrganizationSwitcher` - shows current org, switch functionality, primary indicator
  - API updates: `/api/organizations` returns isPrimary, userRole, memberCount
  - API limits: POST `/api/organizations` checks subscription limits
  - New API: `/api/me/subscription` for user subscription info
  - `UpgradeToCreateOrgModal` paywall for free users
  - Pages integrated: Projects, Tasks, Files - all show org name in header

### Now

- ✅ **Speed Insights updated and PR created** (2026-01-04):
  - Created dedicated client component `Insights.tsx` with `usePathname` for route tracking
  - Updated `layout.tsx` to use new component (removed dynamic import)
  - Follows official Vercel documentation best practices
  - Maintains SSR on layout while tracking performance metrics
  - PR #32: https://github.com/5123082-wq/collabstep_pro/pull/32
  - All checks passed: lint, typecheck
- ✅ **Changes pushed to GitHub and PR created** (2026-01-03)
  - PR #31: https://github.com/5123082-wq/collabstep_pro/pull/31
  - All checks passed: lint, typecheck, routes
  - Fixed TypeScript errors (removed unused @ts-expect-error directives)
- ✅ Multi-Organization feature implemented (code complete)
- ✅ Migration 0008 applied successfully (is_primary, user_subscription table)
- ✅ Pages show current organization name in headers
- ✅ OrganizationSwitcher shows current org with switch capability
- ✅ Tested: Projects and Files pages show "— Test Org" in header
- ✅ **Folder deletion feature** (2026-01-03):
  - Added delete button for custom folders in FolderTreeSidebar (appears on hover)
  - API tracks files belonging to projects when deleting folders
  - Logs notification info for project owners (for future notification system)
  - Files moved to trash on folder deletion, can be restored

### Next

- Implement actual subscription purchase flow (Stripe integration)
- Add "god mode" view (see all orgs at once) - deferred for later
- Consider adding org indicator badge in project/task cards
- Implement notification system for project owners when their files are deleted

## Files Changed (Multi-Org Feature)

- `apps/api/src/db/schema.ts` - added isPrimary to organizationMembers, userSubscriptions table
- `apps/api/src/db/migrations/0008_multi_org_feature.sql` - migration file
- `apps/api/apply-migration-0008.mjs` - migration script
- `apps/web/stores/organization-store.ts` - Zustand store for org state
- `apps/web/components/organizations/OrganizationContext.tsx` - Context provider
- `apps/web/components/organizations/OrganizationSwitcher.tsx` - Updated switcher UI
- `apps/web/components/organizations/UpgradeToCreateOrgModal.tsx` - Paywall modal
- `apps/web/components/app/AppLayoutClient.tsx` - Added OrganizationProvider
- `apps/web/app/api/organizations/route.ts` - Enhanced GET/POST
- `apps/web/app/api/me/subscription/route.ts` - New endpoint
- `apps/web/lib/api/user-subscription.ts` - Subscription utilities
- `apps/web/app/(app)/pm/projects/page.tsx` - Org context integration
- `apps/web/app/(app)/pm/tasks/page.tsx` - Org context integration
- `apps/web/app/(app)/docs/files/page.tsx` - Org context integration

## Critical Issue: User Data Loss

- **2026-01-03**: Скрипт `cleanup-users-db.ts` был запущен и удалил всех пользователей кроме администратора
- **Результат**: В базе данных остался только 1 пользователь (было 199)
- **Действие**: Проверить возможность восстановления из бэкапов Vercel Postgres
- **Документация**: `docs/runbooks/USER_DATA_RECOVERY.md`

## Last updated

- 2026-01-04 — **Speed Insights Integration Updated & PR Created** ✅
  - Refactored to use dedicated client component with route tracking
  - Follows official Vercel documentation best practices
  - All checks passed (lint, typecheck)
  - PR #32 created: https://github.com/5123082-wq/collabstep_pro/pull/32

- 2026-01-03 — **PR Created and Pushed** ✅
  - PR #31 created: Multi-Organization feature and file manager improvements
  - All checks passed (lint, typecheck, routes)
  - Fixed TypeScript errors (removed unused @ts-expect-error directives)

- 2026-01-03 — **Folder Deletion Feature** ✅
  - Added delete button in FolderTreeSidebar for custom folders (hover to show)
  - API tracks project files when deleting folders, logs notification info
  - Files moved to trash on folder deletion, can be restored via existing restore mechanism

- 2026-01-03 — **Multi-Organization Premium Feature** ✅
  - Added isPrimary flag to organization_member table
  - Created user_subscription table for plan limits
  - Zustand store + Context for organization state
  - OrganizationSwitcher shows current org with switching
  - API limits: free=1 org, pro/max=unlimited
  - Paywall modal for free users trying to create 2nd org
  - Projects/Tasks/Files pages show current org name
