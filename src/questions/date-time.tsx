import { useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/field"
import { copy } from "@/copy"
import type { Question } from "@/lib/forms"
import * as z from "@/lib/zod"
import { type FieldProps, kind } from "./kind"

// Dates and times, alone or as a range ("From" and "To"), and date with time.
// The field holds what the inputs give, one or two of them; Forms gets the
// ones filled in.
const ends = z.array(z.string())

const filled = (values: string[]) => {
  const given = values.filter((v) => v.trim() !== "")
  return given.length > 0 ? given : undefined
}

const isRange = (q: Question) =>
  q.type === "date"
    ? !!q.extraSettings.dateRange
    : q.type === "time" && !!q.extraSettings.timeRange

// dateMin / dateMax are either "YYYY-MM-DD" or a Unix timestamp, which
// Nextcloud takes as its date in UTC.
const toDate = (value: string | number | undefined) =>
  typeof value === "number"
    ? new Date(value * 1000).toISOString().slice(0, 10)
    : value

// The limits as SubmissionService::validateDateTime() reads them: dates for
// a date question, times for a time question, both ends allowed. One it
// can't read is no limit there, so none here either. Forms has no limits
// for date with time.
const limitsOf = (q: Question) => {
  const s = q.extraSettings
  const fits = (pattern: RegExp) => (value: string | undefined) =>
    value !== undefined && pattern.test(value) ? value : undefined
  if (q.type === "date") {
    const date = fits(/^\d{4}-\d{2}-\d{2}$/)
    return { min: date(toDate(s.dateMin)), max: date(toDate(s.dateMax)) }
  }
  if (q.type === "time") {
    const time = fits(/^\d{2}:\d{2}$/)
    return { min: time(s.timeMin), max: time(s.timeMax) }
  }
  return {}
}

// "2026-10-16" as "16 October 2026", read as the day it says wherever the
// browser is. Times are said as they are.
const say = (q: Question, value: string | undefined) => {
  if (value === undefined || q.type !== "date") return value
  const [y = 0, m = 1, d = 1] = value.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    dateStyle: "long",
  })
}

// A range is both ends, in order, and each end within the limits. Dates and
// times as the inputs give them sort as text.
const rulesFor = (q: Question) => {
  const range = isRange(q)
  const { min, max } = limitsOf(q)
  if (!range && !min && !max) return undefined
  let rules = ends
  if (range)
    rules = rules.refine((v) => v.length === 2, {
      error: copy.problem.bothEnds,
      abort: true,
    })
  if (min || max)
    rules = rules.refine(
      (v) => v.every((end) => (!min || end >= min) && (!max || end <= max)),
      {
        error: copy.problem.outOfRange({
          what: q.type === "date" ? "date" : "time",
          min: say(q, min),
          max: say(q, max),
        }),
        abort: true,
      },
    )
  if (range)
    rules = rules.refine(([from = "", to = ""]) => from <= to, {
      error: copy.problem.range,
    })
  return rules
}

const DateTimeField = ({ question: q, name, aria }: FieldProps) => {
  const { register } = useFormContext()
  const input = {
    type: q.type === "datetime" ? "datetime-local" : q.type,
    ...limitsOf(q),
    enterKeyHint: "next",
    className: q.type === "datetime" ? "w-auto min-w-56" : "w-auto min-w-44",
  } as const
  // Each end checks the whole question again: a range is only wrong as a
  // pair, and the problem is the question's.
  const end = (i: number) => register(`${name}.${i}`, { deps: name })

  if (!isRange(q)) return <Input {...aria} {...input} {...end(0)} />
  return (
    <div className="flex flex-wrap gap-4">
      {[copy.form.from, copy.form.to].map((label, i) => (
        <label key={label} className="space-y-1 text-sm">
          <span className="block text-muted-foreground">{label}</span>
          <Input
            aria-describedby={aria["aria-describedby"]}
            aria-invalid={aria["aria-invalid"]}
            {...input}
            {...end(i)}
          />
        </label>
      ))}
    </div>
  )
}

const dateOrTime = kind({
  // One input, or two for a range: a draft saved before the form changed
  // between them doesn't fit.
  value: (q) => ends.length(isRange(q) ? 2 : 1),
  empty: (q) => (isRange(q) ? ["", ""] : [""]),
  answer: () => ends.transform(filled),
  rules: rulesFor,
  Field: DateTimeField,
})

export const date = dateOrTime
export const time = dateOrTime

// Forms wants "Y-m-d H:i": the input's "2026-10-16T14:30" without the T.
export const datetime = kind({
  value: () => ends.length(1),
  empty: () => [""],
  answer: () =>
    ends.transform((values) => filled(values)?.map((v) => v.replace("T", " "))),
  Field: DateTimeField,
})
