import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@collabverse/api/db/config"
import { eq } from "drizzle-orm"
import { userControls } from "@collabverse/api/db/schema"
import { getAuthSecret } from "./get-auth-secret"

// Base auth configuration for middleware (Edge runtime compatible)
// Does NOT include Credentials provider to avoid Node.js crypto dependency
export const { handlers: baseHandlers, auth, signIn: baseSignIn, signOut } = NextAuth({
    secret: getAuthSecret(),
    adapter: DrizzleAdapter(db),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
        }),
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
