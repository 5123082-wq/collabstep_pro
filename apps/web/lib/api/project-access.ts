import { projectsRepository, isAdminUserId } from '@collabverse/api';
import { isDemoAdminEmail } from '@/lib/auth/demo-session';
import type { Project } from '@collabverse/api';

/**
 * Get all projects that the user has access to.
 * 
 * For admin users (by UUID or email), returns all projects.
 * For regular users, returns only projects where:
 * - User is the owner (ownerId === userId)
 * - User is a member (checked via projectsRepository.hasAccess)
 * - Project is public (checked via projectsRepository.hasAccess)
 * 
 * @param userId - User ID
 * @param email - User email
 * @param options - Optional filters (archived, workspaceId)
 * @returns Promise<Project[]> - List of accessible projects
 */
export async function getAccessibleProjects(
  userId: string,
  email: string,
  options?: { archived?: boolean | null; workspaceId?: string | null }
): Promise<Project[]> {
  const allProjects = projectsRepository.list(options);
  
  // Check if user is admin (by UUID or email)
  const isAdmin = isAdminUserId(userId) || isDemoAdminEmail(email);
  
  // Admin users have access to all projects
  if (isAdmin) {
    return allProjects;
  }
  
  // For regular users, check access for each project
  const accessible: Project[] = [];
  for (const project of allProjects) {
    // Direct owner check
    if (project.ownerId === userId) {
      accessible.push(project);
      continue;
    }
    
    // Check via hasAccess (includes member and public project checks)
    const hasAccess = await projectsRepository.hasAccess(project.id, userId);
    if (hasAccess) {
      accessible.push(project);
    }
  }
  
  return accessible;
}

