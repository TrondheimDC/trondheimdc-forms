import config from "../../forms.config.json"

export type ConfigForm = {
  slug: string
  shareHash: string
  // The page title and the headline on its link preview.
  title: string
  // The link preview's text, if the site's own doesn't fit.
  description?: string
  // The language the form is written in, for the page around it. The site
  // starts in Norwegian; "en" starts this page in English instead.
  lang?: "no" | "en"
  // One answer per person, kept in this browser. Nextcloud takes any number
  // through a public link and can't be told otherwise, so this is a guard
  // against sending twice by accident, not a hard limit.
  oneAnswer?: boolean
}

// JSON has no unions: test/config.test.ts checks `lang` is one of the two.
export const configForms = config.forms as ConfigForm[]

export const configForm = (slug: string) =>
  configForms.find((f) => f.slug === slug)

// Set in .env.local to point development at another Nextcloud.
export const NEXTCLOUD_URL = (
  process.env.NEXT_PUBLIC_NEXTCLOUD_URL || config.nextcloudUrl
).replace(/\/$/, "")

// "Log in with Nextcloud" is parked: only public forms for now. Turning it
// on also needs the login locations in nginx (nginx/forms-login.conf) and
// the OAuth client (docs/deploy.md).
export const LOGIN_ENABLED: boolean = config.login

export const OAUTH_CLIENT_ID = config.oauthClientId
