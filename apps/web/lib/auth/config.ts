import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@collabverse/api/db/config"
import { usersRepository } from "@collabverse/api"
import { eq } from "drizzle-orm"
import { userControls } from "@collabverse/api/db/schema"
import { getDemoAccount, isDemoAuthEnabled, type DemoRole } from "./demo-session"
import { getAuthSecret } from "./get-auth-secret"

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: getAuthSecret(),
    adapter: DrizzleAdapter(db),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
        }),
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

                // Check demo accounts first
                if (isDemoAuthEnabled()) {
                    const roles: DemoRole[] = ['admin', 'user'];
                    for (const role of roles) {
                        const account = getDemoAccount(role);
                        if (account.email === email && account.password === password) {
                            return {
                                id: email,
                                email: email,
                                name: role === 'admin' ? 'Demo Admin' : 'Demo User',
                                image: null,
                                role: role,
                                roles: []
                            }
                        }
                    }
                }

                const user = await usersRepository.findByEmail(email)

                if (!user || !user.passwordHash) return null

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
                token.role = (user as any).role
                token.roles = (user as any).roles

                // If role is not set (DB user), fetch from userControls
                if (!token.role) {
                    // Fetch roles from userControls
                    const [controls] = await db.select().from(userControls).where(eq(userControls.userId, user.id!))
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
