import { describe, expect, it } from "vitest"
import { isNumeric, phpRegex } from "../src/lib/answers"

describe("isNumeric", () => {
  it("takes what PHP's is_numeric() takes", () => {
    for (const ok of ["1", "-1.5", ".5", "1e3", " 2 ", "+0"])
      expect(isNumeric(ok)).toBe(true)
    for (const no of ["", " ", "0x1A", "1,5", "e3", "."])
      expect(isNumeric(no)).toBe(false)
  })
})

describe("phpRegex", () => {
  it("translates delimiters and the flags JS has", () => {
    expect(phpRegex("/^[a-z]+$/i")?.test("ABC")).toBe(true)
    expect(phpRegex("#^\\d{4}$#")?.test("7030")).toBe(true)
  })

  it("gives up rather than guessing", () => {
    expect(phpRegex(undefined)).toBeNull()
    expect(phpRegex("no delimiters")).toBeNull()
    expect(phpRegex("/(/")).toBeNull()
  })

  it("takes the flags PHP and JS read the same, and no others", () => {
    expect(phpRegex("/^a.b$/s")?.test("a\nb")).toBe(true)
    expect(phpRegex("/^abc$/D")?.test("abc")).toBe(true)
    expect(phpRegex("/^abc$/u")?.test("abc")).toBe(true)
    for (const flag of ["x", "U", "A", "S", "n", "J"])
      expect(phpRegex(`/^a b$/${flag}`)).toBeNull()
  })

  it("leaves PCRE-only syntax to the server", () => {
    for (const pcre of [
      "/\\Aabc\\z/",
      "/abc\\Z/",
      "/^\\h+$/",
      "/^\\p{L}+$/u",
      "/^\\Qa.b\\E$/",
      "/^\\x{41}$/",
      "/^\\x4$/",
      "/^(?>a+)b$/",
      "/^(?i)abc$/",
      "/^(?|(a)|(b))$/",
      "/^(?P<year>\\d{4})$/",
      "/^(?#note)a$/",
      "/^[[:alpha:]]+$/",
      "/^[]a]$/",
      "/^a{,3}$/",
      "/^a++$/",
      "/^\\d*+$/",
    ])
      expect(phpRegex(pcre), pcre).toBeNull()
  })

  it("keeps the groups and escapes JS has", () => {
    const re = phpRegex("/^(?<year>\\d{4})-(?:\\d{2})(?=$)(?!x)\\x41?$/")
    expect(re?.test("2026-10")).toBe(true)
    expect(re?.test("26-10")).toBe(false)
  })

  it("leaves answers beyond ASCII to the server", () => {
    expect(phpRegex("/^\\w+$/u")?.test("blåbær")).toBe(true)
    expect(phpRegex("/^.{3}$/")?.test("blå")).toBe(true)
    expect(phpRegex("/^\\w+$/")?.test("a b")).toBe(false)
  })
})
