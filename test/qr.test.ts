import { encode } from "uqr"
import { describe, expect, it } from "vitest"
import { qrSvg } from "../src/lib/qr"

// What keeps the styled code scannable (src/lib/qr.ts). Scanning itself was
// checked with zxing-cpp on rendered PNGs; these hold the drawing to it.
const LINK = "https://forms.trondheimdc.no/tdc-2026-now"
const QUIET = 4

const dots = (svg: string) =>
  new Set(
    [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)].map(
      ([, cx, cy]) => `${Number(cx) - QUIET - 0.5},${Number(cy) - QUIET - 0.5}`,
    ),
  )

describe("qrSvg", () => {
  const { data, size } = encode(LINK, { ecc: "H", border: 0 })
  const drawn = dots(qrSvg(LINK))
  const inCorner = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7)

  it("draws no dot where the code is light", () => {
    for (const key of drawn) {
      const [x = -1, y = -1] = key.split(",").map(Number)
      expect(data[y]?.[x]).toBe(true)
    }
  })

  it("leaves out few enough dark modules for error correction H", () => {
    let dark = 0
    let missing = 0
    data.forEach((row, y) => {
      row.forEach((on, x) => {
        if (!on || inCorner(x, y)) return
        dark++
        if (!drawn.has(`${x},${y}`)) missing++
      })
    })
    // Only the wordmark's hole is missing: H takes about 30% damaged,
    // so stay far below it.
    expect(missing).toBeGreaterThan(0)
    expect(missing / (size * size)).toBeLessThan(0.08)
    expect(dark - missing).toBe(drawn.size)
  })

  it.each([
    ["green", "#9bf7a9"],
    ["black", "#0f0f0f"],
  ] as const)("keeps the %s ticks off the background colour", (look, background) => {
    const ticks = [
      ...qrSvg(LINK, look).matchAll(
        /<path d="M[^"]*" fill="none" stroke="([^"]+)"/g,
      ),
    ]
    expect(ticks).toHaveLength(2)
    for (const [, colour] of ticks) expect(colour).not.toBe(background)
  })
})
