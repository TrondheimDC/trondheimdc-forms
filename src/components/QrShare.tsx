"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { copy } from "@/copy"
import { SITE_URL } from "@/lib/metadata"
import { type QrLook, qrDataUrl, qrPng, qrSvg } from "@/lib/qr"
import { cn } from "@/lib/utils"

// The share page's QR code (src/lib/qr.ts) and what to do with it: download
// it for a poster or slide, copy it into a chat, or share it from a phone.
// `path` is null until the page knows it (/s/{hash}/share reads it from the
// address), and the code's square is held meanwhile, as is the title's line.
export const QrShare = ({
  path,
  title,
  name,
}: {
  path: string | null
  // null while it's being loaded; undefined for a form with no known title.
  title?: string | null
  // The downloaded file's name, without the extension.
  name: string
}) => {
  const [look, setLook] = useState<QrLook>("green")
  const [canShare, setCanShare] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const link = path === null ? null : `${SITE_URL}${path}`
  const svg = useMemo(() => (link ? qrSvg(link, look) : null), [link, look])
  const shown = link?.replace(/^https:\/\//, "")

  // Only the browser knows, so asked after hydration.
  useEffect(() => {
    const probe = new File([], "qr.png", { type: "image/png" })
    setCanShare(navigator.canShare?.({ files: [probe] }) ?? false)
  }, [])

  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(null), 4000)
    return () => clearTimeout(timer)
  }, [status])

  const attempt = (action: () => Promise<string | null>) => () => {
    action().then(setStatus, (error: unknown) => {
      // Closing the share sheet isn't a failure.
      if (error instanceof DOMException && error.name === "AbortError") return
      setStatus(copy.share.failed)
    })
  }

  const download = (blob: Blob, extension: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${name}.${extension}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const png = async () => {
    if (svg) download(await qrPng(svg), "png")
    return null
  }
  const svgFile = async () => {
    if (svg) download(new Blob([svg], { type: "image/svg+xml" }), "svg")
    return null
  }
  // The PNG as a promise, not awaited first: Safari only lets a page write
  // to the clipboard straight from the click.
  const copyImage = async () => {
    if (!svg) return null
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": qrPng(svg) }),
    ])
    return copy.share.copiedImage
  }
  const copyLink = async () => {
    if (!link) return null
    await navigator.clipboard.writeText(link)
    return copy.share.copiedLink
  }
  const share = async () => {
    if (!svg || !link) return null
    const file = new File([await qrPng(svg)], `${name}.png`, {
      type: "image/png",
    })
    await navigator.share({
      files: [file],
      title: title ?? undefined,
      url: link,
    })
    return null
  }

  return (
    <section className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <p className="mb-3 font-display text-sm text-muted-foreground">
          {copy.share.kicker}
        </p>
        <h1 className={cn("text-4xl", title === null && "invisible")}>
          {title === null ? copy.share.kicker : (title ?? copy.share.untitled)}
        </h1>

        <div className="mt-8 aspect-square w-full max-w-80">
          {svg && link ? (
            // biome-ignore lint/performance/noImgElement: a data: URL drawn here, nothing for next/image to do
            <img
              src={qrDataUrl(svg)}
              alt={copy.share.alt({ link })}
              className="size-full"
            />
          ) : (
            <div className="size-full animate-pulse rounded-3xl bg-card" />
          )}
        </div>
        <p className="mt-4 min-h-6 break-all font-display text-muted-foreground">
          {shown}
        </p>

        <fieldset className="mt-6 flex flex-col items-center gap-2">
          <legend className="sr-only">{copy.share.lookLabel}</legend>
          <div className="flex gap-2">
            {(["green", "black"] as const).map((option) => (
              <Button
                key={option}
                size="sm"
                variant={look === option ? "secondary" : "outline"}
                aria-pressed={look === option}
                onClick={() => setLook(option)}
              >
                {copy.share[option]}
              </Button>
            ))}
          </div>
          <p className="min-h-5 text-sm text-muted-foreground">
            {look === "black" ? copy.share.blackHint : null}
          </p>
        </fieldset>

        <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center">
          {canShare && (
            <Button onClick={attempt(share)} disabled={!svg}>
              {copy.share.share}
            </Button>
          )}
          <Button
            variant={canShare ? "outline" : "default"}
            onClick={attempt(png)}
            disabled={!svg}
          >
            {copy.share.png}
          </Button>
          <Button variant="outline" onClick={attempt(svgFile)} disabled={!svg}>
            {copy.share.svg}
          </Button>
          <Button
            variant="outline"
            onClick={attempt(copyImage)}
            disabled={!svg}
          >
            {copy.share.copyImage}
          </Button>
          <Button variant="outline" onClick={attempt(copyLink)} disabled={!svg}>
            {copy.share.copyLink}
          </Button>
        </div>

        <Button asChild variant="link" className="mt-8">
          <a href={path ? `${path}/poster` : undefined}>{copy.share.poster}</a>
        </Button>
      </div>

      <p
        aria-live="polite"
        className={cn(
          "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-primary px-5 py-2.5 font-display text-sm text-always-dark shadow-lg transition-[opacity,translate] duration-200 light:text-white",
          status
            ? "opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        {status}
      </p>
    </section>
  )
}
