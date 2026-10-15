import { cn } from "@/lib/utils"

// trondheimdc.no's TDC wordmark: the T, long D and C letter images, green on
// dark and red on light (the .tdc-wordmark styles in globals.css). The letters
// are background images so the theme can swap them before React loads, which
// makes the wordmark decorative: label it (`label`) or label its link.
export const TdcWordmark = ({
  label,
  className,
}: {
  label?: string
  className?: string
}) => (
  <span
    className={cn("tdc-wordmark", className)}
    {...(label
      ? { role: "img", "aria-label": label }
      : { "aria-hidden": true })}
  >
    <span className="tdc-wordmark__letter tdc-wordmark__letter--t" />
    <span className="tdc-wordmark__letter tdc-wordmark__letter--d" />
    <span className="tdc-wordmark__letter tdc-wordmark__letter--c" />
  </span>
)
