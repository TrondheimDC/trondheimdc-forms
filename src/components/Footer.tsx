"use client"

import { useTranslation } from "react-i18next"

export const Footer = () => {
  const { t } = useTranslation("common", { keyPrefix: "footer" })

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <p>
          © {new Date().getFullYear()} TrondheimDC · {t("orgNr")} 936657788
        </p>
        <a href={`mailto:${t("contact")}`} className="hover:text-foreground">
          {t("contact")}
        </a>
      </div>
    </footer>
  )
}
