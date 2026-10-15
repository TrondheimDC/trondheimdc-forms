import type { Metadata } from "next"

export const SITE_URL = "https://forms.trondheimdc.no"

// Rendered by app/og.png/route.tsx, which reads its size from here.
export const OG_IMAGE = {
  url: "/og.png",
  alt: "The TDC logo and “Forms”",
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
}: {
  title?: string // page name only; omit on the front page
  description: string
  path: string // e.g. "/tdc-2026"
  image?: typeof OG_IMAGE
}): Metadata => ({
  ...(title ? { title } : {}),
  description,
  alternates: { canonical: path },
  openGraph: {
    type: "website",
    siteName: "TrondheimDC",
    locale: "en_GB",
    title: title ? `TrondheimDC | ${title}` : "TrondheimDC",
    description,
    url: path,
    images: [image],
  },
})
