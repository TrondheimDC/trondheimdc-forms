// Link preview images for Slack, LinkedIn, Facebook and so on: the site's
// own at /og.png, and one per named form at /{slug}/og.png with the form's
// title on it. Served the same way as forening's: a Route Handler in a folder
// named like a file is exported as that file, so nginx sends the right
// Content-Type. Rendered once at build time by Satori, which supports a
// subset of CSS: every element with more than one child needs display: flex.
// https://github.com/vercel/satori#css
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { no, OG_IMAGE } from "@/lib/metadata"

const size = { width: OG_IMAGE.width, height: OG_IMAGE.height }
const PADDING = { x: 80, y: 72 }
const GREEN = "#9bf7a9"
const INK = "#0f0f0f"

const file = (...path: string[]) => readFile(join(process.cwd(), ...path))
// Satori reads woff and ttf, not the woff2 the site serves.
const font = (pkg: string, name: string) =>
  file("node_modules/@fontsource", pkg, "files", `${name}.woff`)
const dataUrl = (type: string, data: Buffer) =>
  `data:${type};base64,${data.toString("base64")}`

// The icon's checklist, larger: two answers ticked, one to go.
const Row = ({ checked, width }: { checked: boolean; width: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: checked ? GREEN : "transparent",
        border: `8px solid ${GREEN}`,
      }}
    >
      {checked && (
        // biome-ignore lint/a11y/noSvgWithoutTitle: inside a PNG, no one reads it; a <title> makes Satori fetch a font for it
        <svg width="34" height="28" viewBox="0 0 34 28" fill="none">
          <path
            d="M4 15l9 9L30 4"
            stroke={INK}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
    <div
      style={{ width, height: 22, borderRadius: 11, backgroundColor: GREEN }}
    />
  </div>
)

// A form's title is the headline, so it shrinks as it gets longer to stay
// within three lines of the text column.
const titleSize = (title: string) =>
  title.length <= 20
    ? 84
    : title.length <= 36
      ? 64
      : title.length <= 60
        ? 52
        : 44

export const renderOgImage = async ({
  title,
  description,
  path = "",
}: {
  // Omitted for the site's own image.
  title?: string
  // A form's own; the site's image has the site's. A form without one gets
  // none, rather than the site's repeated under its title.
  description?: string
  // e.g. "/tdc-2026", shown after the host.
  path?: string
} = {}) => {
  const site = title === undefined
  const text = site ? no.meta.description : description
  // The wordmark makes room for a form's title.
  const mark = site ? 1 : 0.65

  const letters = await Promise.all(
    ["T-green", "D-green-long", "C-green"].map(async (name) =>
      dataUrl(
        "image/svg+xml",
        await file("public/img/logos/letters", `${name}.svg`),
      ),
    ),
  )

  return new ImageResponse(
    <div
      style={{
        width: size.width - 2 * PADDING.x,
        height: size.height - 2 * PADDING.y,
        boxSizing: "content-box",
        padding: `${PADDING.y}px ${PADDING.x}px`,
        display: "flex",
        color: "#fefefe",
        fontFamily: "IBM Plex Sans",
        backgroundColor: INK,
        // The status screens' glow, standing still.
        backgroundImage:
          "radial-gradient(circle at 12% 0%, rgba(155,247,169,0.22), transparent 55%), radial-gradient(circle at 100% 100%, rgba(155,247,169,0.12), transparent 50%)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
        }}
      >
        <div style={{ display: "flex", gap: 13 * mark }}>
          {letters.map((src, i) => (
            // biome-ignore lint/performance/noImgElement: Satori renders plain <img>, not next/image
            <img
              key={src}
              src={src}
              height={92 * mark}
              width={([71, 272, 71][i] ?? 0) * mark}
              alt=""
            />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Space Grotesk",
              fontSize: site ? 96 : titleSize(title),
              lineHeight: 1.08,
              // Even lines, rather than one word left on the last.
              textWrap: "balance",
              color: GREEN,
              marginBottom: text ? 20 : 0,
            }}
          >
            {title ?? "Skjemaer"}
          </div>
          {text && (
            <div style={{ fontSize: 32, lineHeight: 1.4, maxWidth: 620 }}>
              {text}
            </div>
          )}
        </div>
        <div style={{ fontSize: 26, color: "#c4c4c4" }}>
          {`forms.trondheimdc.no${path}`}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 44,
          paddingLeft: 40,
        }}
      >
        <Row checked width={300} />
        <Row checked width={230} />
        <Row checked={false} width={270} />
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "IBM Plex Sans",
          weight: 400,
          data: await font("ibm-plex-sans", "ibm-plex-sans-latin-400-normal"),
        },
        {
          name: "Space Grotesk",
          weight: 400,
          data: await font("space-grotesk", "space-grotesk-latin-400-normal"),
        },
        {
          name: "IBM Plex Sans",
          weight: 400,
          data: await font(
            "ibm-plex-sans",
            "ibm-plex-sans-latin-ext-400-normal",
          ),
        },
      ],
    },
  )
}
