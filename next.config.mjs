import { readFileSync } from "node:fs"
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js"

const forms = JSON.parse(
  readFileSync(new URL("./forms.config.json", import.meta.url), "utf8"),
)

// The build is a static export (output: "export"), served by nginx, which
// also forwards the Nextcloud paths (nginx/forms.trondheimdc.no.conf). A
// static export refuses rewrites even in dev, so dev skips the export and
// does nginx's rewrites itself: /s/{hash} → s.html, and the two Nextcloud
// paths public forms need. nginx's other rules (methods, sandboxing
// Nextcloud's HTML) are production's; dev only needs the paths to work.
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
    // NEXT_PUBLIC_NEXTCLOUD_URL in .env.local points dev at another Nextcloud.
    const nextcloud = (
      process.env.NEXT_PUBLIC_NEXTCLOUD_URL || forms.nextcloudUrl
    ).replace(/\/$/, "")
    // Like nginx: only what the site's own fetches send.
    const api = [{ type: "header", key: "ocs-apirequest", value: "true" }]
    return {
      ...shared,
      rewrites: async () => [
        { source: "/s/:hash", destination: "/s" },
        // A public form's share page (src/lib/share-page.ts).
        {
          source: "/apps/forms/s/:hash",
          has: api,
          destination: `${nextcloud}/index.php/apps/forms/s/:hash`,
        },
        // Submitting an answer (src/lib/submit.ts).
        {
          source: "/ocs/v2.php/apps/forms/api/v3/forms/:id/submissions",
          has: api,
          destination: `${nextcloud}/ocs/v2.php/apps/forms/api/v3/forms/:id/submissions`,
        },
      ],
    }
  }

  return { ...shared, output: "export" }
}
