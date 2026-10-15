import { CallbackContent } from "./content"

// Nextcloud's OAuth client sends people back here (its redirection URI).
export const metadata = { title: "Logger inn", robots: { index: false } }

export default function Callback() {
  return <CallbackContent />
}
