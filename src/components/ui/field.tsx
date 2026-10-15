import type * as React from "react"
import { cn } from "@/lib/utils"

// Text inputs in trondheimdc.no's look: a quiet border that turns to the
// focus ring, and the danger colour once a problem is shown (aria-invalid).
const control =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground hover:border-foreground/45 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-55 aria-invalid:border-destructive"

export const Input = ({
  className,
  ...props
}: React.ComponentProps<"input">) => (
  <input className={cn(control, "h-11", className)} {...props} />
)

// Grows with what is written (field-sizing, where the browser has it), up to
// most of the screen, then scrolls.
export const Textarea = ({
  className,
  ...props
}: React.ComponentProps<"textarea">) => (
  <textarea
    className={cn(
      control,
      "min-h-32 max-h-[60vh] resize-y [field-sizing:content]",
      className,
    )}
    {...props}
  />
)

// Native, so phones get their own picker, with the browser's arrow swapped
// for one in the site's style.
export const Select = ({
  className,
  ...props
}: React.ComponentProps<"select">) => (
  <div className="relative">
    <select
      className={cn(
        control,
        "h-11 cursor-pointer appearance-none pr-10",
        className,
      )}
      {...props}
    />
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </div>
)

// Checkbox and radio: the native input, visually hidden but still the one
// that is focused, clicked and announced, followed by the box it is drawn
// as. Ticks and dots animate in (.choice-* in globals.css). Wrap both in a
// <label>.
export const Check = ({
  type,
  className,
  ...props
}: React.ComponentProps<"input"> & { type: "checkbox" | "radio" }) => (
  <>
    <input type={type} className="peer sr-only" {...props} />
    <span
      aria-hidden="true"
      className={cn(
        "choice-box",
        type === "radio" ? "rounded-full" : "rounded-[6px]",
        className,
      )}
    >
      {type === "radio" ? (
        <span className="choice-dot" />
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="choice-tick">
          <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
        </svg>
      )}
    </span>
  </>
)
