import { useRef } from "react"
import { Check, Input } from "@/components/ui/field"
import { copy } from "@/copy"
import { OTHER_PREFIX } from "@/lib/answers"
import type { Question } from "@/lib/forms"
import { cn } from "@/lib/utils"
import * as z from "@/lib/zod"
import { type FieldProps, kind, option, useField, useShuffled } from "./kind"

// Checkboxes (multiple) and radio buttons (multiple_unique), with Forms'
// "Other" and an answer of one's own when the question allows it. The field
// holds the chosen option ids, and the Other text, kept while it is
// unticked so ticking it again brings it back.
const choices = z.object({
  chosen: z.array(z.number()),
  otherChosen: z.boolean(),
  other: z.string(),
})

type Choices = z.infer<typeof choices>

// Ticked but empty, Other is no answer.
const answer = () =>
  choices.transform(({ chosen, otherChosen, other }) => {
    const text = otherChosen ? other.trim() : ""
    const out: (number | string)[] = text
      ? [...chosen, `${OTHER_PREFIX}${text}`]
      : chosen
    return out.length > 0 ? out : undefined
  })

const limits = (q: Question) => ({
  min: q.extraSettings.optionsLimitMin ?? 0,
  max: q.extraSettings.optionsLimitMax ?? 0,
})

const ChoicesField = ({ question: q, name, aria }: FieldProps) => {
  const { field } = useField(name, choices)
  const { chosen, otherChosen, other } = field.value
  const set = (change: Partial<Choices>) =>
    field.onChange({ ...field.value, ...change })
  const single = q.type === "multiple_unique"
  const options = useShuffled(q.options, q.extraSettings.shuffleOptions)
  const otherInput = useRef<HTMLInputElement>(null)
  const max = single ? 0 : limits(q).max
  const count = chosen.length + (otherChosen ? 1 : 0)

  return (
    <div className="space-y-2">
      {options.map((o) => (
        <label key={o.id} className={option}>
          <Check
            type={single ? "radio" : "checkbox"}
            name={name}
            aria-invalid={aria["aria-invalid"]}
            checked={chosen.includes(o.id)}
            onChange={(e) =>
              set(
                single
                  ? { chosen: [o.id], otherChosen: false }
                  : {
                      chosen: e.target.checked
                        ? [...chosen, o.id]
                        : chosen.filter((id) => id !== o.id),
                    },
              )
            }
          />
          <span>{o.text}</span>
        </label>
      ))}
      {q.extraSettings.allowOtherAnswer && (
        <div className={cn(option, "cursor-default flex-wrap")}>
          <label className="flex cursor-pointer items-center gap-3">
            <Check
              type={single ? "radio" : "checkbox"}
              name={name}
              checked={otherChosen}
              onChange={(e) => {
                set({
                  otherChosen: e.target.checked,
                  ...(single ? { chosen: [] } : {}),
                })
                if (e.target.checked) otherInput.current?.focus()
              }}
            />
            <span>{copy.form.other}</span>
          </label>
          <Input
            ref={otherInput}
            className="h-9 min-w-48 flex-1"
            aria-label={copy.form.other}
            aria-describedby={aria["aria-describedby"]}
            placeholder={copy.form.otherPlaceholder}
            enterKeyHint="next"
            value={other}
            onChange={(e) =>
              // Typing in Other chooses it.
              set({
                other: e.target.value,
                ...(e.target.value && !otherChosen
                  ? { otherChosen: true, ...(single ? { chosen: [] } : {}) }
                  : {}),
              })
            }
          />
        </div>
      )}
      {max > 0 && (
        <p
          className={cn(
            "text-right font-mono text-xs tabular-nums transition-colors",
            count > max ? "text-danger" : "text-muted-foreground",
          )}
        >
          {copy.form.chosenOf({ count, max })}
        </p>
      )}
    </div>
  )
}

const empty = () => ({ chosen: [], otherChosen: false, other: "" })

// A draft keeps only the options the question still has, Other included:
// one taken out since couldn't be seen, or unticked.
const value = (q: Question) =>
  choices.transform((v) => ({
    ...v,
    chosen: v.chosen.filter((id) => q.options.some((o) => o.id === id)),
    otherChosen: v.otherChosen && !!q.extraSettings.allowOtherAnswer,
  }))

export const multiple = kind({
  value,
  empty,
  answer,
  rules: (q) => {
    const { min, max } = limits(q)
    let list = z.array(z.union([z.number(), z.string()]))
    if (min) list = list.min(min, { error: copy.problem.min({ count: min }) })
    if (max) list = list.max(max, { error: copy.problem.max({ count: max }) })
    return list
  },
  hint: (q) => {
    const { min, max } = limits(q)
    if (min && max)
      return min === max
        ? copy.form.chooseExactly({ count: min })
        : copy.form.chooseBetween({ min, max })
    if (min) return copy.form.chooseAtLeast({ count: min })
    if (max) return copy.form.chooseAtMost({ count: max })
    return null
  },
  Field: ChoicesField,
})

export const multipleUnique = kind({
  value,
  empty,
  answer,
  Field: ChoicesField,
})
