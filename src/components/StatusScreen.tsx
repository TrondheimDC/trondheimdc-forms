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
  celebrate,
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
  // A burst of confetti behind the illustration, for a sent form.
  celebrate?: boolean
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
      <div className="status-reveal relative w-full max-w-xs">
        {celebrate && <Confetti />}
        {illustration}
      </div>
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

// Pieces fly out from the middle of the drawing, then fall and fade
// (.confetti in globals.css). Spread evenly around the circle with a little
// wobble, so it looks thrown rather than placed.
const COLOURS = [
  "var(--color-fg-brand)",
  "var(--color-fg-brand-2)",
  "var(--color-fg-accent)",
  "var(--color-fg-accent-2)",
  "var(--color-fg-accent-3)",
]
const PIECES = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.2
  const reach = 110 + ((i * 37) % 70)
  return {
    x: Math.cos(angle) * reach,
    y: Math.sin(angle) * reach * 0.8 - 40,
    rotate: ((i * 97) % 540) - 270,
    delay: 0.4 + (i % 5) * 0.03,
    colour: COLOURS[i % COLOURS.length],
    round: i % 3 === 0,
  }
})

const Confetti = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
    {PIECES.map((p, i) => (
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list
        key={i}
        className={cn("confetti", p.round && "rounded-full")}
        style={{
          "--x": `${p.x}px`,
          "--y": `${p.y}px`,
          "--r": `${p.rotate}deg`,
          animationDelay: `${p.delay}s`,
          background: p.colour,
        }}
      />
    ))}
  </div>
)
