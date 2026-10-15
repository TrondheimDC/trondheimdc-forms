import { NEXTCLOUD_URL, OAUTH_CLIENT_ID } from "./config"

// "Log in with Nextcloud", entirely in the browser, the way regnskap logs in
// to Fiken: the authorization code comes back to /auth/callback, is
// exchanged here, and the tokens live in sessionStorage. They go with the
// tab, and no server keeps them.
//
// Two differences from Fiken. Nextcloud has no PKCE and wants the client
// secret on the token request, so that request goes to /oauth/token on this
// site, where nginx adds the secret (nginx/forms.trondheimdc.no.conf) and
// it never reaches this code. And Nextcloud tokens have no scopes: they can
// do anything the user can. Keep the site free of third-party scripts and
// raw HTML (see the CSP), and only ever send the token to the Forms paths
// nginx forwards.

const TOKEN_KEY = "nextcloud.token"
const PENDING_KEY = "nextcloud.pending-login"
const EXPIRY_MARGIN_MS = 60_000

export type User = { id: string; displayName: string }

type StoredToken = {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

// nginx only forwards to Nextcloud with this header (see the nginx config).
export const OCS_HEADERS = {
  "OCS-APIRequest": "true",
  Accept: "application/json",
}

const readToken = (): StoredToken | undefined => {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as StoredToken) : undefined
  } catch {
    return undefined
  }
}

export const isLoggedIn = () => readToken() !== undefined

const randomString = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("")

// Only a path on this site; "//host" or a full URL would leave it.
export const safeReturn = (path: unknown) =>
  typeof path === "string" && /^\/(?!\/)[A-Za-z0-9/_-]*$/.test(path)
    ? path
    : "/"

const requestToken = async (params: Record<string, string>) => {
  const res = await fetch("/oauth/token", {
    method: "POST",
    headers: {
      ...OCS_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  })
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
  }
  if (!res.ok || !json.access_token || !json.refresh_token) {
    throw new Error(`Nextcloud: ${json.error ?? res.status}`)
  }
  const token: StoredToken = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  }
  // Nextcloud rotates the refresh token on every use: store the new one
  // before anything can try the spent one.
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  return token
}

// Off to Nextcloud's login and consent. It sends the visitor back to the
// client's registered redirect URL, /auth/callback.
export const startLogin = () => {
  const state = randomString()
  sessionStorage.setItem(
    PENDING_KEY,
    JSON.stringify({ state, returnTo: safeReturn(window.location.pathname) }),
  )
  const url = new URL(`${NEXTCLOUD_URL}/index.php/apps/oauth2/authorize`)
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: OAUTH_CLIENT_ID,
    state,
  }).toString()
  window.location.assign(url)
}

export class LoginError extends Error {
  constructor(
    message: string,
    // Where the login started, to go back to with ?login=failed.
    readonly returnTo: string,
  ) {
    super(message)
  }
}

// On /auth/callback. Returns the path to go back to; throws a LoginError
// otherwise.
export const completeLogin = async (params: URLSearchParams) => {
  const pending = sessionStorage.getItem(PENDING_KEY)
  sessionStorage.removeItem(PENDING_KEY)
  if (!pending) throw new LoginError("No login started in this tab", "/")
  const { state, returnTo } = JSON.parse(pending) as {
    state: string
    returnTo: string
  }
  const back = safeReturn(returnTo)
  if (params.get("state") !== state) {
    throw new LoginError("State mismatch", back)
  }
  const code = params.get("code")
  if (!code) throw new LoginError(params.get("error") ?? "No code", back)

  try {
    await requestToken({ grant_type: "authorization_code", code })
  } catch (error) {
    throw new LoginError(String(error), back)
  }
  return back
}

let refreshing: Promise<StoredToken | undefined> | null = null

// One refresh at a time: a second one would present a spent refresh token.
const refresh = () => {
  const token = readToken()
  if (!token) return Promise.resolve(undefined)
  refreshing ??= requestToken({
    grant_type: "refresh_token",
    refresh_token: token.refreshToken,
  })
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

export const getUser = async (): Promise<User | null> => {
  if (!isLoggedIn()) return null
  try {
    const res = await ncFetch("/ocs/v2.php/cloud/user?format=json")
    if (!res.ok) return null
    const body = (await res.json()) as {
      ocs?: { data?: { id?: string; displayname?: string } }
    }
    const id = body.ocs?.data?.id
    return id ? { id, displayName: body.ocs?.data?.displayname || id } : null
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
