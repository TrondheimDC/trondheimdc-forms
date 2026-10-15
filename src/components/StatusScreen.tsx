import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// One screen for every dead end and end state: 404, errors, and a form that
// is closed, needs a login, was sent, and so on. Checkin's ErrorScreen, in
// the page between header and footer (whose header already carries the TDC
// mark): glow, an illustration, a short line of copy and what to do next.
export const StatusScreen = ({
  tone = "brand",
  illustration,
  code,
  kicker,
  title,
  body,
  actions,
  digest,
}: {
  tone?: "brand" | "danger"
  illustration: ReactNode
  // Small and uppercase above the title, e.g. "404".
  code?: string
  // Which form this is about, above the title.
  kicker?: string
  title: string
  body?: ReactNode
  actions?: ReactNode
  // Next's error digest, so a report can be matched to the server log.
  digest?: string
}) => (
  <section
    className={cn(
      "relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:px-6",
      tone === "danger"
        ? "[--status-tone:var(--color-bg-danger)]"
        : "[--status-tone:var(--color-fg-brand)]",
    )}
  >
    <div aria-hidden className="status-glow-a" />
    <div aria-hidden className="status-glow-b" />

    <div className="flex w-full max-w-md flex-col items-center text-center">
      <div className="status-reveal w-full max-w-xs">{illustration}</div>
      <div className="status-stagger mt-6 flex flex-col items-center">
        {code || kicker ? (
          <p
            className={cn(
              "mb-3",
              code
                ? "font-mono text-xs font-bold uppercase tracking-[0.3em]"
                : "font-display text-sm text-muted-foreground",
              code && (tone === "danger" ? "text-danger" : "text-primary"),
            )}
          >
            {code ?? kicker}
          </p>
        ) : null}
        <h1 className="text-4xl">{title}</h1>
        {body ? (
          <div className="mt-3 max-w-sm text-base text-muted-foreground">
            {body}
          </div>
        ) : null}
        {actions ? (
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {actions}
          </div>
        ) : null}
        {digest ? (
          <p className="mt-6 select-all font-mono text-xs text-muted-foreground">
            Feilkode: {digest}
          </p>
        ) : null}
      </div>
    </div>
  </section>
)
