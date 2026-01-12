/**
 * Client-side utilities for admin user checks
 * These functions are safe to use in client components without importing server-side modules
 */

// Admin user ID constant (must match apps/api/src/data/memory.ts)
const TEST_ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_WORKSPACE_USER_ID = TEST_ADMIN_USER_ID;

/**
 * Checks if a user ID belongs to the admin user
 * Client-safe version of isAdminUserId from @collabverse/api
 */
export function isAdminUserId(userId: string): boolean {
  return userId === TEST_ADMIN_USER_ID || userId === DEFAULT_WORKSPACE_USER_ID;
}
