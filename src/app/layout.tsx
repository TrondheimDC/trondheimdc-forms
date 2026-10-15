import type { Metadata, Viewport } from "next"
import { copy } from "@/copy"
import { OG_IMAGE, SITE_URL } from "@/lib/metadata"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TrondheimDC | Forms",
    template: "TrondheimDC | %s",
  },
  description: copy.meta.description,
  // Pages replace this with pageMetadata(); it's what the 404 page gets.
  openGraph: { siteName: "TrondheimDC", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Browser chrome on mobile, matched to --color-bg-base in each theme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fefefe" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning: next-themes sets data-theme before React loads.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Body copy and headings, the two faces above the fold everywhere.
            See forening's layout for why only these two. */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/ibm-plex-sans-latin-400-normal.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/space-grotesk-latin-400-normal.woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
