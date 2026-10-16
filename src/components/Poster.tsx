"use client"

import { type CSSProperties, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { copy } from "@/copy"
import { SITE_URL } from "@/lib/metadata"
import { qrDataUrl, qrSvg } from "@/lib/qr"
import { cn } from "@/lib/utils"

// A form's poster: the TDC mark, the form's title, its QR code (src/lib/qr.ts)
// and the short link, on a sheet in A-paper proportions. Sized in container
// units, so it is the same poster in the preview and on A4 or A3; printed,
// the sheet is the page and the rest of the site is hidden. Its colours are
// the palette's, not the theme's: paper looks the same in either theme.
// `path` is null until the page knows it (/s/{hash}/poster reads it from the
// address), and `title` null until the form has loaded.
type Paper = "white" | "black"

const PAPERS: Record<Paper, CSSProperties> = {
  white: {
    "--poster-bg": "var(--color-white-1)",
    "--poster-fg": "var(--color-black)",
    "--poster-muted": "var(--color-black-2)",
    "--poster-mark": "var(--color-black)",
  },
  black: {
    "--poster-bg": "var(--color-black)",
    "--poster-fg": "var(--color-white-1)",
    "--poster-muted": "var(--color-white-2)",
    "--poster-mark": "var(--color-green-1)",
  },
}

// trondheimdc.no's colours, as a band along the bottom edge.
const BAND = [
  "var(--color-green-1)",
  "var(--color-purple-1)",
  "var(--color-yellow-2)",
  "var(--color-pink)",
  "var(--color-blue-1)",
]

// The longer the title, the smaller, so it stays within three lines or so.
const titleSize = (title: string) =>
  title.length <= 24
    ? "text-[10cqw]"
    : title.length <= 48
      ? "text-[7.5cqw]"
      : "text-[6cqw]"

export const Poster = ({
  path,
  title,
  description,
}: {
  path: string | null
  title: string | null | undefined
  description?: string
}) => {
  const [paper, setPaper] = useState<Paper>("white")
  const link = path === null ? null : `${SITE_URL}${path}`
  const svg = useMemo(() => (link ? qrSvg(link) : null), [link])
  const heading = title ?? copy.poster.untitled

  return (
    <section className="flex flex-1 flex-col items-center gap-8 px-4 py-10 sm:px-6 print:p-0">
      <div className="flex flex-col items-center gap-4 text-center print:hidden">
        <fieldset className="flex gap-2">
          <legend className="sr-only">{copy.poster.paperLabel}</legend>
          {(["white", "black"] as const).map((option) => (
            <Button
              key={option}
              size="sm"
              variant={paper === option ? "secondary" : "outline"}
              aria-pressed={paper === option}
              onClick={() => setPaper(option)}
            >
              {copy.poster[option]}
            </Button>
          ))}
        </fieldset>
        <Button onClick={() => window.print()} disabled={!svg}>
          {copy.poster.print}
        </Button>
        <p className="max-w-sm text-sm text-muted-foreground">
          {copy.poster.hint}
        </p>
      </div>

      <article
        aria-label={heading}
        style={PAPERS[paper]}
        className={cn(
          "@container flex aspect-[1/1.4142] w-full max-w-xl flex-col overflow-hidden rounded-lg bg-(--poster-bg) text-(--poster-fg) shadow-2xl [print-color-adjust:exact]",
          // Printed: the sheet is the page, whatever its size.
          "print:fixed print:inset-0 print:aspect-auto print:max-w-none print:rounded-none print:shadow-none",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col px-[8cqw] pt-[8cqw] pb-[6cqw]">
          <div className="flex items-center justify-between">
            <TdcMark className="w-[24cqw] text-(--poster-mark)" />
            <span className="font-display text-[2.6cqw] text-(--poster-muted)">
              trondheimdc.no
            </span>
          </div>

          <h1
            className={cn(
              "mt-[9cqw] font-display font-semibold leading-[1.05] tracking-tight text-balance",
              titleSize(heading),
              title === null && "invisible",
            )}
          >
            {heading}
          </h1>
          {description && (
            <p className="mt-[3cqw] max-w-[70cqw] text-[3.4cqw] leading-snug text-(--poster-muted)">
              {description}
            </p>
          )}

          {/* The code takes what the text leaves, up to 58% of the width:
              a long title and a description shrink it, never push the
              link off the sheet. */}
          <div className="relative my-[5cqw] min-h-[30cqw] flex-1">
            {svg && link && (
              // biome-ignore lint/performance/noImgElement: a data: URL drawn here, nothing for next/image to do
              <img
                src={qrDataUrl(svg)}
                alt={copy.share.alt({ link })}
                className="absolute inset-0 m-auto aspect-square max-h-full w-[58cqw] max-w-full"
              />
            )}
          </div>

          <div className="text-center">
            <p className="font-display text-[5.5cqw] font-semibold">
              {copy.poster.scan}
            </p>
            <p className="mt-[1cqw] text-[3cqw] text-(--poster-muted)">
              {copy.poster.orGoTo}{" "}
              <span className="font-display font-semibold text-(--poster-fg)">
                {link?.replace(/^https:\/\//, "")}
              </span>
            </p>
          </div>
        </div>

        <div className="flex h-[2.5cqw]">
          {BAND.map((colour) => (
            <div
              key={colour}
              className="flex-1"
              style={{ backgroundColor: colour }}
            />
          ))}
        </div>
      </article>

      {path && (
        <Button asChild variant="link" className="print:hidden">
          <a href={`${path}/share`}>{copy.poster.back}</a>
        </Button>
      )}
    </section>
  )
}

// TDC wordmark, as in src/app/icon.svg.
const TdcMark = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 248 52"
    fill="currentColor"
    className={className}
    role="img"
    aria-label="TrondheimDC"
  >
    <path d="M10.0986 17.333H0L0 0L39.8145 0V17.333H29.7178V52H10.0986V17.333Z" />
    <path
      transform="translate(47.09 0)"
      d="M153.732 34.667C153.732 44.2406 145.983 52 136.422 52H0L0 0L136.422 0C145.983 0 153.732 7.75938 153.732 17.333V34.667Z"
    />
    <path
      transform="translate(208.1 0)"
      d="M39.8145 17.333H19.9072V34.667H39.8145V52H17.3105C7.74943 52 0.000113284 44.2407 0 34.667L0 17.333C0.000185034 7.75938 7.74948 0 17.3105 0L39.8145 0V17.333Z"
    />
  </svg>
)
