import type { Metadata } from "next"
import no from "../../public/locales/no/common.json"

export const SITE_URL = "https://forms.trondheimdc.no"

// Page titles and descriptions are read straight from the Norwegian locale:
// every page is prerendered once, in Norwegian, and that is what crawlers and
// link previews see. Switching to English happens in the browser afterwards.
export { no }

// Rendered by app/og.png/route.tsx, which reads its size from here.
export const OG_IMAGE = {
  url: "/og.png",
  alt: "TDC-logoen og «Skjemaer»",
  width: 1200,
  height: 630,
}

// Next replaces a parent's openGraph object instead of merging it, so every
// page builds the whole thing here, image included.
export const pageMetadata = ({
  title,
  description,
  path,
}: {
  title?: string // page name only; omit on the front page
  description: string
  path: string // e.g. "/tdc-2026"
}): Metadata => ({
  ...(title ? { title } : {}),
  description,
  alternates: { canonical: path },
  openGraph: {
    type: "website",
    siteName: "TrondheimDC",
    locale: "nb_NO",
    title: title ? `TrondheimDC | ${title}` : "TrondheimDC",
    description,
    url: path,
    images: [OG_IMAGE],
  },
})
