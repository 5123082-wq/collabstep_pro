import {
    timestamp,
    pgTable,
    text,
    primaryKey,
    integer,
    boolean,
    index,
    uniqueIndex,
    pgEnum,
    jsonb,
    bigint,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "@auth/core/adapters";

// Enums
export const walletTypeEnum = pgEnum("wallet_type", ["user", "organization"]);
export const currencyEnum = pgEnum("currency", ["USD", "RUB"]);
export const walletStatusEnum = pgEnum("wallet_status", ["active", "frozen"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "withdrawal", "payment", "refund", "payout"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed"]);
export const contractStatusEnum = pgEnum("contract_status", ["offer", "accepted", "funded", "completed", "paid", "disputed"]);

export const organizationTypeEnum = pgEnum("organization_type", ["closed", "open"]);
export const organizationRoleEnum = pgEnum("organization_role", ["owner", "admin", "member", "viewer"]);
export const organizationMemberStatusEnum = pgEnum("organization_member_status", ["active", "inactive", "blocked"]);
export const projectRoleEnum = pgEnum("project_role", ["owner", "manager", "contributor", "viewer"]);
export const projectMemberStatusEnum = pgEnum("project_member_status", ["active", "removed"]);
export const inviteSourceEnum = pgEnum("invite_source", ["email", "link", "performer_catalog"]);
export const inviteStatusEnum = pgEnum("invite_status", [
    "pending",
    "accepted",
    "expired",
    "revoked",
    "invited",
    "previewing",
    "accepted_by_user",
    "pending_owner_approval",
    "approved",
    "rejected",
]);

export const shareScopeEnum = pgEnum("share_scope", ["view", "download"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "expired", "cancelled"]);
export const subscriptionPlanCodeEnum = pgEnum("subscription_plan_code", ["free", "pro", "max"]);
export const folderTypeEnum = pgEnum("folder_type", ["project", "task", "result", "custom"]);
export const attachmentEntityTypeEnum = pgEnum("attachment_entity_type", ["project", "task", "comment", "document", "project_chat"]);

export const users = pgTable("user", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    passwordHash: text("passwordHash"), // Nullable for OAuth users
    title: text("title"),
    department: text("department"),
    location: text("location"),
    timezone: text("timezone"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

export const accounts = pgTable(
    "account",
    {
        userId: text("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: text("type").$type<AdapterAccountType>().notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        refresh_token: text("refresh_token"),
        access_token: text("access_token"),
        expires_at: integer("expires_at"),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        session_state: text("session_state"),
    },
    (account) => ({
        compoundKey: primaryKey({
            columns: [account.provider, account.providerAccountId],
        }),
        userIdIdx: index("account_userId_idx").on(account.userId),
    })
);

export const sessions = pgTable(
    "session",
    {
        sessionToken: text("sessionToken").primaryKey(),
        userId: text("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        expires: timestamp("expires", { mode: "date" }).notNull(),
    },
    (session) => ({
        userIdIdx: index("session_userId_idx").on(session.userId),
    })
);

export const verificationTokens = pgTable(
    "verificationToken",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull(),
        expires: timestamp("expires", { mode: "date" }).notNull(),
    },
    (verificationToken) => ({
        compositePk: primaryKey({
            columns: [verificationToken.identifier, verificationToken.token],
        }),
    })
);

// Custom table for role management and access control
export const userControls = pgTable(
    "userControl",
    {
        userId: text("userId")
            .primaryKey()
            .references(() => users.id, { onDelete: "cascade" }),
        status: text("status").default("active").notNull(), // active, invited, disabled
        roles: text("roles").array().default([]), // productAdmin, featureAdmin, etc.
        testerAccess: text("testerAccess").array().default([]), // module-ai, etc.
        notes: text("notes"),
        updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
        updatedBy: text("updatedBy"),
    }
);

export const performerProfiles = pgTable(
    "performer_profile",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        specialization: text("specialization"),
        skills: jsonb("skills"),
        bio: text("bio"),
        rate: integer("rate"), // Stored as integer (e.g. cents) or maybe just number
        employmentType: text("employment_type"), // Maybe enum?
        location: text("location"),
        timezone: text("timezone"),
        isPublic: boolean("is_public").default(false).notNull(),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        userIdIdx: index("performer_profile_user_id_idx").on(table.userId),
        // Add GIN index for skills later if needed
    })
);

export const organizations = pgTable(
    "organization",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        ownerId: text("owner_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        name: text("name").notNull(),
        description: text("description"),
        type: organizationTypeEnum("type").default("closed").notNull(),
        isPublicInDirectory: boolean("is_public_in_directory").default(false).notNull(),
        status: text("status").default("active").notNull(), // 'active' | 'archived' | 'deleted'
        closedAt: timestamp("closed_at", { mode: "date" }),
        closureReason: text("closure_reason"),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        ownerIdIdx: index("organization_owner_id_idx").on(table.ownerId),
        publicTypeIdx: index("organization_public_type_idx").on(table.type, table.isPublicInDirectory),
        statusIdx: index("organization_status_idx").on(table.status),
        closedAtIdx: index("organization_closed_at_idx").on(table.closedAt),
    })
);

export const organizationMembers = pgTable(
    "organization_member",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        role: organizationRoleEnum("role").default("member").notNull(),
        status: organizationMemberStatusEnum("status").default("active").notNull(),
        isPrimary: boolean("is_primary").default(false).notNull(), // First created org is primary for user
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        orgUserIdx: uniqueIndex("organization_member_org_user_idx").on(table.organizationId, table.userId),
        userIdIdx: index("organization_member_user_id_idx").on(table.userId),
        primaryUserIdx: index("organization_member_primary_user_idx").on(table.userId, table.isPrimary),
    })
);

/**
 * @deprecated This table is deprecated and no longer used as the source of truth.
 * Use `pm_projects` table instead (created dynamically via pm-pg-adapter.ts).
 * 
 * This table exists in the schema for backward compatibility but should not be used
 * for new project creation or reading. All project operations should use pm_projects.
 * 
 * See: docs/architecture/adr/0001-canonical-database-tables.md
 */
export const projects = pgTable(
    "project",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .references(() => organizations.id, { onDelete: "cascade" }), // Nullable for now if we want to support personal projects, but plan said belongs to org
        ownerId: text("owner_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        name: text("name").notNull(),
        description: text("description"),
        stage: text("stage"),
        visibility: text("visibility"), // 'organization', 'private', 'public'
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        organizationIdIdx: index("project_organization_id_idx").on(table.organizationId),
        ownerIdIdx: index("project_owner_id_idx").on(table.ownerId),
    })
);

