import { describe, expect, it } from "vitest"
import { OTHER_PREFIX } from "../src/lib/answers"
import type { Question } from "../src/lib/forms"
import {
  emptyValues,
  fieldName,
  formSchema,
  restoreValues,
  status,
  toSubmission,
} from "../src/questions"

const q = (overrides: Partial<Question> & Pick<Question, "id" | "type">) =>
  ({
    text: `Q${overrides.id}`,
    description: "",
    isRequired: false,
    options: [],
    extraSettings: {},
    ...overrides,
  }) satisfies Question

// What the form does on submit: each question's field through the form's
// schema, into the submission or the first problem per question.
const check = (
  questions: Question[],
  values: Record<number, unknown>,
): { answers?: Record<string, unknown>; problems: Record<string, string> } => {
  const filled = {
    ...emptyValues(questions),
    ...Object.fromEntries(
      Object.entries(values).map(([id, v]) => [fieldName(Number(id)), v]),
    ),
  }
  const result = formSchema(questions).safeParse(filled)
  if (result.success)
    return { answers: toSubmission(questions, result.data), problems: {} }
  return {
    answers: undefined,
    problems: Object.fromEntries(
      result.error.issues.map((i) => [String(i.path[0]), i.message]),
    ),
  }
}

const answers = (questions: Question[], values: Record<number, unknown>) =>
  check(questions, values).answers

const problem = (question: Question, value: unknown) =>
  check([question], { [question.id]: value }).problems[fieldName(question.id)]

describe("the submission", () => {
  it("wraps text in an array and sends option ids and steps as numbers", () => {
    const questions = [
      q({ id: 1, type: "short" }),
      q({ id: 2, type: "multiple", options: [{ id: 7, text: "a" }] }),
      q({ id: 3, type: "linearscale" }),
      q({ id: 4, type: "dropdown" }),
      q({ id: 5, type: "ranking" }),
    ]
    expect(
      answers(questions, {
        1: "hei",
        2: { chosen: [7], otherChosen: false, other: "" },
        3: "4",
        4: "9",
        5: [3, 1, 2],
      }),
    ).toEqual({ "1": ["hei"], "2": [7], "3": [4], "4": [9], "5": [3, 1, 2] })
  })

  it("leaves unanswered and blank questions out", () => {
    const questions = [q({ id: 1, type: "short" }), q({ id: 2, type: "long" })]
    expect(answers(questions, { 1: "  " })).toEqual({})
  })

  it("prefixes the Other answer only when it is chosen", () => {
    const question = q({
      id: 1,
      type: "multiple_unique",
      extraSettings: { allowOtherAnswer: true },
    })
    const typed = { chosen: [], otherChosen: false, other: " noe annet " }
    expect(answers([question], { 1: typed })).toEqual({})
    expect(answers([question], { 1: { ...typed, otherChosen: true } })).toEqual(
      { "1": [`${OTHER_PREFIX}noe annet`] },
    )
  })

  it("sends date and time with a space, as Forms wants it", () => {
    expect(
      answers([q({ id: 1, type: "datetime" })], { 1: ["2026-10-16T14:30"] }),
    ).toEqual({ "1": ["2026-10-16 14:30"] })
  })

  it("sends a grid's rows with something in them", () => {
    const options = [
      { id: 1, text: "Talks", optionType: "row" as const },
      { id: 2, text: "Food", optionType: "row" as const },
      { id: 10, text: "Good", optionType: "column" as const },
      { id: 11, text: "Bad", optionType: "column" as const },
    ]
    const grid = (questionType: string) =>
      q({ id: 1, type: "grid", options, extraSettings: { questionType } })
    expect(answers([grid("radio")], { 1: { "1:11": "1" } })).toEqual({
      "1": { "1": "11" },
    })
    expect(
      answers([grid("checkbox")], { 1: { "1:10": "1", "1:11": "1" } }),
    ).toEqual({ "1": { "1": ["10", "11"] } })
    expect(answers([grid("number")], { 1: { "2:10": " 3 " } })).toEqual({
      "1": { "2": { "10": "3" } },
    })
  })
})

