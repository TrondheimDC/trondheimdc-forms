import type { MetadataRoute } from "next"
import { copy } from "@/copy"

export const dynamic = "force-static"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrondheimDC Forms",
    short_name: "TDC Forms",
    description: copy.meta.description,
    lang: "en",
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
