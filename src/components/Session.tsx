"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { logout as endSession, getUser } from "@/lib/session"

// Who is logged in: undefined until known, null when nobody is. The login
// only changes with a page load (back from /auth/callback, or logout below),
// so it is asked for once.
export const useSession = () => {
  const queryClient = useQueryClient()
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: getUser,
    staleTime: Number.POSITIVE_INFINITY,
  })

  const logout = useCallback(async () => {
    await endSession()
    queryClient.setQueryData(["user"], null)
    // Whatever is on screen may have been loaded with the login.
    window.location.reload()
  }, [queryClient])

  return { user, logout }
}
