import { readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { configForms } from "../src/lib/config"

// Named forms live at the top level, /{slug}, next to the site's own paths.
// A slug that took one of those would quietly win or lose against it, so the
// build stops here instead. Read from disk, so a page or file added later is
// covered too.
const root = join(import.meta.dirname, "..")
const taken = new Set([
  // Pages and the link preview: folders in src/app, other than [slug].
  ...readdirSync(join(root, "src/app"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("["))
    .map((entry) => entry.name),
  // Files Next makes from src/app.
  "favicon.ico",
  "icon.svg",
  "apple-icon.png",
  "manifest.webmanifest",
  // Copied as they are: fonts, img, locales, robots.txt, icons.
  ...readdirSync(join(root, "public")),
  // Forwarded to Nextcloud by nginx, now or with the login on.
  "apps",
  "ocs",
  "oauth",
])

describe("forms.config.json", () => {
  it.each(
    configForms.map((form) => [form.slug]),
  )("%s is lowercase a-z, 0-9 and single hyphens", (slug) => {
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it.each(
    configForms.map((form) => [form.slug]),
  )("%s doesn't take one of the site's own paths", (slug) => {
    expect(taken.has(slug)).toBe(false)
  })

  it("has each slug once", () => {
    const slugs = configForms.map((form) => form.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("knows the site's own paths", () => {
    // Guards the list above against reading the wrong folder.
    expect([...taken]).toEqual(
      expect.arrayContaining(["s", "admin", "fonts", "og.png"]),
    )
  })
})
