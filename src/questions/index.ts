import { copy } from "@/copy"
import type { Answer } from "@/lib/answers"
import { isSupported, type Question, type QuestionType } from "@/lib/forms"
import * as z from "@/lib/zod"
import { multiple, multipleUnique } from "./choices"
import { color } from "./color"
import { date, datetime, time } from "./date-time"
import { dropdown } from "./dropdown"
import { file } from "./file"
import { grid } from "./grid"
import type { Kind } from "./kind"
import { ranking } from "./ranking"
import { linearscale } from "./scale"
import { long, short } from "./text"

// The question types this site renders, by Forms' name for them. A form with
// any other is sent to Nextcloud instead (unsupported() in src/lib/forms.ts).
const kinds: Record<QuestionType, Kind<unknown, Answer>> = {
  short,
  long,
  multiple,
  multiple_unique: multipleUnique,
  dropdown,
  linearscale,
  date,
  time,
  datetime,
  color,
  ranking,
  grid,
  file,
}

export const kindOf = (q: Question) => {
  if (!isSupported(q.type)) {
    // Never: a form with such a question is sent to Nextcloud before it is
    // rendered here.
    throw new Error(`No question type ${q.type}`)
  }
  return kinds[q.type]
}

// The question's field in the form. Not the bare id: React Hook Form reads
// a number in a field name as an array index.
export const fieldName = (id: number) => `q${id}`

// A question's answer, and that answer checked: required or not, then
// Forms' rules for it.
const build = (q: Question) => {
  const k = kindOf(q)
  const answer = k.answer(q)
  const given = q.isRequired
    ? answer.refine((a) => a !== undefined, { error: copy.problem.required })
    : answer
  const rules = k.rules?.(q)
  return { answer, checked: rules ? given.pipe(rules.optional()) : given }
}

// Built once per question: they are parsed on every change.
const built = new WeakMap<Question, ReturnType<typeof build>>()

const schemas = (q: Question) => {
  const cached = built.get(q)
  if (cached) return cached
  const made = build(q)
  built.set(q, made)
  return made
}

// The form's schema, for React Hook Form's resolver: what each field holds
// in, Nextcloud's answer out, and the first problem with each question on
// its field.
export const formSchema = (questions: Question[]) =>
  z.object(
    Object.fromEntries(
      questions.map((q) => [fieldName(q.id), schemas(q).checked]),
    ),
  )

export const emptyValues = (questions: Question[]) =>
  Object.fromEntries(
    questions.map((q) => [fieldName(q.id), kindOf(q).empty(q)]),
  )

// Where a question stands: nothing to send yet, answered and good to send,
// or answered with a problem.
export const status = (q: Question, value: unknown) => {
  const given = schemas(q).answer.safeParse(value)
  if (given.success && given.data === undefined) return "blank"
  return schemas(q).checked.safeParse(value).success ? "done" : "problem"
}

// A draft as kept in sessionStorage: checked, not trusted, since it is read
// back from outside the app. Each question takes its field back if it still
// fits; only this form's questions are taken.
export const restoreValues = (questions: Question[], stored: unknown) => {
  const saved = z.record(z.string(), z.unknown()).safeParse(stored)
  if (!saved.success) return null
  let restored = false
  const values = Object.fromEntries(
    questions.map((q) => {
      const name = fieldName(q.id)
      const value = kindOf(q).value(q).safeParse(saved.data[name])
      if (value.success) restored = true
      return [name, value.success ? value.data : kindOf(q).empty(q)]
    }),
  )
  return restored ? values : null
}

// The `answers` body of POST /api/v3/forms/{id}/submissions, by question id,
// from what the form's schema gave. Unanswered questions are left out rather
// than sent empty.
export const toSubmission = (
  questions: Question[],
  answers: Record<string, Answer | undefined>,
): Record<string, Answer> =>
  Object.fromEntries(
    questions.flatMap((q) => {
      const answer = answers[fieldName(q.id)]
      return answer === undefined ? [] : [[String(q.id), answer]]
    }),
  )
