"use client"

import { copy } from "@/copy"

export const Footer = () => {
  return (
    <footer className="print:hidden border-t border-border bg-card">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <p>© {new Date().getFullYear()} TrondheimDC</p>
        <a
          href={`mailto:${copy.footer.contact}`}
          className="hover:text-foreground"
        >
          {copy.footer.contact}
        </a>
      </div>
    </footer>
  )
}
