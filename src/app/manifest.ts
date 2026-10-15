import type { MetadataRoute } from "next"
import { no } from "@/lib/metadata"

export const dynamic = "force-static"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrondheimDC Skjemaer",
    short_name: "TDC Skjemaer",
    description: no.meta.description,
    lang: "nb",
    // There is no front page (/ is a 404); every form has its own link.
    display: "browser",
    background_color: "#0f0f0f",
    theme_color: "#0f0f0f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
