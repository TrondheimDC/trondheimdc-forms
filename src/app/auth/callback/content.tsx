"use client"

import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { FormsLoading } from "@/components/FormsLoading"
import { completeLogin, LoginError } from "@/lib/session"

// Swaps the code for tokens, then goes back to the form the login started
// from. On failure, back there too with ?login=failed, where the login
// button is.
export const CallbackContent = () => {
  const { t } = useTranslation("common", { keyPrefix: "load" })
  // The code works once; StrictMode's second effect run must not spend it.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const params = new URLSearchParams(window.location.search)
    completeLogin(params)
      .then((back) => window.location.replace(back))
      .catch((error) => {
        console.error("Login failed:", error)
        const back = error instanceof LoginError ? error.returnTo : "/"
        window.location.replace(`${back}?login=failed`)
      })
  }, [])

  return <FormsLoading label={t("loggingIn")} />
}
