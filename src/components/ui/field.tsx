import type * as React from "react"
import { cn } from "@/lib/utils"

// Text inputs in trondheimdc.no's look: a quiet border that turns to the
// focus ring, and the danger colour once a problem is shown (aria-invalid).
const control =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground shadow-sm transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-55 aria-invalid:border-destructive"

export const Input = ({
  className,
  ...props
}: React.ComponentProps<"input">) => (
  <input className={cn(control, "h-11", className)} {...props} />
)

export const Textarea = ({
  className,
  ...props
}: React.ComponentProps<"textarea">) => (
  <textarea
    className={cn(control, "min-h-32 resize-y", className)}
    {...props}
  />
)

export const Select = ({
  className,
  ...props
}: React.ComponentProps<"select">) => (
  <select
    className={cn(control, "h-11 cursor-pointer", className)}
    {...props}
  />
)

// Checkbox and radio: native, so they keep keyboard and form semantics, sized
// up and tinted with the brand colour.
export const Check = ({
  className,
  ...props
}: React.ComponentProps<"input">) => (
  <input
    className={cn(
      "size-5 shrink-0 cursor-pointer accent-[var(--color-fg-brand)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
      className,
    )}
    {...props}
  />
)
