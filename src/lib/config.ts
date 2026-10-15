import config from "../../forms.config.json"

export type ConfigForm = { slug: string; shareHash: string; title: string }

export const configForms: ConfigForm[] = config.forms

export const configForm = (slug: string) =>
  configForms.find((f) => f.slug === slug)

// scripts/dev.mjs sets this when NEXTCLOUD_URL points development elsewhere.
export const NEXTCLOUD_URL = (
  process.env.NEXT_PUBLIC_NEXTCLOUD_URL || config.nextcloudUrl
).replace(/\/$/, "")

export const OAUTH_CLIENT_ID = config.oauthClientId
