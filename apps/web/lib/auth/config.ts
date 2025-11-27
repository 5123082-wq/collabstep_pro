import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@collabverse/api/db/config"
import { usersRepository } from "@collabverse/api"
import { eq } from "drizzle-orm"
import { userControls } from "@collabverse/api/db/schema"
import { getDemoAccount, isDemoAuthEnabled } from "./demo-session"
import { getAuthSecret } from "./get-auth-secret"
import { ensureDemoAccountsInitialized } from "./init-demo-accounts"

const hasDbConnection = !!process.env.POSTGRES_URL || !!process.env.DATABASE_URL;
const isDbStorage = process.env.AUTH_STORAGE === 'db' && hasDbConnection;

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: getAuthSecret(),
    ...(isDbStorage ? { adapter: DrizzleAdapter(db) } : {}),
    providers: [
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? [
                Google({
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    allowDangerousEmailAccountLinking: true,
                }),
            ]
            : []),
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const email = credentials.email as string
                const password = credentials.password as string

                // Инициализируем демо-аккаунты перед проверкой
                if (isDemoAuthEnabled()) {
                    await ensureDemoAccountsInitialized();
                }

                // Check demo accounts first, but only if they exist in DB
                if (isDemoAuthEnabled()) {
                    // Проверяем только администратора
                    const adminAccount = getDemoAccount('admin');
                    if (adminAccount.email === email && adminAccount.password === password) {
                        // Проверяем, что администратор существует в БД
                        const adminUser = await usersRepository.findByEmail(adminAccount.email);
                        if (adminUser) {
                            return {
                                id: adminUser.id,
                                email: adminUser.email,
                                name: adminUser.name || 'Demo Admin',
                                image: adminUser.avatarUrl ?? null,
                                role: 'admin',
                                roles: []
                            }
                        }
                    }
                    // Явно блокируем удаленные демо-аккаунты
                    const blockedDemoEmails = [
                        'user.demo@collabverse.test',
                        'designer.demo@collabverse.test',
                        'finance.pm@collabverse.test'
                    ];
                    if (blockedDemoEmails.includes(email.toLowerCase())) {
                        return null; // Блокируем вход для удаленных пользователей
                    }
                }

                const user = await usersRepository.findByEmail(email)

                if (!user) return null

                // Блокируем удаленные демо-аккаунты
                const blockedEmails = [
                    'user.demo@collabverse.test',
                    'designer.demo@collabverse.test',
                    'finance.pm@collabverse.test'
                ];
                
                if (blockedEmails.includes(email.toLowerCase())) {
                    return null; // Блокируем вход для удаленных пользователей
                }

                // Для остальных пользователей проверяем существующий пароль
                if (!user.passwordHash) return null

                // Dynamic import to avoid bundling in Edge runtime
                const { verifyPassword } = await import("@collabverse/api/utils/password")
                const isValid = verifyPassword(password, user.passwordHash)

                if (!isValid) return null

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.avatarUrl ?? null,
                }
            }
        })
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id!
                const userWithRoles = user as { role?: string; roles?: string[] };
                token.role = userWithRoles.role
                token.roles = userWithRoles.roles

                // If role is not set (DB user), fetch from userControls
                if (!token.role) {
                    // Fetch roles from userControls
                    try {
                        const [controls] = isDbStorage
                            ? await db.select().from(userControls).where(eq(userControls.userId, user.id!))
                            : [undefined];

                        if (controls) {
                            token.roles = controls.roles ?? []
                            // Simple admin check logic
                            if (controls.roles?.includes('productAdmin') || controls.roles?.includes('featureAdmin')) {
                                token.role = 'admin'
                            } else {
                                token.role = 'user'
                            }
                        } else {
                            token.role = 'user'
                        }
                    } catch (error) {
                        // Если нет подключения к БД или таблица не существует, используем роль по умолчанию
                        token.role = 'user'
                        token.roles = []
                    }
                }
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as string
                session.user.roles = token.roles as string[]
            }
            return session
        }
    },
    pages: {
        signIn: '/login',
        error: '/login',
    }
})
