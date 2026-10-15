import { notFound } from "next/navigation"
import { LOGIN_ENABLED } from "@/lib/config"
import { CallbackContent } from "./content"

// Nextcloud's OAuth client sends people back here (its redirection URI).
export const metadata = { title: "Logging in", robots: { index: false } }

export default function Callback() {
  // Logging in is parked (src/lib/config.ts).
  if (!LOGIN_ENABLED) notFound()
  return <CallbackContent />
}
