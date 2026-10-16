import { SharedShare } from "../from-address"

// Any form's QR code, /s/{hash}/share: add /share to the form's link to get
// it. nginx serves this one page for all of them; `next dev` rewrites to it
// (next.config.ts).
export const metadata = {
  title: "Share",
  robots: { index: false },
}

export default function SharedSharePage() {
  return <SharedShare />
}
