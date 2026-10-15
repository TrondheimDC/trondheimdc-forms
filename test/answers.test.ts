import { describe, expect, it } from "vitest"
import {
  type Draft,
  emptyDraft,
  isDraft,
  OTHER_PREFIX,
  phpRegex,
  toSubmission,
  validate,
} from "../src/lib/answers"
import type { Question } from "../src/lib/forms"

const q = (overrides: Partial<Question> & Pick<Question, "id" | "type">) =>
  ({
    text: `Q${overrides.id}`,
    description: "",
    isRequired: false,
    options: [],
    extraSettings: {},
    ...overrides,
  }) satisfies Question

const draft = (values: Draft["values"], extra: Partial<Draft> = {}) => ({
  ...emptyDraft(),
  values,
  ...extra,
})

describe("toSubmission", () => {
  it("wraps text in an array and sends option ids as numbers", () => {
    const questions = [
      q({ id: 1, type: "short" }),
      q({ id: 2, type: "multiple", options: [{ id: 7, text: "a" }] }),
      q({ id: 3, type: "linearscale" }),
    ]
    expect(
      toSubmission(questions, draft({ 1: ["hei"], 2: ["7"], 3: ["4"] })),
    ).toEqual({ "1": ["hei"], "2": [7], "3": [4] })
  })

  it("leaves unanswered and blank questions out", () => {
    const questions = [q({ id: 1, type: "short" }), q({ id: 2, type: "long" })]
    expect(toSubmission(questions, draft({ 1: ["  "] }))).toEqual({})
  })

  it("prefixes the Other answer only when it is checked", () => {
    const question = q({
      id: 1,
      type: "multiple_unique",
      extraSettings: { allowOtherAnswer: true },
    })
    const typed = { other: { 1: " noe annet " } }
    expect(toSubmission([question], draft({}, typed))).toEqual({})
    expect(
      toSubmission(
        [question],
        draft({}, { ...typed, otherChecked: { 1: true } }),
      ),
    ).toEqual({ "1": [`${OTHER_PREFIX}noe annet`] })
  })
})

describe("validate", () => {
  it("flags required questions", () => {
    const questions = [q({ id: 1, type: "short", isRequired: true })]
    expect(validate(questions, emptyDraft())).toEqual({
      1: { kind: "required" },
    })
    expect(validate(questions, draft({ 1: ["ja"] }))).toEqual({})
  })

  it("treats a checked but empty Other as unanswered", () => {
    const questions = [
      q({
        id: 1,
        type: "multiple",
        isRequired: true,
        extraSettings: { allowOtherAnswer: true },
      }),
    ]
    expect(
      validate(questions, draft({}, { otherChecked: { 1: true } })),
    ).toEqual({ 1: { kind: "required" } })
  })

  it("enforces option limits on checkboxes", () => {
    const questions = [
      q({
        id: 1,
        type: "multiple",
        extraSettings: { optionsLimitMin: 2, optionsLimitMax: 3 },
      }),
    ]
    expect(validate(questions, draft({ 1: ["1"] }))[1]).toEqual({
      kind: "min",
      count: 2,
    })
    expect(validate(questions, draft({ 1: ["1", "2", "3", "4"] }))[1]).toEqual({
      kind: "max",
      count: 3,
    })
  })

  it("checks short answers like Nextcloud does", () => {
    const of = (validationType: "email" | "phone" | "number") => [
      q({ id: 1, type: "short", extraSettings: { validationType } }),
    ]
    expect(validate(of("email"), draft({ 1: ["a@b.no"] }))).toEqual({})
    expect(validate(of("email"), draft({ 1: ["a@b"] }))[1]?.kind).toBe("email")
    expect(validate(of("phone"), draft({ 1: ["+47 (73) 12-34"] }))).toEqual({})
    expect(validate(of("phone"), draft({ 1: ["12"] }))[1]?.kind).toBe("phone")
    expect(validate(of("number"), draft({ 1: ["-1.5e3"] }))).toEqual({})
    expect(validate(of("number"), draft({ 1: ["0x1A"] }))[1]?.kind).toBe(
      "number",
    )
  })

  it("wants date ranges in order", () => {
    const questions = [
      q({ id: 1, type: "date", extraSettings: { dateRange: true } }),
    ]
    expect(
      validate(questions, draft({ 1: ["2026-10-02", "2026-10-01"] }))[1],
    ).toEqual({ kind: "range" })
    expect(
      validate(questions, draft({ 1: ["2026-10-01", "2026-10-02"] })),
    ).toEqual({})
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

describe("isDraft", () => {
  it("accepts a draft as the form saves it", () => {
    expect(isDraft(emptyDraft())).toBe(true)
    expect(
      isDraft({
        values: { 1: ["2"], 3: ["a", "b"] },
        other: { 1: "Lyntaler" },
        otherChecked: { 1: true },
      }),
    ).toBe(true)
  })

  it("rejects anything else read back from storage", () => {
    expect(isDraft(null)).toBe(false)
    expect(isDraft("draft")).toBe(false)
    expect(isDraft({ values: {}, other: {} })).toBe(false)
    expect(isDraft({ values: { 1: "2" }, other: {}, otherChecked: {} })).toBe(
      false,
    )
    expect(isDraft({ values: [], other: {}, otherChecked: {} })).toBe(false)
    expect(isDraft({ values: {}, other: {}, otherChecked: { 1: "yes" } })).toBe(
      false,
    )
  })
})
