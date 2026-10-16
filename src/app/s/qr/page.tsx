import { SharedQrContent } from "./content"

// Any form's QR code, /s/{hash}/qr: add /qr to the form's link to get it.
// nginx serves this one page for all of them; `next dev` rewrites to it
// (next.config.ts).
export const metadata = {
  title: "QR code",
  robots: { index: false },
}

export default function SharedQrPage() {
  return <SharedQrContent />
}
