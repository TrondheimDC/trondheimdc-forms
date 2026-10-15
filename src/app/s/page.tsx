import { FormLoader } from "@/components/FormLoader"
import { no, pageMetadata } from "@/lib/metadata"

// Any public Nextcloud form, by its share hash: /s/{hash}, the same path as
// Nextcloud's own share link. nginx serves this one page for all of them;
// `next dev` rewrites to it (next.config.ts).
export const metadata = {
  ...pageMetadata({ description: no.meta.description, path: "/s" }),
  // One page for many forms: nothing here for a search engine to keep.
  robots: { index: false },
}

export default function SharedFormPage() {
  return <FormLoader />
}
