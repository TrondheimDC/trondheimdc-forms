"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { logout as endSession, getUser, type User } from "@/lib/session"

type Session = {
  // undefined until mounted, null when nobody is logged in.
  user: User | null | undefined
  logout: () => Promise<void>
}

const SessionContext = createContext<Session>({
  user: undefined,
  logout: async () => {},
})

export const SessionProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    void getUser().then(setUser)
  }, [])

  const logout = useCallback(async () => {
    await endSession()
    setUser(null)
    // Whatever is on screen may have been loaded with the login.
    window.location.reload()
  }, [])

  return (
    <SessionContext.Provider value={{ user, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => useContext(SessionContext)