export const projectMembers = pgTable(
    "project_member",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        projectId: text("project_id")
            .notNull()
            .references(() => projects.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        role: projectRoleEnum("role").default("contributor").notNull(),
        status: projectMemberStatusEnum("status").default("active").notNull(),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        projectUserIdx: index("project_member_project_user_idx").on(table.projectId, table.userId),
        userIdIdx: index("project_member_user_id_idx").on(table.userId),
    })
);

export const organizationInvites = pgTable(
    "organization_invite",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        inviterId: text("inviter_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        inviteeEmail: text("invitee_email"),
        inviteeUserId: text("invitee_user_id")
            .references(() => users.id, { onDelete: "cascade" }),
        // Role that will be assigned in the organization upon accepting the invite.
        // IMPORTANT: for org-invites we use the org role enum and default to "member".
        role: organizationRoleEnum("role").default("member").notNull(),
        token: text("token").notNull(),
        source: inviteSourceEnum("source").notNull(),
        status: inviteStatusEnum("status").default("pending").notNull(),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    }
);

export const projectInvites = pgTable(
    "project_invite",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        projectId: text("project_id")
            .notNull()
            .references(() => projects.id, { onDelete: "cascade" }),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        inviterId: text("inviter_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        inviteeEmail: text("invitee_email"),
        inviteeUserId: text("invitee_user_id")
            .references(() => users.id, { onDelete: "cascade" }),
        token: text("token").notNull(),
        source: inviteSourceEnum("source").notNull(),
        status: inviteStatusEnum("status").default("invited").notNull(),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        projectInviteIdx: index("project_invite_project_idx").on(table.projectId),
        tokenIdx: index("project_invite_token_idx").on(table.token),
    })
);

