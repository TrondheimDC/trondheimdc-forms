import { notFound } from "next/navigation"
import { LOGIN_ENABLED } from "@/lib/config"
import { AdminContent } from "./content"

export const metadata = {
  title: "Dine skjemaer",
  robots: { index: false },
}

export default function Admin() {
  // Logging in is parked (src/lib/config.ts).
  if (!LOGIN_ENABLED) notFound()
  return <AdminContent />
}
