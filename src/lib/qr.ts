import { encode } from "uqr"

// A form's link as a QR code in TDC's look, for posters, slides and chat:
// round dots, the TDC wordmark in the middle, and the three corner squares
// drawn as the app icon's checkboxes, two of them ticked. Built as an SVG
// string, in the browser for the share page (/{slug}/qr, /s/{hash}/qr).
//
// What keeps it scannable (checked with zxing-cpp, down to 120 px):
// - Error correction H, so the hole under the wordmark (about 5% of the
//   code) is well inside what a scanner can do without.
// - A scanner finds the code by the corner squares' solid centres, so the
//   ticks are a shade of the ink: a tick in the background colour cut
//   through the centre and no scanner found the code at all.
// - Four modules of quiet zone, and the alignment square left as dots.

export type QrLook = "green" | "black"

const LOOKS = {
  // Ink on green: the most contrast, and what every scanner reads.
  green: { background: "#9bf7a9", ink: "#0f0f0f", tick: "#4a6b4f" },
  // Green on black, for dark slides. Light on dark is read by phones'
  // cameras, but not by every scanner app.
  black: { background: "#0f0f0f", ink: "#9bf7a9", tick: "#4f9a5b" },
}

const QUIET = 4
// The hole for the wordmark, in modules.
const HOLE = { width: 13, height: 5 }
const DOT_RADIUS = 0.43

// TDC wordmark, as in src/app/icon.svg: 248 × 52.
const WORDMARK = { width: 248, height: 52 }
const WORDMARK_PATHS = `<path d="M10.0986 17.333H0L0 0L39.8145 0V17.333H29.7178V52H10.0986V17.333Z"/><path transform="translate(47.09 0)" d="M153.732 34.667C153.732 44.2406 145.983 52 136.422 52H0L0 0L136.422 0C145.983 0 153.732 7.75938 153.732 17.333V34.667Z"/><path transform="translate(208.1 0)" d="M39.8145 17.333H19.9072V34.667H39.8145V52H17.3105C7.74943 52 0.000113284 44.2407 0 34.667L0 17.333C0.000185034 7.75938 7.74948 0 17.3105 0L39.8145 0V17.333Z"/>`

// Four decimals is far finer than any print, and keeps the file small.
const n = (value: number) => Number(value.toFixed(4))

export const qrSvg = (link: string, look: QrLook = "green") => {
  const { background, ink, tick } = LOOKS[look]
  const { data, size } = encode(link, { ecc: "H", border: 0 })
  const total = size + QUIET * 2

  const hole = {
    x: Math.floor((size - HOLE.width) / 2),
    y: Math.floor((size - HOLE.height) / 2),
  }
  const inHole = (x: number, y: number) =>
    x >= hole.x &&
    x < hole.x + HOLE.width &&
    y >= hole.y &&
    y < hole.y + HOLE.height
  const corners: [number, number][] = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ]
  const inCorner = (x: number, y: number) =>
    corners.some(([cx, cy]) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7)

  const dots: string[] = []
  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark && !inCorner(x, y) && !inHole(x, y))
        dots.push(
          `<circle cx="${x + QUIET + 0.5}" cy="${y + QUIET + 0.5}" r="${DOT_RADIUS}"/>`,
        )
    })
  })

  // Each corner square: a 7 × 7 ring and a solid 3 × 3 centre, rounded as
  // the icon's checkboxes are.
  const checkboxes = corners.map(([cx, cy], i) => {
    const x = cx + QUIET
    const y = cy + QUIET
    const box = `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="1.6" fill="none" stroke="${ink}"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.75" fill="${ink}"/>`
    // Two answers ticked, one to go, as in the icon.
    return i < 2
      ? `${box}<path d="M${n(x + 2.7)} ${n(y + 3.55)}l.55 .55 .95 -1.2" fill="none" stroke="${tick}" stroke-width=".32" stroke-linecap="round" stroke-linejoin="round"/>`
      : box
  })

  const scale = (HOLE.width - 2) / WORDMARK.width
  const wordmark = {
    x: hole.x + QUIET + 1,
    y: hole.y + QUIET + (HOLE.height - WORDMARK.height * scale) / 2,
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}">`,
    `<rect width="${total}" height="${total}" rx="3" fill="${background}"/>`,
    `<g fill="${ink}">${dots.join("")}</g>`,
    checkboxes.join(""),
    `<g fill="${ink}" transform="translate(${n(wordmark.x)} ${n(wordmark.y)}) scale(${n(scale)})">${WORDMARK_PATHS}</g>`,
    "</svg>",
  ].join("")
}

export const qrDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

// A PNG for chat and slides, drawn from the SVG on a canvas. A data: URL,
// since the CSP's img-src allows that and not blob:.
export const qrPng = (svg: string, size = 2048) =>
  new Promise<Blob>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const context = canvas.getContext("2d")
      if (!context) return reject(new Error("No canvas"))
      context.drawImage(image, 0, 0, size, size)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No PNG"))),
        "image/png",
      )
    }
    image.onerror = () => reject(new Error("The QR code didn't load"))
    image.src = qrDataUrl(svg)
  })
