import { useFormContext } from "react-hook-form"
import { Input, Textarea } from "@/components/ui/field"
import { copy } from "@/copy"
import { isNumeric, phpRegex } from "@/lib/answers"
import type { Question } from "@/lib/forms"
import * as z from "@/lib/zod"
import { asText, type FieldProps, kind, one } from "./kind"

// Short and long answers. The field holds the text as written.

// A short answer can be held to one of Forms' validation types.
const shortRules = (q: Question) => {
  switch (q.extraSettings.validationType) {
    case "email":
      // Loose on purpose: the server's validator is the real check.
      return one(
        (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        copy.problem.email,
      )
    case "number":
      return one(isNumeric, copy.problem.number)
    case "phone":
      return one(
        (v) =>
          /^[0-9]{3,}$/.test(v.replace(/[ ()./\-x]/g, "").replace(/^\+/, "")),
        copy.problem.phone,
      )
    case "regex": {
      const re = phpRegex(q.extraSettings.validationRegex)
      return re ? one((v) => re.test(v), copy.problem.regex) : undefined
    }
    default:
      return undefined
  }
}

const ShortField = ({ question: q, name, aria }: FieldProps) => {
  const { register } = useFormContext()
  const type = q.extraSettings.validationType
  return (
    <Input
      {...aria}
      {...register(name)}
      type={type === "email" ? "email" : type === "phone" ? "tel" : "text"}
      inputMode={type === "number" ? "decimal" : undefined}
      autoComplete={
        type === "email" ? "email" : type === "phone" ? "tel" : "off"
      }
      spellCheck={type ? false : undefined}
      enterKeyHint="next"
    />
  )
}

export const short = kind({
  value: () => z.string(),
  empty: () => "",
  answer: () => asText,
  rules: shortRules,
  Field: ShortField,
})

const LongField = ({ name, aria }: FieldProps) => {
  const { register } = useFormContext()
  return <Textarea {...aria} {...register(name)} />
}

export const long = kind({
  value: () => z.string(),
  empty: () => "",
  answer: () => asText,
  Field: LongField,
})
