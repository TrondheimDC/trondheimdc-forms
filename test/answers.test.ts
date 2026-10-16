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
})
