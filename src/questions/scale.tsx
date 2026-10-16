import { useFormContext } from "react-hook-form"
import type { Question } from "@/lib/forms"
import { cn } from "@/lib/utils"
import * as z from "@/lib/zod"
import { asNumber, type FieldProps, kind } from "./kind"

// A step on a scale, from optionsLowest to optionsHighest. The field holds
// the chosen step, "" for none.
const range = (q: Question) => ({
  low: q.extraSettings.optionsLowest ?? 1,
  high: q.extraSettings.optionsHighest ?? 5,
})

const ScaleField = ({ question: q, name, aria }: FieldProps) => {
  const { register } = useFormContext()
  const s = q.extraSettings
  const { low, high } = range(q)
  const steps = Array.from({ length: high - low + 1 }, (_, i) => low + i)
  // 0 to 10, as for NPS: on a phone, separate buttons would be too narrow to
  // hit, so the steps join into one bar and the gaps go to the buttons.
  const long = steps.length > 7

  return (
    // Every step gets an equal share of the card's width, so the scale
    // lines up with the question and description on both edges, and the end
    // labels sit under the ends. Even 0 to 10 stays on one line on a phone.
    <div className="flex w-full flex-col gap-2">
      <div
        className={cn(
          "grid sm:gap-2",
          long
            ? "max-sm:divide-x max-sm:divide-border-strong max-sm:overflow-hidden max-sm:rounded-xl max-sm:border-2 max-sm:border-border-strong"
            : "gap-1.5",
        )}
        style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
      >
        {steps.map((step) => (
          <label key={step} className="relative">
            <input
              type="radio"
              className="peer sr-only"
              aria-describedby={aria["aria-describedby"]}
              aria-invalid={aria["aria-invalid"]}
              value={String(step)}
              {...register(name)}
            />
            <span
              className={cn(
                "scale-step flex h-11 cursor-pointer items-center justify-center rounded-xl border-2 border-border-strong font-display text-base tabular-nums transition-[border-color,background-color,color,scale] duration-150 hover:border-primary active:scale-95 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-brand peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
                long &&
                  "max-sm:rounded-none max-sm:border-0 max-sm:text-sm max-sm:peer-focus-visible:ring-inset",
              )}
            >
              {step}
              {/* The end labels, said with their steps: those under the
                  scale are for the eye. */}
              {step === low && s.optionsLabelLowest && (
                <span className="sr-only">: {s.optionsLabelLowest}</span>
              )}
              {step === high && s.optionsLabelHighest && (
                <span className="sr-only">: {s.optionsLabelHighest}</span>
              )}
            </span>
          </label>
        ))}
      </div>
      {(s.optionsLabelLowest || s.optionsLabelHighest) && (
        <div
          aria-hidden="true"
          className="flex justify-between gap-4 text-sm text-muted-foreground"
        >
          <span>
            {low}: {s.optionsLabelLowest}
          </span>
          <span className="text-right">
            {high}: {s.optionsLabelHighest}
          </span>
        </div>
      )}
    </div>
  )
}

export const linearscale = kind({
  // None, or a step the scale still has.
  value: (q) =>
    z.string().refine((v) => {
      const { low, high } = range(q)
      return v === "" || (/^-?\d+$/.test(v) && +v >= low && +v <= high)
    }),
  empty: () => "",
  answer: () => asNumber,
  Field: ScaleField,
})
