import { useFormContext, useWatch } from "react-hook-form"
import { Select } from "@/components/ui/field"
import { copy } from "@/copy"
import * as z from "@/lib/zod"
import { asNumber, type FieldProps, kind, useShuffled } from "./kind"

// One option out of a list, as the native select, so phones get their own
// picker. The field holds the chosen option's id, "" for none.
const DropdownField = ({ question: q, name, aria }: FieldProps) => {
  const { register } = useFormContext()
  const value = useWatch({ name })
  const options = useShuffled(q.options, q.extraSettings.shuffleOptions)

  return (
    <Select
      {...aria}
      {...register(name)}
      className={value ? undefined : "text-muted-foreground"}
    >
      <option value="">{copy.form.choose}</option>
      {options.map((o) => (
        <option key={o.id} value={String(o.id)} className="text-foreground">
          {o.text}
        </option>
      ))}
    </Select>
  )
}

export const dropdown = kind({
  value: () => z.string(),
  empty: () => "",
  answer: () => asNumber,
  Field: DropdownField,
})
