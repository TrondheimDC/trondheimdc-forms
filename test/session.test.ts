import { beforeEach, describe, expect, it, vi } from "vitest"

// sessionStorage and fetch, as the browser has them.
const store = new Map<string, string>()
vi.stubGlobal("sessionStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
})
const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)
vi.stubGlobal("location", new URL("http://localhost:3000/"))

const { completeLogin, isLoggedIn, LoginError, ncFetch, safeReturn } =
  await import("../src/lib/session")

const tokenReply = (n: number) =>
  new Response(
    JSON.stringify({
      access_token: `AT${n}`,
      refresh_token: `RT${n}`,
      token_type: "Bearer",
      expires_in: 3600,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )

const isTokenRequest = (url: string) =>
  new URL(url, "http://localhost:3000").pathname === "/oauth/token"

const pending = (returnTo = "/s/abc") =>
  store.set("nextcloud.pending-login", JSON.stringify({ state: "S", returnTo }))

beforeEach(() => {
  store.clear()
  fetchMock.mockReset()
})

describe("completeLogin", () => {
  it("swaps the code at /oauth/token and goes back", async () => {
    pending()
    fetchMock.mockResolvedValueOnce(tokenReply(1))
    const back = await completeLogin(new URLSearchParams("code=C&state=S"))
    expect(back).toBe("/s/abc")
    expect(isLoggedIn()).toBe(true)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("http://localhost:3000/oauth/token")
    const body = new URLSearchParams(String(init.body))
    expect(body.get("grant_type")).toBe("authorization_code")
    expect(body.get("code")).toBe("C")
    const headers = new Headers(init.headers)
    expect(headers.get("OCS-APIRequest")).toBe("true")
    // The secret is nginx's to add, never the browser's.
    expect(headers.has("Authorization")).toBe(false)
    expect(body.has("client_secret")).toBe(false)
  })

  it("refuses a state it didn't start, without asking Nextcloud", async () => {
    pending()
    await expect(
      completeLogin(new URLSearchParams("code=C&state=evil")),
    ).rejects.toMatchObject({ returnTo: "/s/abc" })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(isLoggedIn()).toBe(false)
  })

  it("goes back when Nextcloud says no", async () => {
    pending()
    await expect(
      completeLogin(new URLSearchParams("error=access_denied&state=S")),
    ).rejects.toMatchObject({ returnTo: "/s/abc" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("fails cleanly without a login started in this tab", async () => {
    await expect(
      completeLogin(new URLSearchParams("code=C&state=S")),
    ).rejects.toBeInstanceOf(LoginError)
  })

  it("fails cleanly when the login this tab started is unreadable", async () => {
    store.set("nextcloud.pending-login", JSON.stringify({ state: 7 }))
    await expect(
      completeLogin(new URLSearchParams("code=C&state=S")),
    ).rejects.toBeInstanceOf(LoginError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("only goes back to paths on this site", () => {
    expect(safeReturn("/s/abc")).toBe("/s/abc")
    expect(safeReturn("//evil.example")).toBe("/")
    expect(safeReturn("https://evil.example")).toBe("/")
    expect(safeReturn(undefined)).toBe("/")
  })
})

describe("ncFetch", () => {
  it("refreshes once on 401, shared between concurrent requests", async () => {
    store.set(
      "nextcloud.token",
      JSON.stringify({
        accessToken: "AT1",
        refreshToken: "RT1",
        expiresAt: Date.now() + 3_600_000,
      }),
    )
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (isTokenRequest(url)) return tokenReply(2)
      const auth = (init.headers as Record<string, string>).Authorization
      return new Response("{}", { status: auth === "Bearer AT2" ? 200 : 401 })
    })

    const [a, b] = await Promise.all([ncFetch("/x"), ncFetch("/y")])
    expect([a.status, b.status]).toEqual([200, 200])
    const refreshes = fetchMock.mock.calls.filter(([u]) => isTokenRequest(u))
    expect(refreshes).toHaveLength(1)
    const body = new URLSearchParams(
      String((refreshes[0]?.[1] as RequestInit).body),
    )
    expect(body.get("grant_type")).toBe("refresh_token")
    expect(body.get("refresh_token")).toBe("RT1")
  })

  it("takes a token that isn't one for no login", () => {
    store.set("nextcloud.token", JSON.stringify({ accessToken: "AT1" }))
    expect(isLoggedIn()).toBe(false)
    store.set("nextcloud.token", "not json")
    expect(isLoggedIn()).toBe(false)
  })

  it("sends no token when nobody is logged in", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }))
    await ncFetch("/x")
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.headers).not.toHaveProperty("Authorization")
  })
})