// --- Finance System ---

export const wallets = pgTable(
    "wallet",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        entityId: text("entity_id").notNull(), // User ID or Organization ID
        entityType: walletTypeEnum("entity_type").notNull(),
        balance: bigint("balance", { mode: "number" }).default(0).notNull(), // Storing in cents
        currency: currencyEnum("currency").default("RUB").notNull(),
        status: walletStatusEnum("status").default("active").notNull(),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        entityIdx: index("wallet_entity_idx").on(table.entityId, table.entityType),
    })
);

export const transactions = pgTable(
    "transaction",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        walletId: text("wallet_id")
            .notNull()
            .references(() => wallets.id, { onDelete: "cascade" }),
        type: transactionTypeEnum("type").notNull(),
        amount: bigint("amount", { mode: "number" }).notNull(), // Positive for deposit, negative for withdrawal/spending
        referenceId: text("reference_id"), // ID of related entity (Project, Task, etc.)
        referenceType: text("reference_type"), // 'project', 'task', 'stripe_charge'
        status: transactionStatusEnum("status").default("pending").notNull(),
        metadata: jsonb("metadata"),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        walletIdx: index("transaction_wallet_idx").on(table.walletId),
        referenceIdx: index("transaction_reference_idx").on(table.referenceId, table.referenceType),
    })
);

export const contracts = pgTable(
    "contract",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        taskId: text("task_id").notNull(), // Link to Task (logical link if Task is not in DB)
        performerId: text("performer_id")
            .notNull()
            .references(() => users.id), // The user performing the task
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "no action" }), // The organization paying - no action to prevent accidental deletion
        amount: bigint("amount", { mode: "number" }).notNull(),
        currency: currencyEnum("currency").default("RUB").notNull(),
        status: contractStatusEnum("status").default("offer").notNull(),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        taskIdx: index("contract_task_idx").on(table.taskId),
        performerIdx: index("contract_performer_idx").on(table.performerId),
        orgIdx: index("contract_org_idx").on(table.organizationId),
    })
);

// --- Organization Closure ---

export const organizationArchives = pgTable(
    "organization_archive",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .unique()
            .references(() => organizations.id, { onDelete: "cascade" }),
        organizationName: text("organization_name").notNull(),
        ownerId: text("owner_id")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        closedAt: timestamp("closed_at", { mode: "date" }).notNull(),
        expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
        status: text("status").default("active").notNull(), // 'active' | 'expired' | 'deleted'
        retentionDays: integer("retention_days").default(30).notNull(),
        snapshot: jsonb("snapshot").notNull(), // { membersCount, projectsCount, documentsCount, totalStorageBytes }
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        ownerIdx: index("organization_archive_owner_idx").on(table.ownerId),
        expiresIdx: index("organization_archive_expires_idx").on(table.expiresAt),
        statusIdx: index("organization_archive_status_idx").on(table.status),
    })
);

export const archivedDocuments = pgTable(
    "archived_document",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        archiveId: text("archive_id")
            .notNull()
            .references(() => organizationArchives.id, { onDelete: "cascade" }),
        originalDocumentId: text("original_document_id").notNull(),
        originalProjectId: text("original_project_id").notNull(),
        projectName: text("project_name").notNull(),
        title: text("title").notNull(),
        type: text("type"),
        fileId: text("file_id").notNull(),
        fileUrl: text("file_url").notNull(),
        fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
        metadata: jsonb("metadata"),
        archivedAt: timestamp("archived_at", { mode: "date" }).defaultNow(),
        expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    },
    (table) => ({
        archiveIdx: index("archived_document_archive_idx").on(table.archiveId),
        expiresIdx: index("archived_document_expires_idx").on(table.expiresAt),
    })
);

// --- File Manager System ---

