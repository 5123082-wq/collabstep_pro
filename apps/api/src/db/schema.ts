import {
    timestamp,
    pgTable,
    text,
    primaryKey,
    integer,
    boolean,
    uuid,
    index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "@auth/core/adapters";

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
