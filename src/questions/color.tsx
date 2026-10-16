import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/field"
import { copy } from "@/copy"
import * as z from "@/lib/zod"
import { asText, type FieldProps, kind, one, useField } from "./kind"

// A colour from the browser's picker, as "#rrggbb". The field starts empty.
// Controlled, not register()ed: a colour input is never empty, so React
// Hook Form would take its black for an answer typed before the form was
// ready. For the same reason the picker waits behind "Choose a colour"
// until then: it would be read out as black, and black, already its value,
// could never be picked. The button starts the answer at black and opens
// the picker on it, so keeping black is an answer too; "Clear" undoes it.
const colour = z.string()

const START = "#000000"

const ColorField = ({ name, aria }: FieldProps) => {
  const { field } = useField(name, colour)
  const picker = useRef<HTMLInputElement>(null)
  const choose = useRef<HTMLButtonElement>(null)
  const chosen = field.value !== ""

  const open = () => {
    const input = picker.current
    if (!input) return
    field.onChange(START)
    // Focus first: the button goes once there is a colour.
    input.focus()
    try {
      input.showPicker()
    } catch {
      input.click()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        {...aria}
        ref={picker}
        type="color"
        // Out of sight, and out of the tab order, until it is chosen.
        className={
          chosen
            ? "h-11 w-20 cursor-pointer p-1"
            : "sr-only pointer-events-none"
        }
        tabIndex={chosen ? undefined : -1}
        aria-hidden={chosen ? undefined : true}
        value={field.value || START}
        onChange={(e) => field.onChange(e.target.value)}
      />
      {chosen ? (
        <>
          <span className="font-mono text-sm uppercase text-muted-foreground">
            {field.value}
          </span>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => {
              field.onChange("")
              // The picker leaves the tab order: on to the button that
              // brings it back.
              requestAnimationFrame(() => choose.current?.focus())
            }}
          >
            {copy.form.clearColour}
          </Button>
        </>
      ) : (
        <Button
          ref={choose}
          type="button"
          variant="outline"
          size="sm"
          aria-describedby={aria["aria-describedby"]}
          onClick={open}
        >
          <span
            aria-hidden="true"
            className="size-4 rounded-full border border-border-strong bg-[conic-gradient(var(--color-fg-brand),var(--color-fg-accent),var(--color-fg-accent-3),var(--color-fg-brand-2),var(--color-fg-brand))]"
          />
          {copy.form.chooseColour}
        </Button>
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
