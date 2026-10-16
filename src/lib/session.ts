import * as oauth from "oauth4webapi"
import { NEXTCLOUD_URL, OAUTH_CLIENT_ID } from "./config"
import { ocs } from "./ocs"
import * as z from "./zod"

// "Log in with Nextcloud", entirely in the browser, the way regnskap logs in
// to Fiken: the authorization code comes back to /auth/callback, is
// exchanged here, and the tokens live in sessionStorage. They go with the
// tab, and no server keeps them.
//
// Two differences from Fiken. Nextcloud has no PKCE and wants the client
// secret on the token request, so that request goes to /oauth/token on this
// site, where nginx adds the secret (the login's nginx locations, docs/deploy.md) and
// it never reaches this code. And Nextcloud tokens have no scopes: they can
// do anything the user can. Keep the site free of third-party scripts and
// raw HTML (see the CSP), and only ever send the token to the Forms paths
// nginx forwards.

const TOKEN_KEY = "nextcloud.token"
const PENDING_KEY = "nextcloud.pending-login"
const EXPIRY_MARGIN_MS = 60_000

// Read back from sessionStorage, so checked rather than trusted: anything
// else there is no login.
const storedTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.number(),
})

type StoredToken = z.infer<typeof storedTokenSchema>

const pendingLoginSchema = z.object({
  state: z.string().min(1),
  returnTo: z.string(),
})

// nginx only forwards to Nextcloud with this header (see the nginx config).
export const OCS_HEADERS = {
  "OCS-APIRequest": "true",
  Accept: "application/json",
}

const readToken = (): StoredToken | undefined => {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY)
    const token = storedTokenSchema.safeParse(raw ? JSON.parse(raw) : null)
    return token.success ? token.data : undefined
  } catch {
    return undefined
  }
}

export const isLoggedIn = () => readToken() !== undefined

// Only a path on this site; "//host" or a full URL would leave it.
export const safeReturn = (path: unknown) =>
  typeof path === "string" && /^\/(?!\/)[A-Za-z0-9/_-]*$/.test(path)
    ? path
    : "/"

// The OAuth protocol is oauth4webapi's. Nextcloud has no discovery, so its
// endpoints are given here. The token endpoint is this site's /oauth/token,
// where nginx adds the client secret: the browser sends no client auth.
const server = () =>
  ({
    issuer: NEXTCLOUD_URL,
    authorization_endpoint: `${NEXTCLOUD_URL}/index.php/apps/oauth2/authorize`,
    token_endpoint: new URL("/oauth/token", location.origin).href,
  }) satisfies oauth.AuthorizationServer
const client: oauth.Client = { client_id: OAUTH_CLIENT_ID }
const clientAuth = oauth.None()
const tokenOptions = () => ({
  headers: { "OCS-APIRequest": "true" },
  // The token endpoint is on this site: plain http only in development.
  [oauth.allowInsecureRequests]: location.protocol === "http:",
})

const storeToken = (response: oauth.TokenEndpointResponse) => {
  if (!response.refresh_token) throw new Error("No refresh token")
  const token: StoredToken = {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
  }
  // Nextcloud rotates the refresh token on every use: store the new one
  // before anything can try the spent one.
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  return token
}

// Off to Nextcloud's login and consent. It sends the visitor back to the
// client's registered redirect URL, /auth/callback.
export const startLogin = () => {
  const state = oauth.generateRandomState()
  sessionStorage.setItem(
    PENDING_KEY,
    JSON.stringify({
      state,
      returnTo: safeReturn(window.location.pathname),
    } satisfies z.infer<typeof pendingLoginSchema>),
  )
  const url = new URL(server().authorization_endpoint)
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: client.client_id,
    state,
  }).toString()
  window.location.assign(url)
}