export const folders = pgTable(
    "folder",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        projectId: text("project_id")
            .references(() => projects.id, { onDelete: "cascade" }),
        taskId: text("task_id"),
        parentId: text("parent_id")
            .references((): AnyPgColumn => folders.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        type: folderTypeEnum("type"),
        createdBy: text("created_by")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        organizationIdIdx: index("folder_organization_id_idx").on(table.organizationId),
        projectIdIdx: index("folder_project_id_idx").on(table.projectId),
        taskIdIdx: index("folder_task_id_idx").on(table.taskId),
        parentIdIdx: index("folder_parent_id_idx").on(table.parentId),
        typeIdx: index("folder_type_idx").on(table.type),
    })
);

export const files = pgTable(
    "file",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        projectId: text("project_id")
            .references(() => projects.id, { onDelete: "cascade" }),
        taskId: text("task_id"),
        uploadedBy: text("uploaded_by")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        filename: text("filename").notNull(),
        mimeType: text("mime_type").notNull(),
        sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
        storageKey: text("storage_key").notNull(),
        storageUrl: text("storage_url").notNull(),
        sha256: text("sha256"),
        description: text("description"),
        folderId: text("folder_id")
            .references(() => folders.id, { onDelete: "set null" }),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        organizationIdIdx: index("file_organization_id_idx").on(table.organizationId),
        projectIdIdx: index("file_project_id_idx").on(table.projectId),
        taskIdIdx: index("file_task_id_idx").on(table.taskId),
        uploadedByIdx: index("file_uploaded_by_idx").on(table.uploadedBy),
        folderIdIdx: index("file_folder_id_idx").on(table.folderId),
        storageKeyIdx: uniqueIndex("file_storage_key_idx").on(table.storageKey),
        createdAtIdx: index("file_created_at_idx").on(table.createdAt),
    })
);

export const attachments = pgTable(
    "attachment",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        fileId: text("file_id")
            .notNull()
            .references(() => files.id, { onDelete: "cascade" }),
        projectId: text("project_id")
            .notNull()
            .references(() => projects.id, { onDelete: "cascade" }),
        linkedEntity: attachmentEntityTypeEnum("linked_entity").notNull(),
        entityId: text("entity_id"),
        createdBy: text("created_by")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        fileIdIdx: index("attachment_file_id_idx").on(table.fileId),
        projectIdIdx: index("attachment_project_id_idx").on(table.projectId),
        entityIdx: index("attachment_entity_idx").on(table.linkedEntity, table.entityId),
        createdAtIdx: index("attachment_created_at_idx").on(table.createdAt),
    })
);

export const shares = pgTable(
    "share",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        fileId: text("file_id")
            .notNull()
            .references(() => files.id, { onDelete: "cascade" }),
        token: text("token").notNull(),
        scope: shareScopeEnum("scope").notNull(),
        expiresAt: timestamp("expires_at", { mode: "date" }),
        createdBy: text("created_by")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        tokenIdx: uniqueIndex("share_token_idx").on(table.token),
        fileIdIdx: index("share_file_id_idx").on(table.fileId),
        expiresAtIdx: index("share_expires_at_idx").on(table.expiresAt),
        createdAtIdx: index("share_created_at_idx").on(table.createdAt),
    })
);

export const fileTrash = pgTable(
    "file_trash",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        fileId: text("file_id")
            .notNull()
            .references(() => files.id, { onDelete: "cascade" }),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        deletedBy: text("deleted_by")
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        deletedAt: timestamp("deleted_at", { mode: "date" }).defaultNow(),
        expiresAt: timestamp("expires_at", { mode: "date" }),
        retentionDays: integer("retention_days"),
        restoredAt: timestamp("restored_at", { mode: "date" }),
    },
    (table) => ({
        fileIdIdx: uniqueIndex("file_trash_file_id_idx").on(table.fileId),
        organizationIdIdx: index("file_trash_organization_id_idx").on(table.organizationId),
        expiresAtIdx: index("file_trash_expires_at_idx").on(table.expiresAt),
        deletedAtIdx: index("file_trash_deleted_at_idx").on(table.deletedAt),
    })
);

