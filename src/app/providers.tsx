"use client"

import { MotionConfig } from "motion/react"
import { ThemeProvider } from "next-themes"
import { I18nextProvider, useTranslation } from "react-i18next"
import { Footer } from "@/components/Footer"
import { Header } from "@/components/Header"
import { SessionProvider } from "@/components/Session"
import i18n from "@/i18n"

// Split out so useTranslation() runs inside I18nextProvider's subtree,
// rather than in the component that renders the provider itself.
const Shell = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation("common", { keyPrefix: "menu" })

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t("skipToContent")}
      </a>
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col pt-16 outline-none"
        >
          {children}
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    <SessionProvider>
      {/* Motion's animations follow prefers-reduced-motion, as the CSS
          ones in globals.css do. */}
      <MotionConfig reducedMotion="user">
        <Shell>{children}</Shell>
      </MotionConfig>
    </SessionProvider>
  </I18nextProvider>
)
