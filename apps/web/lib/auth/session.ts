import { auth } from "./config"
import { redirect } from "next/navigation"

export async function getCurrentSession() {
    const session = await auth()
    return session
}

export async function getCurrentUser() {
    const session = await auth()
    return session?.user
}

export async function isAdmin() {
    const user = await getCurrentUser()
    return user?.role === 'admin'
}

export async function requireAuth() {
    const session = await getCurrentSession()
    if (!session) {
        redirect('/login')
    }
    return session
}
