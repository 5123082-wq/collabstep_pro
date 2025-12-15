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
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        ownerIdIdx: index("organization_owner_id_idx").on(table.ownerId),
        publicTypeIdx: index("organization_public_type_idx").on(table.type, table.isPublicInDirectory),
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
        createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    },
    (table) => ({
        orgUserIdx: uniqueIndex("organization_member_org_user_idx").on(table.organizationId, table.userId),
        userIdIdx: index("organization_member_user_id_idx").on(table.userId),
    })
);

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
            .references(() => organizations.id), // The organization paying
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
