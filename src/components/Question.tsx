"use client"

import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { useFormState, useWatch } from "react-hook-form"
import { copy } from "@/copy"
import type { PublicForm, Question as Q } from "@/lib/forms"
import { fieldName, kindOf, status } from "@/questions"
import { Markdown } from "./Markdown"

// One question, as a card around its type's field. It renders when its own
// answer starts or stops being done, or its problem changes; what is typed
// is the field's business.
export const Question = ({
  form,
  question: q,
  index,
}: {
  form: PublicForm
  question: Q
  // Position in the form, from 0: the number on the card and the delay it
  // rises in with.
  index: number
}) => {
  const name = fieldName(q.id)
  const { Field, hint: hintFor } = kindOf(q)
  const hint = hintFor?.(q) ?? null
  const state = useWatch({
    name,
    compute: (value: unknown) => status(q, value),
  })
  const { errors, isSubmitted } = useFormState({ name, exact: true })
  const message = errors[name]?.message
  // Problems show once someone has left the question, so nobody is told off
  // mid-sentence, and only after a try at submitting for one with nothing
  // in it. Once shown, a problem goes away as soon as it is fixed.
  const [left, setLeft] = useState(false)
  const problem =
    typeof message === "string" && (isSubmitted || (left && state !== "blank"))
      ? message
      : undefined

  const ids = {
    legend: `q-${q.id}-label`,
    description: `q-${q.id}-description`,
    hint: `q-${q.id}-hint`,
    problem: `q-${q.id}-problem`,
  }
  const describedBy =
    [q.description && ids.description, hint && ids.hint, problem && ids.problem]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <fieldset
      className="question-card form-rise scroll-mt-24 rounded-xl border border-border bg-card p-5 transition-[border-color,box-shadow] duration-300 focus-within:border-border-strong focus-within:shadow-md data-[invalid]:border-destructive/70 sm:p-6"
      style={{ "--i": index + 1 }}
      aria-describedby={describedBy}
      aria-invalid={problem ? true : undefined}
      data-invalid={problem ? "" : undefined}
      data-answered={state === "done" ? "" : undefined}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setLeft(true)
      }}
      // Scroll and focus target for the first problem on submit.
      id={`q-${q.id}`}
    >
      <legend
        id={ids.legend}
        className="float-left flex w-full items-start gap-3 font-display text-lg leading-snug text-foreground"
      >
        <span aria-hidden="true" className="question-badge">
          <span className="question-badge-number">{index + 1}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="question-badge-tick"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
          </svg>
        </span>
        <span className="pt-0.5">
          {q.text}
          {q.isRequired && (
            <span className="text-danger" aria-hidden="true">
              {" "}
              *
            </span>
          )}
          {q.isRequired && (
            <span className="sr-only"> ({copy.form.required})</span>
          )}
        </span>
      </legend>

      <div className="clear-both space-y-4 pt-3">
        {(q.description || hint) && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {q.description && (
              <div id={ids.description}>
                <Markdown>{q.description}</Markdown>
              </div>
            )}
            {hint && <p id={ids.hint}>{hint}</p>}
          </div>
        )}

        <Field
          form={form}
          question={q}
          name={name}
          aria={{
            "aria-labelledby": ids.legend,
            "aria-describedby": describedBy,
            "aria-invalid": problem ? true : undefined,
          }}
        />

        <AnimatePresence initial={false}>
          {problem && (
            <motion.div
              key="problem"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <p
                id={ids.problem}
                className="flex items-center gap-2 text-sm font-semibold text-danger"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  className="size-4 shrink-0"
                >
                  <circle cx="12" cy="12" r="9.5" />
                  <path d="M12 7.5v5.5M12 16.5v.01" />
                </svg>
                {problem}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </fieldset>
  )
}
