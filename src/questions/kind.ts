import { type ReactNode, useEffect, useState } from "react"
import { useController, useFormContext } from "react-hook-form"
import type { Answer } from "@/lib/answers"
import type { Option, PublicForm, Question } from "@/lib/forms"
import * as z from "@/lib/zod"

// What every question type provides, one file each (or one per family):
// what its field holds, what Nextcloud gets from it, Forms' rules for that,
// and how it looks. index.ts puts them together into the form's schema.
export type Kind<V, A extends Answer> = {
  // What the question's field holds while it is being answered. A saved
  // draft is checked against it when it comes back.
  value: (q: Question) => z.ZodType<V>
  empty: (q: Question) => V
  // The answer Nextcloud gets: the field as Forms wants it in the
  // submission, or undefined while there is nothing to send.
  answer: (q: Question) => z.ZodType<A | undefined, V>
  // Forms' rules for an answer, as SubmissionService::validateSubmission()
  // checks them, each with the message the question shows. Whether one is
  // required is checked the same for every type, in index.ts.
  rules?: (q: Question) => z.ZodType<A, A> | undefined
  // What the question asks for, said up front rather than once it's wrong.
  hint?: (q: Question) => string | null
  Field: (props: FieldProps) => ReactNode
}

export const kind = <V, A extends Answer>(k: Kind<V, A>) => k

export type FieldProps = {
  form: PublicForm
  question: Question
  // The question's field in the form, to register() or useController().
  name: string
  // For the control the question's legend labels.
  aria: {
    "aria-labelledby": string
    "aria-describedby": string | undefined
    "aria-invalid": true | undefined
  }
}

// A question's field, typed by the schema of what it holds. React Hook Form
// can't know it: field names come from the form, while the page runs, so
// this is the one place its untyped value is taken for that type.
// `current()` is the field as it is by then, for a change after an await.
export const useField = <V>(name: string, _holds: z.ZodType<V>) => {
  const { field } = useController({ name })
  const { getValues } = useFormContext()
  const value: V = field.value
  return {
    field: { value, onChange: (next: V) => field.onChange(next) },
    current: (): V => getValues(name),
  }
}

// Text as an input gives it, sent as written. Only spaces is no answer.
export const asText = z
  .string()
  .transform((v): [string] | undefined => (v.trim() ? [v] : undefined))

// One option or step, as a select or radio group gives it ("" for none),
// sent as a number.
export const asNumber = z
  .string()
  .transform((v): [number] | undefined => (v ? [Number(v)] : undefined))

// A rule for an answer of one text.
export const one = (ok: (value: string) => boolean, error: string) =>
  z.tuple([z.string()]).refine(([value]) => ok(value), { error })

// One option: the whole row is the click target, and it lights up when
// chosen.
export const option =
  "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 transition-[border-color,background-color,scale] duration-150 hover:border-border-strong active:scale-[0.99] has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/40"

// Shuffled after hydration, so the prerendered order matches the first client
// render. Same items, same heights: only their order changes.
export const useShuffled = (
  options: Option[],
  shuffle: boolean | undefined,
) => {
  const [order, setOrder] = useState(options)
  useEffect(() => {
    if (!shuffle) return
    setOrder(
      options
        .map((o) => ({ o, at: Math.random() }))
        .sort((a, b) => a.at - b.at)
        .map(({ o }) => o),
    )
  }, [options, shuffle])
  return order
}
