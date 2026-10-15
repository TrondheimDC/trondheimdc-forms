import type { Metadata } from "next"
import en from "../../public/locales/en/common.json"
import no from "../../public/locales/no/common.json"

export const SITE_URL = "https://forms.trondheimdc.no"

// Page titles and descriptions are read straight from the Norwegian locale:
// every page is prerendered once, in Norwegian, and that is what crawlers and
// link previews see. Switching to English happens in the browser afterwards.
export { en, no }

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
  image = OG_IMAGE,
  lang = "no",
}: {
  title?: string // page name only; omit on the front page
  description: string
  path: string // e.g. "/tdc-2026"
  image?: typeof OG_IMAGE
  lang?: "no" | "en"
}): Metadata => ({
  ...(title ? { title } : {}),
  description,
  alternates: { canonical: path },
  openGraph: {
    type: "website",
    siteName: "TrondheimDC",
    locale: lang === "en" ? "en_GB" : "nb_NO",
    title: title ? `TrondheimDC | ${title}` : "TrondheimDC",
    description,
    url: path,
    images: [image],
  },
})
