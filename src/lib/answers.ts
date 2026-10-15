import type { Question } from "./forms"

// What the form keeps per question while it is being filled in. Choice
// questions hold option ids as strings, everything else holds its text.
// Date and time ranges hold [from, to].
export type Draft = {
  values: Record<number, string[]>
  // Free text for "Other" on multiple / multiple_unique.
  other: Record<number, string>
  otherChecked: Record<number, boolean>
}

export const emptyDraft = (): Draft => ({
  values: {},
  other: {},
  otherChecked: {},
})

// A draft as kept in sessionStorage: checked, not trusted, since it is read
// back from outside the app.
export const isDraft = (value: unknown): value is Draft => {
  if (typeof value !== "object" || value === null) return false
  const { values, other, otherChecked } = value as Record<string, unknown>
  const record = (v: unknown, ok: (item: unknown) => boolean) =>
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every(ok)
  return (
    record(
      values,
      (v) => Array.isArray(v) && v.every((s) => typeof s === "string"),
    ) &&
    record(other, (v) => typeof v === "string") &&
    record(otherChecked, (v) => typeof v === "boolean")
  )
}

// Constants::QUESTION_EXTRASETTINGS_OTHER_PREFIX in nextcloud/forms.
export const OTHER_PREFIX = "system-other-answer:"

// The `answers` body of POST /api/v3/forms/{id}/submissions: question id to
// an array of values, even for a single text answer. Unanswered questions are
// left out rather than sent empty.
export const toSubmission = (
  questions: Question[],
  draft: Draft,
): Record<string, (string | number)[]> => {
  const answers: Record<string, (string | number)[]> = {}

  for (const q of questions) {
    const values = (draft.values[q.id] ?? []).filter((v) => v.trim() !== "")
    const other = draft.otherChecked[q.id] ? draft.other[q.id]?.trim() : ""

    let out: (string | number)[]
    switch (q.type) {
      case "multiple":
      case "multiple_unique":
      case "dropdown":
      case "ranking":
        out = values.map(Number)
        if (other) out.push(`${OTHER_PREFIX}${other}`)
        break
      case "linearscale":
        out = values.map(Number)
        break
      default:
        out = values
    }

    if (out.length > 0) answers[String(q.id)] = out
  }

  return answers
}

export type Problem =
  | { kind: "required" }
  | { kind: "min"; count: number }
  | { kind: "max"; count: number }
  | { kind: "email" }
  | { kind: "phone" }
  | { kind: "number" }
  | { kind: "regex" }
  | { kind: "range" }
  | { kind: "color" }

// Mirrors SubmissionService::validateSubmission() closely enough that the
// server only rejects what we couldn't know about (e.g. the form closed
// after the build). Returns the first problem per question.
export const validate = (
  questions: Question[],
  draft: Draft,
): Record<number, Problem> => {
  const answers = toSubmission(questions, draft)
  const problems: Record<number, Problem> = {}

  for (const q of questions) {
    const values = answers[String(q.id)] ?? []
    const problem = check(q, values)
    if (problem) problems[q.id] = problem
  }

  return problems
}

const check = (q: Question, values: (string | number)[]): Problem | null => {
  if (values.length === 0) return q.isRequired ? { kind: "required" } : null

  const s = q.extraSettings

  if (q.type === "multiple") {
    if (s.optionsLimitMin && values.length < s.optionsLimitMin)
      return { kind: "min", count: s.optionsLimitMin }
    if (s.optionsLimitMax && values.length > s.optionsLimitMax)
      return { kind: "max", count: s.optionsLimitMax }
  }

  if ((q.type === "date" && s.dateRange) || (q.type === "time" && s.timeRange))
    if (values.length !== 2 || String(values[0]) > String(values[1]))
      return { kind: "range" }

  if (q.type === "color" && !/^#[0-9a-f]{6}$/i.test(String(values[0])))
    return { kind: "color" }

  if (q.type === "short") {
    const value = String(values[0])
    switch (s.validationType) {
      case "email":
        // Loose on purpose: the server's validator is the real check.
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { kind: "email" }
        break
      case "number":
        if (!isNumeric(value)) return { kind: "number" }
        break
      case "phone": {
        const sanitized = value.replace(/[ ()./\-x]/g, "").replace(/^\+/, "")
        if (!/^[0-9]{3,}$/.test(sanitized)) return { kind: "phone" }
        break
      }
      case "regex": {
        const re = phpRegex(s.validationRegex)
        if (re && !re.test(value)) return { kind: "regex" }
        break
      }
    }
  }

  return null
}

// PHP's is_numeric(): optional sign, decimal or exponent, surrounding
// whitespace allowed. No hex, no empty string.
const isNumeric = (value: string) =>
  /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\s*$/.test(value)

// Forms stores the pattern PHP-style, delimiters and flags included
// ("/^[a-z]+$/i"). Translate what JS can express and skip the rest, leaving
// the check to the server.
export const phpRegex = (pattern: string | undefined): RegExp | null => {
  if (!pattern) return null
  const match = /^(.)([\s\S]*)\1([a-zA-Z]*)$/.exec(pattern)
  if (!match) return null
  const [, , body = "", flags = ""] = match
  const jsFlags = [...flags].filter((f) => "ims".includes(f)).join("")
  try {
    return new RegExp(body, jsFlags)
  } catch {
    return null
  }
}
