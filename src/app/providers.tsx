"use client"

import { MotionConfig } from "motion/react"
import { ThemeProvider } from "next-themes"
import { Footer } from "@/components/Footer"
import { Header } from "@/components/Header"
import { SessionProvider } from "@/components/Session"
import { copy } from "@/copy"

const Shell = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {copy.menu.skipToContent}
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

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider>
    {/* Motion's animations follow prefers-reduced-motion, as the CSS
        ones in globals.css do. */}
    <MotionConfig reducedMotion="user">
      <Shell>{children}</Shell>
    </MotionConfig>
  </SessionProvider>
)