export class LoginError extends Error {
  constructor(
    message: string,
    // Where the login started, to go back to with ?login=failed.
    readonly returnTo: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}

// On /auth/callback. Returns the path to go back to; throws a LoginError
// otherwise.
export const completeLogin = async (params: URLSearchParams) => {
  const pending = sessionStorage.getItem(PENDING_KEY)
  sessionStorage.removeItem(PENDING_KEY)
  if (!pending) throw new LoginError("No login started in this tab", "/")
  let parsed: z.infer<typeof pendingLoginSchema>
  try {
    parsed = pendingLoginSchema.parse(JSON.parse(pending))
  } catch (error) {
    throw new LoginError("The login this tab started is unreadable", "/", {
      cause: error,
    })
  }
  const { state } = parsed
  const back = safeReturn(parsed.returnTo)

  try {
    const as = server()
    const callback = oauth.validateAuthResponse(as, client, params, state)
    // Nextcloud has no PKCE (see the top of this file).
    const response = await oauth.authorizationCodeGrantRequest(
      as,
      client,
      clientAuth,
      callback,
      new URL("/auth/callback", location.origin).href,
      oauth.nopkce,
      tokenOptions(),
    )
    storeToken(
      await oauth.processAuthorizationCodeResponse(as, client, response),
    )
  } catch (error) {
    throw new LoginError(
      error instanceof Error ? error.message : String(error),
      back,
      { cause: error },
    )
  }
  return back
}

let refreshing: Promise<StoredToken | undefined> | null = null

// One refresh at a time: a second one would present a spent refresh token.
const refresh = () => {
  const token = readToken()
  if (!token) return Promise.resolve(undefined)
  refreshing ??= (async () => {
    const as = server()
    const response = await oauth.refreshTokenGrantRequest(
      as,
      client,
      clientAuth,
      token.refreshToken,
      tokenOptions(),
    )
    return storeToken(
      await oauth.processRefreshTokenResponse(as, client, response),
    )
  })()
    .catch(() => {
      sessionStorage.removeItem(TOKEN_KEY)
      return undefined
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

const freshToken = async () => {
  const token = readToken()
  if (!token) return undefined
  return token.expiresAt - EXPIRY_MARGIN_MS < Date.now() ? refresh() : token
}

// A request to one of the Nextcloud paths nginx forwards, as the logged-in
// user when there is one. Nextcloud answers a dead token with 401 (API) or a
// redirect to its login page (page routes): refresh once and try again.
export const ncFetch = async (url: string, init: RequestInit = {}) => {
  const send = (token: StoredToken | undefined) =>
    fetch(url, {
      ...init,
      headers: {
        ...OCS_HEADERS,
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token.accessToken}` } : {}),
      },
      redirect: "manual",
      cache: "no-store",
    })

  const token = await freshToken()
  const res = await send(token)
  if (token && (res.status === 401 || res.type === "opaqueredirect")) {
    const renewed = await refresh()
    if (renewed) return send(renewed)
  }
  return res
}

// Who is logged in, as /cloud/user says: the display name, or the user id
// when there is none.
const userSchema = z
  .object({ id: z.string().min(1), displayname: z.string().nullish() })
  .transform(({ id, displayname }) => ({ id, displayName: displayname || id }))

export type User = z.output<typeof userSchema>

const userResponseSchema = ocs(userSchema)

export const getUser = async (): Promise<User | null> => {
  if (!isLoggedIn()) return null
  try {
    const res = await ncFetch("/ocs/v2.php/cloud/user?format=json")
    if (!res.ok) return null
    const body = userResponseSchema.safeParse(await res.json())
    return body.success ? body.data.ocs.data : null
  } catch {
    return null
  }
}

// Revokes the token in Nextcloud, so it also disappears from the user's
// devices list, then forgets it here either way.
export const logout = async () => {
  const token = readToken()
  if (token) {
    await fetch("/ocs/v2.php/core/apppassword", {
      method: "DELETE",
      headers: { ...OCS_HEADERS, Authorization: `Bearer ${token.accessToken}` },
    }).catch(() => undefined)
  }
  sessionStorage.removeItem(TOKEN_KEY)
}