describe("Forms' rules", () => {
  it("flags required questions, and only them", () => {
    const required = q({ id: 1, type: "short", isRequired: true })
    expect(problem(required, "")).toBe("This question is required.")
    expect(problem(required, "ja")).toBeUndefined()
    expect(problem(q({ id: 2, type: "short" }), "")).toBeUndefined()
  })

  it("treats a chosen but empty Other as unanswered", () => {
    const question = q({
      id: 1,
      type: "multiple",
      isRequired: true,
      extraSettings: { allowOtherAnswer: true },
    })
    expect(
      problem(question, { chosen: [], otherChosen: true, other: " " }),
    ).toBe("This question is required.")
  })

  it("holds checkboxes to their limits", () => {
    const question = q({
      id: 1,
      type: "multiple",
      extraSettings: { optionsLimitMin: 2, optionsLimitMax: 3 },
    })
    const chosen = (ids: number[]) => ({
      chosen: ids,
      otherChosen: false,
      other: "",
    })
    expect(problem(question, chosen([1]))).toBe("Choose at least 2.")
    expect(problem(question, chosen([1, 2, 3, 4]))).toBe("Choose at most 3.")
    expect(problem(question, chosen([1, 2]))).toBeUndefined()
  })

  it("checks short answers like Nextcloud does", () => {
    const of = (validationType: "email" | "phone" | "number") =>
      q({ id: 1, type: "short", extraSettings: { validationType } })
    expect(problem(of("email"), "a@b.no")).toBeUndefined()
    expect(problem(of("email"), "a@b")).toBe("Enter a valid email address.")
    expect(problem(of("phone"), "+47 (73) 12-34")).toBeUndefined()
    expect(problem(of("phone"), "12")).toBe("Enter a valid phone number.")
    expect(problem(of("number"), "-1.5e3")).toBeUndefined()
    expect(problem(of("number"), "0x1A")).toBe("Enter a number.")
    const regex = q({
      id: 1,
      type: "short",
      extraSettings: { validationType: "regex", validationRegex: "/^\\d{4}$/" },
    })
    expect(problem(regex, "7030")).toBeUndefined()
    expect(problem(regex, "70")).toBe("The answer is not in the right format.")
  })

  it("wants date ranges whole and in order", () => {
    const question = q({
      id: 1,
      type: "date",
      extraSettings: { dateRange: true },
    })
    expect(problem(question, ["2026-10-02", "2026-10-01"])).toBe(
      "“To” can't be before “From”.",
    )
    expect(problem(question, ["2026-10-01", ""])).toBe(
      "Fill in both “From” and “To”.",
    )
    expect(problem(question, ["", "2026-10-01"])).toBe(
      "Fill in both “From” and “To”.",
    )
    expect(problem(question, ["2026-10-01", "2026-10-02"])).toBeUndefined()
    expect(problem(question, ["2026-10-01", "2026-10-01"])).toBeUndefined()
  })

  it("holds dates and times to their limits, both ends included", () => {
    const date = q({
      id: 1,
      type: "date",
      extraSettings: { dateMin: "2026-10-01", dateMax: "2026-10-31" },
    })
    expect(problem(date, ["2026-10-01"])).toBeUndefined()
    expect(problem(date, ["2026-10-31"])).toBeUndefined()
    expect(problem(date, ["2026-09-30"])).toBe(
      "Choose a date from 1 October 2026 to 31 October 2026.",
    )
    expect(problem(date, ["2026-11-01"])).toBeDefined()

    // A timestamp is its date in UTC: 2026-10-15 23:30 in Trondheim.
    const stamp = q({
      id: 1,
      type: "date",
      extraSettings: { dateMin: Date.UTC(2026, 9, 15, 21, 30) / 1000 },
    })
    expect(problem(stamp, ["2026-10-15"])).toBeUndefined()
    expect(problem(stamp, ["2026-10-14"])).toBe(
      "Choose a date no earlier than 15 October 2026.",
    )

    const time = q({
      id: 1,
      type: "time",
      extraSettings: { timeRange: true, timeMin: "09:00", timeMax: "17:00" },
    })
    expect(problem(time, ["09:00", "17:00"])).toBeUndefined()
    expect(problem(time, ["08:59", "12:00"])).toBe(
      "Choose a time from 09:00 to 17:00.",
    )
    expect(problem(time, ["12:00", "17:01"])).toBeDefined()
    expect(problem(time, ["16:00", "10:00"])).toBe(
      "“To” can't be before “From”.",
    )
  })

  it("won't take a file answer with an upload still on its way", () => {
    const question = q({ id: 1, type: "file" })
    expect(problem(question, { files: [], uploading: true })).toBe(
      "Wait for the upload to finish.",
    )
  })

  it("holds file questions to their count", () => {
    const uploaded = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        uploadedFileId: i,
        fileName: `${i}.pdf`,
        uploadToken: "t",
      }))
    const question = q({
      id: 1,
      type: "file",
      extraSettings: { maxAllowedFilesCount: 2 },
    })
    expect(problem(question, { files: uploaded(3), uploading: false })).toBe(
      "Upload at most 2 files.",
    )
    expect(
      problem(question, { files: uploaded(2), uploading: false }),
    ).toBeUndefined()
  })

  it("counts a zero in a number grid as an answer, as Forms does", () => {
    const question = q({
      id: 1,
      type: "grid",
      isRequired: true,
      options: [
        { id: 1, text: "Row", optionType: "row" },
        { id: 10, text: "Column", optionType: "column" },
      ],
      extraSettings: { questionType: "number" },
    })
    expect(problem(question, { "1:10": "0" })).toBeUndefined()
    expect(problem(question, { "1:10": " " })).toBe(
      "This question is required.",
    )
    expect(problem(question, { "1:10": "x" })).toBe("Enter a number.")
    expect(problem(question, { "1:10": "2" })).toBeUndefined()
  })
})

