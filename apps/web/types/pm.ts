export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

export interface ProjectMember {
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'CONTRACTOR' | 'GUEST';
  name?: string; // Имя пользователя для отображения
  avatarUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  status: ProjectStatus;
  startDate?: string;
  dueDate?: string;
  ownerId: string;
  workspaceId?: string;
  members: ProjectMember[];
  metrics?: {
    total: number;
    inProgress: number;
    overdue: number;
    progressPct: number;
    budgetUsed?: number;
    budgetLimit?: number;
    activity7d: number;
  };
  marketplace?: {
    listingId?: string;
    state: 'none' | 'draft' | 'published' | 'rejected';
  };
  owner?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
  permissions?: {
    canView: boolean;
    canCreateTask: boolean;
    canCreateExpense: boolean;
    isOwner: boolean;
  };
}

export type TaskStatus = 'new' | 'in_progress' | 'review' | 'done' | 'blocked';

export interface TaskAttachment {
  id: string;
  filename: string;
  mimeType?: string;
  sizeBytes?: number;
  storageUrl?: string;
}

export interface Task {
  id: string;
  projectId: string;
  number: number;
  parentId: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  iterationId?: string;
  assigneeId?: string;
  startAt?: string;
  startDate?: string; // Alias for startAt
  dueAt?: string; // Due date
  priority?: 'low' | 'med' | 'high' | 'urgent';
  labels?: string[];
  estimatedTime?: number | null; // In hours
  storyPoints?: number | null;
  loggedTime?: number | null; // In minutes
  updatedAt: string;
  createdAt: string;
  attachments?: TaskAttachment[];
  // Legacy fields for compatibility
  dueDate?: string; // Alias for dueAt
  estimate?: number; // Alias for estimatedTime
  timeSpent?: number; // Alias for loggedTime
  deps?: string[];
  customFields?: Record<string, unknown>;
}
