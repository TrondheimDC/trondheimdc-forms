import { Input } from "@/components/ui/field"
import { copy } from "@/copy"
import * as z from "@/lib/zod"
import { asText, type FieldProps, kind, one, useField } from "./kind"

// A colour from the browser's picker, as "#rrggbb". The field starts empty:
// the picker shows black, but nothing is chosen until it is used. Controlled,
// not register()ed: a colour input is never empty, so React Hook Form would
// take its black for an answer typed before the form was ready.
const colour = z.string()

const ColorField = ({ name, aria }: FieldProps) => {
  const { field } = useField(name, colour)
  return (
    <div className="flex items-center gap-3">
      <Input
        {...aria}
        type="color"
        className="h-11 w-20 cursor-pointer p-1"
        value={field.value || "#000000"}
        onChange={(e) => field.onChange(e.target.value)}
      />
      {field.value && (
        <span className="font-mono text-sm uppercase text-muted-foreground">
          {field.value}
        </span>
      )}
    </div>
  )
}

export const color = kind({
  value: () => colour,
  empty: () => "",
  answer: () => asText,
  rules: () => one((v) => /^#[0-9a-f]{6}$/i.test(v), copy.problem.color),
  Field: ColorField,
})
