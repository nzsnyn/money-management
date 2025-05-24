import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"

export function useRequireAuth() {
  const { data: session, status } = useSession()

  if (status === "loading") return { session: null, loading: true }
  if (status === "unauthenticated") redirect("/auth/signin")

  return { session, loading: false }
}

export function useAuth() {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
  }
}