export const subscriptionPlans = pgTable(
    "subscription_plan",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        code: subscriptionPlanCodeEnum("code").notNull(),
        name: text("name").notNull(),
        storageLimitBytes: bigint("storage_limit_bytes", { mode: "number" }),
        fileSizeLimitBytes: bigint("file_size_limit_bytes", { mode: "number" }),
        trashRetentionDays: integer("trash_retention_days"),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        codeIdx: uniqueIndex("subscription_plan_code_idx").on(table.code),
    })
);

export const organizationSubscriptions = pgTable(
    "organization_subscription",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        planId: text("plan_id")
            .notNull()
            .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
        status: subscriptionStatusEnum("status").notNull(),
        startsAt: timestamp("starts_at", { mode: "date" }).notNull(),
        expiresAt: timestamp("expires_at", { mode: "date" }),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        organizationIdIdx: uniqueIndex("organization_subscription_organization_id_idx").on(table.organizationId),
        planIdIdx: index("organization_subscription_plan_id_idx").on(table.planId),
        statusIdx: index("organization_subscription_status_idx").on(table.status),
        expiresAtIdx: index("organization_subscription_expires_at_idx").on(table.expiresAt),
    })
);

export const organizationStorageUsage = pgTable(
    "organization_storage_usage",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        organizationId: text("organization_id")
            .notNull()
            .references(() => organizations.id, { onDelete: "cascade" }),
        totalBytes: bigint("total_bytes", { mode: "number" }).default(0).notNull(),
        fileCount: integer("file_count").default(0).notNull(),
        lastCalculatedAt: timestamp("last_calculated_at", { mode: "date" }).notNull(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        organizationIdIdx: uniqueIndex("organization_storage_usage_organization_id_idx").on(table.organizationId),
    })
);

// --- User Subscription (for multi-org limits) ---

export const userSubscriptions = pgTable(
    "user_subscription",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        userId: text("user_id")
            .notNull()
            .unique()
            .references(() => users.id, { onDelete: "cascade" }),
        planCode: subscriptionPlanCodeEnum("plan_code").default("free").notNull(),
        maxOrganizations: integer("max_organizations").default(1).notNull(), // free=1, pro/max=unlimited (-1)
        expiresAt: timestamp("expires_at", { mode: "date" }),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        userIdIdx: uniqueIndex("user_subscription_user_id_idx").on(table.userId),
        planCodeIdx: index("user_subscription_plan_code_idx").on(table.planCode),
        expiresAtIdx: index("user_subscription_expires_at_idx").on(table.expiresAt),
    })
);

// --- User Project Templates ---

export const userProjectTemplates = pgTable(
    "user_project_templates",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        userId: text("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        kind: text("kind"),
        summary: text("summary"),
        projectType: text("project_type"),
        projectStage: text("project_stage"),
        projectVisibility: text("project_visibility"),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    },
    (table) => ({
        userIdIdx: index("user_project_templates_user_id_idx").on(table.userId),
        createdAtIdx: index("user_project_templates_created_at_idx").on(table.createdAt),
    })
);

// --- Project Template Tasks ---

export const projectTemplateTasks = pgTable(
    "project_template_tasks",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => crypto.randomUUID()),
        templateId: text("template_id").notNull(),
        parentTaskId: text("parent_task_id")
            .references((): AnyPgColumn => projectTemplateTasks.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        description: text("description"),
        defaultStatus: text("default_status").notNull().default("new"),
        defaultPriority: text("default_priority"),
        defaultLabels: text("default_labels").array().default([]),
        offsetStartDays: integer("offset_start_days").notNull().default(0),
        offsetDueDays: integer("offset_due_days"),
        estimatedTime: integer("estimated_time"),
        storyPoints: integer("story_points"),
        position: integer("position").notNull().default(0),
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    },
    (table) => ({
        templateIdIdx: index("project_template_tasks_template_id_idx").on(table.templateId),
        parentTaskIdIdx: index("project_template_tasks_parent_task_id_idx").on(table.parentTaskId),
        templatePositionIdx: index("project_template_tasks_template_position_idx").on(table.templateId, table.position),
    })
);
