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

const { completeLogin, isLoggedIn, LoginError, ncFetch, safeReturn } =
  await import("../src/lib/session")

const tokenReply = (n: number) =>
  new Response(
    JSON.stringify({
      access_token: `AT${n}`,
      refresh_token: `RT${n}`,
      expires_in: 3600,
    }),
    { status: 200 },
  )

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
    expect(url).toBe("/oauth/token")
    expect(String(init.body)).toBe("grant_type=authorization_code&code=C")
    // The secret is nginx's to add, never the browser's.
    expect(JSON.stringify(init.headers)).not.toContain("Authorization")
  })

  it("refuses a state it didn't start, without asking Nextcloud", async () => {
    pending()
    await expect(
      completeLogin(new URLSearchParams("code=C&state=evil")),
    ).rejects.toMatchObject({ message: "State mismatch", returnTo: "/s/abc" })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(isLoggedIn()).toBe(false)
  })

  it("fails cleanly without a login started in this tab", async () => {
    await expect(
      completeLogin(new URLSearchParams("code=C&state=S")),
    ).rejects.toBeInstanceOf(LoginError)
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
      if (url === "/oauth/token") return tokenReply(2)
      const auth = (init.headers as Record<string, string>).Authorization
      return new Response("{}", { status: auth === "Bearer AT2" ? 200 : 401 })
    })

    const [a, b] = await Promise.all([ncFetch("/x"), ncFetch("/y")])
    expect([a.status, b.status]).toEqual([200, 200])
    const refreshes = fetchMock.mock.calls.filter(([u]) => u === "/oauth/token")
    expect(refreshes).toHaveLength(1)
    expect(String((refreshes[0]?.[1] as RequestInit).body)).toBe(
      "grant_type=refresh_token&refresh_token=RT1",
    )
  })

  it("sends no token when nobody is logged in", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }))
    await ncFetch("/x")
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.headers).not.toHaveProperty("Authorization")
  })
})
