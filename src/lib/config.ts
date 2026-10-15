import config from "../../forms.config.json"

export type ConfigForm = { slug: string; shareHash: string; title: string }

export const configForms: ConfigForm[] = config.forms

export const configForm = (slug: string) =>
  configForms.find((f) => f.slug === slug)

// scripts/dev.mjs sets this when NEXTCLOUD_URL points development elsewhere.
export const NEXTCLOUD_URL = (
  process.env.NEXT_PUBLIC_NEXTCLOUD_URL || config.nextcloudUrl
).replace(/\/$/, "")

// "Log in with Nextcloud" is parked: only public forms for now. Turning it
// on also needs the login locations in nginx (nginx/forms-login.conf) and
// the OAuth client (docs/deploy.md).
export const LOGIN_ENABLED: boolean = config.login

export const OAUTH_CLIENT_ID = config.oauthClientId
