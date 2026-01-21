export type ID = string;

export type ProjectStage = 'discovery' | 'design' | 'build' | 'launch' | 'support';
export type ProjectVisibility = 'private' | 'public';
export type ProjectType =
  | 'product'
  | 'marketing'
  | 'operations'
  | 'service'
  | 'internal';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
export type TaskStatus = 'new' | 'in_progress' | 'review' | 'done' | 'blocked';
export type ExpenseStatus = 'draft' | 'pending' | 'approved' | 'payable' | 'closed';

export interface ProjectWorkflow {
  projectId: ID;
  statuses: TaskStatus[];
}

export interface Iteration {
  id: ID;
  projectId: ID;
  title: string;
  start?: string;
  end?: string;
}

export interface Project {
  id: ID;
  workspaceId: ID;
  key: string; // Unique project key per workspace (e.g., "PROJ", "ABC")
  title: string;
  description?: string;
  ownerId: ID;
  ownerNumber?: number; // Sequential number per owner (non-reused)
  status: ProjectStatus; // Lifecycle status: active, on_hold, completed, archived
  deadline?: string;
  stage?: ProjectStage;
  type?: ProjectType;
  visibility: ProjectVisibility;
  budgetPlanned: number | null;
  budgetSpent: number | null;
  workflowId?: ID;
  archived: boolean; // Legacy field, kept for backward compatibility
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTemplate {
  id: ID;
  title: string;
  kind: string;
  summary: string;
  projectType?: ProjectType;
  projectStage?: ProjectStage;
  projectVisibility?: ProjectVisibility;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectTemplateTask {
  id: ID;
  templateId: ID;
  parentTaskId: ID | null;
  title: string;
  description?: string;
  defaultStatus: TaskStatus;
  defaultPriority?: 'low' | 'med' | 'high' | 'urgent';
  defaultLabels?: string[];
  offsetStartDays: number;
  offsetDueDays?: number;
  estimatedTime?: number | null;
  storyPoints?: number | null;
  position: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMember {
  userId: ID;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface FileObject {
  id: ID;
  uploaderId: ID;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
  sha256?: string;
  description?: string;
  uploadedAt: string;
}

export type AttachmentEntityType = 'project' | 'task' | 'comment' | 'document' | 'project_chat';

export interface Attachment {
  id: ID;
  projectId: ID;
  fileId: ID;
  linkedEntity: AttachmentEntityType;
  entityId: ID | null;
  createdAt: string;
  createdBy: ID;
}

export interface Document {
  id: ID;
  projectId: ID;
  title: string;
  type?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: ID;
  documentId: ID;
  fileId: ID;
  version: number;
  createdBy: ID;
  createdAt: string;
  notes?: string;
}

export interface TaskComment {
  id: ID;
  projectId: ID;
  taskId: ID;
  parentId: ID | null;
  body: string;
  mentions: ID[];
  authorId: ID;
  attachments: ID[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectChatMessage {
  id: ID;
  projectId: ID;
  authorId: ID;
  body: string;
  attachments: ID[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependency {
  id: ID;
  dependentTaskId: ID; // Task that is blocked
  blockerTaskId: ID; // Task that blocks
  type: 'blocks' | 'relates_to';
  createdAt: string;
}

export interface Task {
  id: ID;
  projectId: ID;
  number: number; // Auto-increment per project (e.g., PROJ-123)
  parentId: ID | null;
  title: string;
  description?: string;
  status: TaskStatus;
  iterationId?: ID;
  assigneeId?: ID;
  startAt?: string; // Start date (aliased from startDate)
  startDate?: string; // Alias for startAt, for consistency
  dueAt?: string; // Due date
  priority?: 'low' | 'med' | 'high' | 'urgent';
  labels?: string[];
  attachments?: FileObject[];
  estimatedTime?: number | null; // In hours
  storyPoints?: number | null; // Story points estimation
  loggedTime?: number | null; // In minutes
  price?: string | null; // Task budget/price
  currency?: string | null; // Currency (e.g., 'RUB')
  createdAt: string;
  updatedAt: string;
}

export interface TaskTreeNode extends Task {
  children?: TaskTreeNode[];
}

export interface CatalogProject extends Project {
  tasksCount: number;
  labels: string[];
}

export interface ExpenseAttachment {
  id: ID;
  expenseId: ID;
  filename: string;
  url: string;
  uploadedAt: string;
}

export interface Expense {
  id: ID;
  workspaceId: ID;
  projectId: ID;
  taskId?: ID;
  date: string;
  amount: string;
  currency: string;
  category: string;
  description?: string;
  vendor?: string;
  paymentMethod?: string;
  taxAmount?: string;
  status: ExpenseStatus;
  createdBy: ID;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBudgetCategoryLimit {
  name: string;
  limit?: string;
}

export interface ProjectBudget {
  projectId: ID;
  currency: string;
  total?: string;
  warnThreshold?: number;
  categories?: ProjectBudgetCategoryLimit[];
  updatedAt: string;
}

export interface ProjectBudgetUsageCategory extends ProjectBudgetCategoryLimit {
  spent: string;
}

export interface ProjectBudgetSnapshot extends ProjectBudget {
  spentTotal: string;
  remainingTotal?: string;
  categoriesUsage: ProjectBudgetUsageCategory[];
}

export interface AuditLogEntry {
  id: ID;
  workspaceId?: ID;
  projectId?: ID;
  entity: {
    type: string;
    id: ID;
  };
  actorId: ID;
  action: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
}

export interface DomainEvent<TPayload = unknown> {
  id: ID;
  type: string;
  entityId: ID;
  payload?: TPayload;
  createdAt: string;
}

// Legacy type kept for backward compatibility with ProjectCard
export type ProjectCardStatus = 'active' | 'archived';

export interface WorkspaceUser {
  id: ID;
  name: string;
  email: string;
  title?: string;
  avatarUrl?: string;
  department?: string;
  location?: string;
  timezone?: string;
  isAI?: boolean; // Флаг для виртуальных AI-агентов
  passwordHash?: string; // Хэш пароля для авторизации
}

export type AIAgentType = 'assistant' | 'reviewer' | 'reminder' | 'summarizer';

export type AIAgentScope = 'personal' | 'team' | 'public';

export interface AIAgent extends WorkspaceUser {
  isAI: true;
  isGlobal?: boolean;
  scope: AIAgentScope;
  createdBy: ID;
  modelProvider?: 'subscription' | 'openai_api_key';
  userApiKey?: string;
  agentType: AIAgentType;
  responseTemplates?: string[]; // Стандартные ответы
  behavior?: {
    autoRespond?: boolean; // Автоматически отвечать на упоминания
    responseStyle?: 'short' | 'detailed'; // Стиль ответов
  };
}

export type AgentPipelineType = 'generative' | 'template';

export type AgentRunStatus =
  | 'queued'
  | 'processing'
  | 'postprocessing'
  | 'saved'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'blocked';

export type BrandbookProductBundle = 'merch_basic' | 'office_basic';

export interface BrandbookAgentRunInput {
  projectId?: ID;
  taskId?: ID;
  logoFileId?: ID;
  productBundle: BrandbookProductBundle;
  preferences?: string[];
  outputLanguage?: string;
  watermarkText?: string;
  contactBlock?: string;
}

export interface BrandbookAgentRunMetadata {
  pipelineType: AgentPipelineType;
  outputFormat: string;
  previewFormat: string;
}

export interface BrandbookAgentRunOutput {
  previewFileId?: ID;
  finalFileId?: ID;
  metadata: BrandbookAgentRunMetadata;
}

export interface BrandbookAgentRun {
  id: ID;
  status: AgentRunStatus;
  input: BrandbookAgentRunInput;
  output?: BrandbookAgentRunOutput;
}

export interface BrandbookAgentRunRecord {
  id: ID;
  organizationId: ID;
  createdBy: ID;
  projectId?: ID;
  taskId?: ID;
  status: AgentRunStatus;
  productBundle: BrandbookProductBundle;
  preferences?: string[];
  outputLanguage?: string;
  watermarkText?: string;
  contactBlock?: string;
  logoFileId?: ID;
  metadata?: BrandbookAgentRunMetadata;
  createdAt: string;
  updatedAt: string;
}

export type BrandbookAgentMessageRole = 'assistant' | 'user' | 'system';

export interface BrandbookAgentMessageRecord {
  id: ID;
  runId: ID;
  createdBy?: ID;
  role: BrandbookAgentMessageRole;
  content: string;
  createdAt: string;
}

export type BrandbookAgentArtifactKind = 'preview' | 'final';

export interface BrandbookAgentArtifactRecord {
  id: ID;
  runId: ID;
  fileId: ID;
  kind: BrandbookAgentArtifactKind;
  createdAt: string;
}

export interface ProjectCardTaskStats {
  total: number;
  overdue: number;
  important: number;
  completed: number;
}

export interface ProjectCardOwner extends WorkspaceUser { }

export interface ProjectCardMember extends WorkspaceUser {
  role: ProjectMember['role'];
}

export interface ProjectCardWorkspace {
  id: ID;
  name: string;
}

export interface ProjectCard {
  id: ID;
  workspace: ProjectCardWorkspace;
  title: string;
  description: string;
  type?: ProjectType;
  visibility: ProjectVisibility;
  status: ProjectCardStatus; // Legacy status for cards
  owner: ProjectCardOwner;
  members: ProjectCardMember[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  progress: number;
  tasks: ProjectCardTaskStats;
  budget: {
    planned: string | null;
    spent: string | null;
  };
  permissions: {
    // [PLAN:S2-110] Stage 2 cards раскрывают действия по ролям для обзора проектов.
    canArchive: boolean;
    canInvite: boolean;
    canCreateTask: boolean;
    canView: boolean;
  };
  deadline?: string;
  stage?: ProjectStage;
  workflowId?: ID;
}

export interface ProjectCardFilters {
  status?: 'all' | ProjectCardStatus;
  ownerIds?: ID[];
  memberIds?: ID[];
  tags?: string[];
  dateField?: 'createdAt' | 'deadline';
  dateFrom?: string | null;
  dateTo?: string | null;
  workspaceIds?: ID[];
  visibility?: ProjectVisibility | 'all';
  types?: ProjectType[];
}

export interface Workspace {
  id: ID;
  accountId: ID;
  name: string;
  description?: string;
  visibility: ProjectVisibility;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  workspaceId: ID;
  userId: ID;
  role: ProjectMember['role'];
}

export interface Account {
  id: ID;
  name: string;
  ownerId: ID;
  createdAt: string;
  updatedAt: string;
}

export interface AccountMember {
  accountId: ID;
  userId: ID;
  role: ProjectMember['role'];
}

export type PlatformModuleStatus = 'enabled' | 'disabled';

export type PlatformAudience = 'everyone' | 'admins' | 'beta';

export interface PlatformModule {
  id: ID;
  parentId: ID | null;
  code: string;
  label: string;
  summary?: string;
  path?: string;
  status: PlatformModuleStatus;
  defaultAudience: PlatformAudience;
  testers: ID[];
  tags: string[];
  sortOrder: number;
  updatedAt: string;
  updatedBy: ID;
}

export interface PlatformModuleNode extends PlatformModule {
  children?: PlatformModuleNode[];
  effectiveStatus?: PlatformModuleStatus;
  inherited?: boolean;
}

export type PlatformUserStatus = 'active' | 'suspended' | 'invited';

export type PlatformRole =
  | 'productAdmin'
  | 'featureAdmin'
  | 'supportAgent'
  | 'financeAdmin'
  | 'betaTester'
  | 'viewer';

export interface PlatformUserControl {
  userId: ID;
  status: PlatformUserStatus;
  roles: PlatformRole[];
  testerAccess: ID[];
  notes?: string;
  updatedAt: string;
  updatedBy: ID;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'comment_added'
  | 'deadline_approaching'
  | 'project_invite';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: ID;
  taskId?: ID;
  relatedEntityId?: ID;
  status: NotificationStatus;
  createdAt: string;
  readAt?: string;
}

// --- Invites via messaging (Org Invite Threads) ---
// Memory-first MVP types to support chat-like threads around organization invites.

export type InviteThreadParticipantRole = 'admin' | 'member';

export interface InviteThread {
  id: ID;
  orgInviteId: ID;
  organizationId: ID;
  createdByUserId: ID;
  inviteeUserId?: ID;
  inviteeEmail?: string;
  previewProjectIds?: ID[];
  createdAt: string;
  updatedAt: string;
}

export interface InviteThreadParticipant {
  id: ID;
  threadId: ID;
  userId?: ID;
  email?: string;
  role: InviteThreadParticipantRole;
  createdAt: string;
}

export interface InviteThreadMessage {
  id: ID;
  threadId: ID;
  authorId: ID;
  body: string;
  createdAt: string;
}

export interface Organization {
  id: ID;
  ownerId: ID;
  name: string;
  description?: string;
  type: 'open' | 'closed';
  kind: 'personal' | 'business';
  isPublicInDirectory: boolean;
  status?: OrganizationStatus; // 'active' | 'archived' | 'deleted'
  closedAt?: Date;
  closureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: ID;
  organizationId: ID;
  userId: ID;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
}

// Organization Closure Types
export type OrganizationStatus = 'active' | 'archived' | 'deleted';

export type ArchiveRetentionPeriod = 30 | 60 | 90;

export interface OrganizationArchive {
  id: ID;
  organizationId: ID;
  organizationName: string;
  ownerId: ID;
  closedAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'deleted';
  retentionDays: ArchiveRetentionPeriod;
  snapshot: {
    membersCount: number;
    projectsCount: number;
    documentsCount: number;
    totalStorageBytes: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ArchivedDocument {
  id: ID;
  archiveId: ID;
  originalDocumentId: ID;
  originalProjectId: ID;
  projectName: string;
  title: string;
  type?: string;
  fileId: ID;
  fileUrl: string;
  fileSizeBytes: number;
  metadata?: Record<string, unknown>;
  archivedAt: string;
  expiresAt: string;
}

export type ClosureBlockerType = 'financial' | 'data';
export type ClosureBlockerSeverity = 'blocking' | 'warning' | 'info';

export interface ClosureBlocker {
  moduleId: string;
  type: ClosureBlockerType;
  severity: ClosureBlockerSeverity;
  id: string;
  title: string;
  description: string;
  actionRequired?: string;
  actionUrl?: string;
}

export interface ArchivableData {
  moduleId: string;
  type: string;
  id: string;
  title: string;
  sizeBytes?: number;
  metadata?: Record<string, unknown>;
}

export interface ClosureCheckResult {
  moduleId: string;
  moduleName: string;
  blockers: ClosureBlocker[];
  archivableData: ArchivableData[];
}

export interface OrganizationClosurePreview {
  canClose: boolean;
  blockers: ClosureBlocker[];
  warnings: ClosureBlocker[];
  archivableData: ArchivableData[];
  impact: {
    projects: number;
    tasks: number;
    members: number;
    invites: number;
    documents: number;
    expenses: number;
  };
}

export interface OrganizationClosureResult {
  success: boolean;
  organizationId: string;
  archiveId: string;
  closedAt: string;
  deleted: {
    projects: number;
    tasks: number;
    members: number;
    invites: number;
    documents: number;
  };
}
