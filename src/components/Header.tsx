"use client"

import { useTranslation } from "react-i18next"
import { LOGIN_ENABLED } from "@/lib/config"
import { startLogin } from "@/lib/session"
import { useSession } from "./Session"
import { TdcWordmark } from "./TdcWordmark"
import { ThemeToggle } from "./ThemeToggle"

const LANGUAGES = [
  { code: "no", label: "NO" },
  { code: "en", label: "EN" },
] as const

// Forening's header without the nav: there is nothing here to navigate,
// each form is reached by its own link.
export const Header = () => {
  const { t, i18n } = useTranslation("common", { keyPrefix: "menu" })
  const { user, logout } = useSession()

  return (
    <header className="fixed left-0 right-0 top-0 z-49 h-16 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-3xl items-center justify-between px-4 sm:px-6">
        {/* There is no front page here (/ is a 404), so the mark goes home
            to trondheimdc.no. */}
        <a
          href="https://trondheimdc.no"
          className="flex items-center"
          aria-label="TrondheimDC"
        >
          <TdcWordmark />
        </a>

        <div className="flex items-center gap-1">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                if (i18n.language !== code) void i18n.changeLanguage(code)
              }}
              className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground data-[active=true]:text-foreground"
              data-active={i18n.language === code}
              aria-pressed={i18n.language === code}
              lang={code}
            >
              {label}
            </button>
          ))}
          <div className="ml-1">
            <ThemeToggle />
          </div>
          {/* Known only after mount (the login is in sessionStorage), so
              the slot keeps its width while it waits. Parked for now
              (src/lib/config.ts). */}
          {LOGIN_ENABLED && (
            <div className="ml-1 flex min-w-20 justify-end">
              {user === null && (
                <button
                  type="button"
                  onClick={startLogin}
                  className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("login")}
                </button>
              )}
              {user && (
                <button
                  type="button"
                  onClick={() => void logout()}
                  title={t("loggedInAs", { name: user.displayName })}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span className="hidden max-w-40 truncate text-foreground sm:inline">
                    {user.displayName}
                  </span>
                  {t("logout")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
