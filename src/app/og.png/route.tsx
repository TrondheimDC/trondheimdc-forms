// The site's own link preview, /og.png (src/lib/og-image.tsx).
import { renderOgImage } from "@/lib/og-image"

export const dynamic = "force-static"

export const GET = () => renderOgImage()
