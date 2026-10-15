import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js"

// The build is a static export (output: "export"), served by nginx, which
// also forwards a few Nextcloud paths and does the login
// (nginx/forms.trondheimdc.no.conf). In development scripts/dev.mjs plays
// nginx in front of `next dev`. A static export refuses rewrites even in
// dev, so dev skips the export: the one rewrite left is nginx's
// /s/{hash} → s.html.
/** @type {(phase: string) => import("next").NextConfig} */
export default function nextConfig(phase) {
  const shared = {
    reactStrictMode: true,
    // Extra hosts allowed to load the dev server, e.g. a remote dev environment.
    // Comma-separated, as in forening, regnskap and checkin.
    allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    images: { unoptimized: true },
    logging: { fetches: { fullUrl: true } },
  }

  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return {
      ...shared,
      rewrites: async () => [{ source: "/s/:hash", destination: "/s" }],
    }
  }

  return { ...shared, output: "export" }
}
