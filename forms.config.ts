import type { FormsConfig } from "./src/lib/config"

// What the site is built with: which Nextcloud, whether logging in is on, and
// the named forms at /{slug}. All of it is public (see AGENTS.md): only list
// forms that are meant to be answered by anyone with the link.
export default {
  login: false,
  nextcloudUrl: "https://hub.trondheimdc.no",
  oauthClientId: "REPLACE_WITH_OAUTH_CLIENT_ID",
  forms: [
    {
      slug: "eksempel",
      shareHash: "sample",
      title: "Eksempel: tilbakemelding på TDC 2026",
    },
    // The survey after the conference: one answer each.
    {
      slug: "tdc-2026",
      shareHash: "TjRzjFz94LWLDJgmGRK4oW6E",
      title: "TDC 2026 Feedback",
      lang: "en",
      oneAnswer: true,
    },
    // During the day, on posters: as many answers as people like.
    {
      slug: "tdc-2026-now",
      shareHash: "bX2SECEY8b95qWCMTX7wCCxq",
      title: "TDC 2026: Tell us now",
      description:
        "Something great or something we should fix? Tell us any time during the day, as often as you like.",
      lang: "en",
    },
  ],
} satisfies FormsConfig