describe("status", () => {
  const question = q({
    id: 1,
    type: "short",
    isRequired: true,
    extraSettings: { validationType: "email" },
  })

  it("tells blank, done and answered with a problem apart", () => {
    expect(status(question, "")).toBe("blank")
    expect(status(question, "a@b.no")).toBe("done")
    expect(status(question, "a@b")).toBe("problem")
  })

  it("counts an upload on its way as started, not blank", () => {
    expect(
      status(q({ id: 2, type: "file" }), { files: [], uploading: true }),
    ).toBe("problem")
  })
})

describe("restoreValues", () => {
  const questions = [q({ id: 1, type: "short" }), q({ id: 2, type: "file" })]

  it("takes back a draft as the form saves it", () => {
    expect(restoreValues(questions, { q1: "hei" })).toEqual({
      ...emptyValues(questions),
      q1: "hei",
    })
  })

  it("forgets an upload that was on its way, and other forms' questions", () => {
    expect(
      restoreValues(questions, {
        q2: { files: [], uploading: true },
        q9: "x",
      }),
    ).toEqual(emptyValues(questions))
  })

  it("drops a field that doesn't fit, and keeps the rest", () => {
    expect(
      restoreValues(questions, { q1: "hei", q2: { files: "nope" } }),
    ).toEqual({ ...emptyValues(questions), q1: "hei" })
  })

  it("drops a date saved before the question became a range", () => {
    const range = [
      q({ id: 3, type: "date", extraSettings: { dateRange: true } }),
    ]
    expect(restoreValues(range, { q3: ["2026-10-01"] })).toBeNull()
    expect(restoreValues(range, { q3: ["2026-10-01", ""] })).toEqual({
      q3: ["2026-10-01", ""],
    })
  })

  it("checks a draft against the options the question has now", () => {
    const options = [
      { id: 1, text: "a" },
      { id: 2, text: "b" },
      { id: 3, text: "c" },
    ]
    const changed = [
      q({ id: 1, type: "multiple", options }),
      q({ id: 2, type: "ranking", options }),
      q({ id: 3, type: "dropdown", options }),
      q({
        id: 4,
        type: "linearscale",
        extraSettings: { optionsLowest: 1, optionsHighest: 5 },
      }),
    ]
    expect(
      restoreValues(changed, {
        q1: { chosen: [1, 9], otherChosen: true, other: "x" },
        q2: [2, 1],
        q3: "9",
        q4: "6",
      }),
    ).toEqual({
      ...emptyValues(changed),
      q1: { chosen: [1], otherChosen: false, other: "x" },
    })
    expect(restoreValues(changed, { q2: [3, 1, 2], q3: "2", q4: "5" })).toEqual(
      { ...emptyValues(changed), q2: [3, 1, 2], q3: "2", q4: "5" },
    )
    expect(restoreValues(changed, { q2: [1, 2, 2] })).toBeNull()
  })

  it("rejects anything else read back from storage", () => {
    expect(restoreValues(questions, null)).toBeNull()
    expect(restoreValues(questions, "draft")).toBeNull()
    // As drafts were kept before each type had its own field.
    expect(
      restoreValues(questions, {
        q1: { values: ["hei"], other: "", otherChecked: false },
      }),
    ).toBeNull()
  })
})
