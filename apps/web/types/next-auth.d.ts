import { DefaultSession } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            /** The user's role. */
            role?: string
            roles?: string[]
            id: string
        } & DefaultSession["user"]
    }

    interface User {
        role?: string
        roles?: string[]
    }
}

declare module "next-auth/jwt" {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        role?: string
        roles?: string[]
        id?: string
    }
}
