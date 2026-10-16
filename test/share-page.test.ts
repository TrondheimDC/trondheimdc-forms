import { describe, expect, it } from "vitest"
import { fromNextcloud, rawFormSchema } from "../src/lib/forms"
import { parseFormIdPage, parseSharePage } from "../src/lib/share-page"

// What core/templates/layout.initial-state.php writes: base64 of the JSON.
const state = (key: string, value: unknown) =>
  `<input type="hidden" id="initial-state-forms-${key}" value="${Buffer.from(JSON.stringify(value)).toString("base64")}">`

const page = (...inputs: string[]) =>
  `<!DOCTYPE html><html><body><div id="initial-state-container" style="display: none;">
		${inputs.join("\n\t\t")}
	</div><div id="content"></div></body></html>`

const form = {
  id: 42,
  hash: "abc",
  title: "Påmelding: Æ, ø og å",
  description: "",
  questions: [
    {
      id: 1,
      type: "short",
      text: "Navn",
      isRequired: true,
      options: [],
      extraSettings: [],
    },
  ],
}

describe("parseSharePage", () => {
  it("reads the form, UTF-8 included", () => {
    const parsed = parseSharePage(
      page(
        state("maxStringLengths", { formTitle: 256 }),
        state("form", form),
        state("isLoggedIn", false),
        state("shareHash", "abc"),
      ),
    )
    expect(parsed.kind).toBe("form")
    if (parsed.kind === "form") {
      expect(parsed.form.title).toBe("Påmelding: Æ, ø og å")
    }
  })

  it("recognises Forms' empty states", () => {
    expect(parseSharePage(page(state("renderAs", "expired")))).toEqual({
      kind: "expired",
    })
    expect(parseSharePage(page(state("renderAs", "notfound")))).toEqual({
      kind: "notfound",
    })
  })

  it("says so when the page isn't what it expects", () => {
    expect(parseSharePage("<html>Login</html>").kind).toBe("unreadable")
    expect(parseSharePage(page(state("form", { id: "x" }))).kind).toBe(
      "unreadable",
    )
  })

  it("won't half read a form that has changed shape", () => {
    const broken = {
      ...form,
      questions: [{ ...form.questions[0], options: "none", text: 7 }],
    }
    const parsed = parseSharePage(page(state("form", broken)))
    expect(parsed.kind).toBe("unreadable")
    if (parsed.kind === "unreadable") {
      expect(parsed.reason).toContain("questions[0].text")
      expect(parsed.reason).toContain("questions[0].options")
    }
  })

  it("keeps a question it can't render, for the link to Nextcloud", () => {
    const later = {
      ...form,
      questions: [{ ...form.questions[0], type: "signature" }],
    }
    const parsed = parseSharePage(page(state("form", later)))
    expect(parsed.kind).toBe("form")
    if (parsed.kind === "form") {
      expect(parsed.form.questions?.[0]?.type).toBe("signature")
    }
  })

  it("drops a setting it can't read rather than the form", () => {
    const odd = {
      ...form,
      questions: [
        {
          ...form.questions[0],
          extraSettings: { validationType: "text", optionsLimitMin: "2" },
        },
      ],
    }
    const parsed = parseSharePage(page(state("form", odd)))
    expect(parsed.kind).toBe("form")
    if (parsed.kind === "form") {
      expect(parsed.form.questions?.[0]?.extraSettings).toEqual({})
    }
  })

  it("keeps only what the site uses", () => {
    const parsed = parseSharePage(
      page(state("form", { ...form, ownerId: "someone", shares: [] })),
    )
    expect(parsed.kind === "form" && parsed.form).not.toHaveProperty("ownerId")
  })
})

describe("parseFormIdPage", () => {
  it("reads the id the logged-in Forms app gets", () => {
    expect(
      parseFormIdPage(page(state("appConfig", {}), state("formId", 77))),
    ).toEqual({ kind: "id", id: 77 })
  })

  it("knows an unknown hash", () => {
    expect(parseFormIdPage(page(state("formId", "invalid")))).toEqual({
      kind: "notfound",
    })
  })

  it("says so for a login page instead", () => {
    expect(parseFormIdPage("<html>Log in</html>").kind).toBe("unreadable")
    expect(parseFormIdPage(page(state("formId", "77"))).kind).toBe("unreadable")
  })
})

describe("fromNextcloud", () => {
  it("fills defaults and turns PHP's empty [] settings into {}", () => {
    const f = fromNextcloud(
      rawFormSchema.parse(form),
      "abc",
      "https://cloud.example/apps/forms/s/abc",
    )
    expect(f.questions[0]?.extraSettings).toEqual({})
    expect(f.expires).toBe(0)
    expect(f.isMaxSubmissionsReached).toBe(false)
    expect(f.showExpiration).toBe(false)
  })

  // Forms can close a form at a date without showing it.
  it("keeps whether to show the closing date apart from the date", () => {
    const raw = { ...form, expires: 1_800_000_000, showExpiration: false }
    const f = fromNextcloud(rawFormSchema.parse(raw), "abc", "")
    expect(f.expires).toBe(1_800_000_000)
    expect(f.showExpiration).toBe(false)
  })

  // Forms locks "multiple responses" on for these, but stores false.
  it("takes many answers through a public link, whatever is stored", () => {
    const raw = { ...form, submitMultiple: false, isAnonymous: false }
    expect(
      fromNextcloud(rawFormSchema.parse(raw), "abc", "").submitMultiple,
    ).toBe(true)
  })

  it("takes many answers when anonymous, whatever is stored", () => {
    const raw = { ...form, submitMultiple: false, isAnonymous: true }
    expect(fromNextcloud(rawFormSchema.parse(raw), "", "").submitMultiple).toBe(
      true,
    )
  })

  it("keeps one answer per person for a logged-in form that says so", () => {
    const raw = { ...form, submitMultiple: false, isAnonymous: false }
    expect(fromNextcloud(rawFormSchema.parse(raw), "", "").submitMultiple).toBe(
      false,
    )
  })
})
