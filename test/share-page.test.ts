import { describe, expect, it } from "vitest"
import { fromNextcloud } from "../src/lib/forms"
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
    expect(parseSharePage("<html>Login</html>")).toEqual({
      kind: "unreadable",
    })
    expect(parseSharePage(page(state("form", { id: "x" })))).toEqual({
      kind: "unreadable",
    })
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
    expect(parseFormIdPage("<html>Log in</html>")).toEqual({
      kind: "unreadable",
    })
  })
})

describe("fromNextcloud", () => {
  it("fills defaults and turns PHP's empty [] settings into {}", () => {
    const f = fromNextcloud(
      form as never,
      "abc",
      "https://cloud.example/apps/forms/s/abc",
    )
    expect(f.questions[0]?.extraSettings).toEqual({})
    expect(f.expires).toBe(0)
    expect(f.isMaxSubmissionsReached).toBe(false)
  })
})
