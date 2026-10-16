import { SharedPoster } from "../from-address"

// Any form's poster, /s/{hash}/poster: add /poster to the form's link to get
// it. nginx serves this one page for all of them; `next dev` rewrites to it
// (next.config.ts).
export const metadata = {
  title: "Poster",
  robots: { index: false },
}

export default function SharedPosterPage() {
  return <SharedPoster />
}
