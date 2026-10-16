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

// A range is both ends, in order.
const inOrder = z
  .array(z.string())
  .refine(
    ([from, to, ...rest]) =>
      from !== undefined && to !== undefined && !rest.length && from <= to,
    { error: copy.problem.range },
  )

// dateMin / dateMax are either "YYYY-MM-DD" or a Unix timestamp.
const toDate = (value: string | number | undefined) =>
  typeof value === "number"
    ? new Date(value * 1000).toISOString().slice(0, 10)
    : value

const DateTimeField = ({ question: q, name, aria }: FieldProps) => {
  const { register } = useFormContext()
  const s = q.extraSettings
  const input = {
    type: q.type === "datetime" ? "datetime-local" : q.type,
    ...(q.type === "date" && {
      min: toDate(s.dateMin),
      max: toDate(s.dateMax),
    }),
    ...(q.type === "time" && { min: s.timeMin, max: s.timeMax }),
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
  rules: (q) => (isRange(q) ? inOrder : undefined),
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
