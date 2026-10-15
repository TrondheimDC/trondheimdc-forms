import config from "../../forms.config"

export type ConfigForm = {
  slug: string
  shareHash: string
  // The page title and the headline on its link preview.
  title: string
  // The link preview's text, if the site's own doesn't fit.
  description?: string
  // One answer per person, kept in this browser. Nextcloud takes any number
  // through a public link and can't be told otherwise, so this is a guard
  // against sending twice by accident, not a hard limit.
  oneAnswer?: boolean
}

// The shape of forms.config.ts.
export type FormsConfig = {
  // "Log in with Nextcloud", parked for now (see LOGIN_ENABLED).
  login: boolean
  nextcloudUrl: string
  // Not secret: it ends up in the JS bundle anyway.
  oauthClientId: string
  forms: ConfigForm[]
}

export const configForms: ConfigForm[] = config.forms

export const configForm = (slug: string) =>
  configForms.find((f) => f.slug === slug)

// Set in .env.local to point development at another Nextcloud.
export const NEXTCLOUD_URL = (
  process.env.NEXT_PUBLIC_NEXTCLOUD_URL || config.nextcloudUrl
).replace(/\/$/, "")

// "Log in with Nextcloud" is parked: only public forms for now. Turning it
// on also needs the login's locations in nginx (docs/deploy.md) and
// the OAuth client (docs/deploy.md).
export const LOGIN_ENABLED: boolean = config.login

export const OAUTH_CLIENT_ID = config.oauthClientId
