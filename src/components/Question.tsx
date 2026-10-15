"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Check, Input, Select, Textarea } from "@/components/ui/field"
import type { Draft, Problem } from "@/lib/answers"
import type { Option, Question as Q } from "@/lib/forms"
import { cn } from "@/lib/utils"
import { Markdown } from "./Markdown"

export type QuestionProps = {
  question: Q
  draft: Draft
  problem: Problem | undefined
  setValues: (values: string[]) => void
  setOther: (text: string) => void
  setOtherChecked: (checked: boolean) => void
}

export const Question = (props: QuestionProps) => {
  const { question: q, problem } = props
  const { t } = useTranslation("common")
  const ids = {
    legend: `q-${q.id}-label`,
    description: `q-${q.id}-description`,
    problem: `q-${q.id}-problem`,
  }
  const describedBy =
    [q.description && ids.description, problem && ids.problem]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <fieldset
      className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
      aria-describedby={describedBy}
      aria-invalid={problem ? true : undefined}
      // Scroll target for the first problem on submit.
      id={`q-${q.id}`}
    >
      <legend
        id={ids.legend}
        className="float-left w-full font-display text-lg leading-snug text-foreground"
      >
        {q.text}
        {q.isRequired && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
        {q.isRequired && (
          <span className="sr-only"> ({t("form.required")})</span>
        )}
      </legend>

      {q.description && (
        <div
          id={ids.description}
          className="clear-both text-sm text-muted-foreground"
        >
          <Markdown>{q.description}</Markdown>
        </div>
      )}

      <div className="clear-both">
        <Control {...props} labelledBy={ids.legend} describedBy={describedBy} />
      </div>

      {problem && (
        <p id={ids.problem} className="text-sm font-semibold text-danger">
          {t(
            `problem.${problem.kind}`,
            "count" in problem ? { count: problem.count } : {},
          )}
        </p>
      )}
    </fieldset>
  )
}

type ControlProps = QuestionProps & {
  labelledBy: string
  describedBy: string | undefined
}

const Control = (props: ControlProps) => {
  const {
    question: q,
    draft,
    problem,
    setValues,
    labelledBy,
    describedBy,
  } = props
  const { t } = useTranslation("common", { keyPrefix: "form" })
  const values = draft.values[q.id] ?? []
  const s = q.extraSettings
  const aria = {
    "aria-labelledby": labelledBy,
    "aria-describedby": describedBy,
    "aria-invalid": problem ? true : undefined,
  }

  switch (q.type) {
    case "short":
      return (
        <Input
          {...aria}
          type={
            s.validationType === "email"
              ? "email"
              : s.validationType === "phone"
                ? "tel"
                : "text"
          }
          inputMode={s.validationType === "number" ? "decimal" : undefined}
          autoComplete={s.validationType === "email" ? "email" : "off"}
          value={values[0] ?? ""}
          onChange={(e) => setValues([e.target.value])}
        />
      )

    case "long":
      return (
        <Textarea
          {...aria}
          value={values[0] ?? ""}
          onChange={(e) => setValues([e.target.value])}
        />
      )

    case "multiple":
    case "multiple_unique":
      return <Choices {...props} />

    case "dropdown":
      return <Dropdown {...props} />

    case "linearscale":
      return <Scale {...props} />

    case "date":
    case "time": {
      const range = q.type === "date" ? s.dateRange : s.timeRange
      const bounds =
        q.type === "date"
          ? { min: toDate(s.dateMin), max: toDate(s.dateMax) }
          : { min: s.timeMin, max: s.timeMax }
      if (!range) {
        return (
          <Input
            {...aria}
            type={q.type}
            {...bounds}
            className="w-auto"
            value={values[0] ?? ""}
            onChange={(e) => setValues([e.target.value])}
          />
        )
      }
      const [from = "", to = ""] = values
      return (
        <div className="flex flex-wrap gap-4">
          {[
            {
              label: t("from"),
              value: from,
              set: (v: string) => setValues([v, to]),
            },
            {
              label: t("to"),
              value: to,
              set: (v: string) => setValues([from, v]),
            },
          ].map((end) => (
            <label key={end.label} className="space-y-1 text-sm">
              <span className="block text-muted-foreground">{end.label}</span>
              <Input
                aria-describedby={describedBy}
                aria-invalid={problem ? true : undefined}
                type={q.type}
                {...bounds}
                className="w-auto"
                value={end.value}
                onChange={(e) => end.set(e.target.value)}
              />
            </label>
          ))}
        </div>
      )
    }

    case "color":
      return (
        <Input
          {...aria}
          type="color"
          className="h-11 w-20 cursor-pointer p-1"
          value={values[0] || "#000000"}
          onChange={(e) => setValues([e.target.value])}
        />
      )

    case "ranking":
      return <Ranking {...props} />

    default:
      // Never reached: forms with other types are sent to Nextcloud instead.
      return null
  }
}

// dateMin / dateMax are either "YYYY-MM-DD" or a Unix timestamp.
const toDate = (value: string | number | undefined) =>
  typeof value === "number"
    ? new Date(value * 1000).toISOString().slice(0, 10)
    : value

// Shuffled after hydration, so the prerendered order matches the first client
// render. Same items, same heights: only their order changes.
const useShuffled = (options: Option[], shuffle: boolean | undefined) => {
  const [order, setOrder] = useState(options)
  useEffect(() => {
    if (!shuffle) return
    const copy = [...options]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j] as Option, copy[i] as Option]
    }
    setOrder(copy)
  }, [options, shuffle])
  return order
}

const Dropdown = ({
  question: q,
  draft,
  problem,
  setValues,
  labelledBy,
  describedBy,
}: ControlProps) => {
  const { t } = useTranslation("common", { keyPrefix: "form" })
  const options = useShuffled(q.options, q.extraSettings.shuffleOptions)

  return (
    <Select
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={problem ? true : undefined}
      value={draft.values[q.id]?.[0] ?? ""}
      onChange={(e) => setValues(e.target.value ? [e.target.value] : [])}
    >
      <option value="">{t("choose")}</option>
      {options.map((o) => (
        <option key={o.id} value={String(o.id)}>
          {o.text}
        </option>
      ))}
    </Select>
  )
}

const Choices = ({
  question: q,
  draft,
  problem,
  setValues,
  setOther,
  setOtherChecked,
  describedBy,
}: ControlProps) => {
  const { t } = useTranslation("common", { keyPrefix: "form" })
  const single = q.type === "multiple_unique"
  const values = draft.values[q.id] ?? []
  const options = useShuffled(q.options, q.extraSettings.shuffleOptions)
  const otherChecked = draft.otherChecked[q.id] ?? false
  const name = `q-${q.id}`

  const toggle = (id: string, checked: boolean) => {
    if (single) {
      setValues(checked ? [id] : [])
      setOtherChecked(false)
    } else {
      setValues(checked ? [...values, id] : values.filter((v) => v !== id))
    }
  }

  const row =
    "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-background"

  return (
    <div className="-mx-2 space-y-1">
      {options.map((o) => (
        <label key={o.id} className={row}>
          <Check
            type={single ? "radio" : "checkbox"}
            name={name}
            aria-invalid={problem ? true : undefined}
            checked={values.includes(String(o.id))}
            onChange={(e) => toggle(String(o.id), e.target.checked)}
          />
          <span>{o.text}</span>
        </label>
      ))}
      {q.extraSettings.allowOtherAnswer && (
        <div className={cn(row, "flex-wrap")}>
          <label className="flex cursor-pointer items-center gap-3">
            <Check
              type={single ? "radio" : "checkbox"}
              name={name}
              checked={otherChecked}
              onChange={(e) => {
                if (single && e.target.checked) setValues([])
                setOtherChecked(e.target.checked)
              }}
            />
            <span>{t("other")}</span>
          </label>
          <Input
            className="h-9 min-w-48 flex-1"
            aria-label={t("other")}
            aria-describedby={describedBy}
            placeholder={t("otherPlaceholder")}
            value={draft.other[q.id] ?? ""}
            onChange={(e) => {
              setOther(e.target.value)
              if (e.target.value && !otherChecked) {
                if (single) setValues([])
                setOtherChecked(true)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}

const Scale = ({ question: q, draft, problem, setValues }: ControlProps) => {
  const s = q.extraSettings
  const low = s.optionsLowest ?? 1
  const high = s.optionsHighest ?? 5
  const steps = Array.from({ length: high - low + 1 }, (_, i) => low + i)
  const value = draft.values[q.id]?.[0]

  return (
    // inline-flex so the end labels span exactly the row of steps.
    <div className="inline-flex max-w-full flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <label key={step} className="relative">
            <input
              type="radio"
              name={`q-${q.id}`}
              className="peer sr-only"
              aria-invalid={problem ? true : undefined}
              checked={value === String(step)}
              onChange={() => setValues([String(step)])}
            />
            <span className="flex size-11 cursor-pointer items-center justify-center rounded-full border-2 border-border-strong font-display text-base transition-colors hover:border-primary peer-checked:border-primary peer-checked:bg-primary peer-checked:text-always-dark peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 light:peer-checked:text-white">
              {step}
            </span>
          </label>
        ))}
      </div>
      {(s.optionsLabelLowest || s.optionsLabelHighest) && (
        <div className="flex justify-between gap-4 text-sm text-muted-foreground">
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

// Forms wants every option exactly once, in ranked order. Untouched means
// unanswered, so a default order is never sent by accident.
const Ranking = ({ question: q, draft, setValues }: ControlProps) => {
  const { t } = useTranslation("common", { keyPrefix: "form" })
  const shuffled = useShuffled(q.options, q.extraSettings.shuffleOptions)
  const chosen = draft.values[q.id]
  const byId = new Map(q.options.map((o) => [String(o.id), o]))
  const order = chosen
    ? chosen.map((id) => byId.get(id)).filter((o): o is Option => !!o)
    : shuffled

  const move = (index: number, by: -1 | 1) => {
    const ids = order.map((o) => String(o.id))
    const target = index + by
    ;[ids[index], ids[target]] = [ids[target] as string, ids[index] as string]
    setValues(ids)
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {order.map((o, i) => (
          <li
            key={o.id}
            className="flex items-center gap-3 rounded-md border border-border bg-background py-1 pl-3 pr-1"
          >
            <span className="w-5 font-mono text-sm text-muted-foreground">
              {i + 1}
            </span>
            <span className="flex-1">{o.text}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={i === 0}
              onClick={() => move(i, -1)}
              aria-label={t("moveUp", { item: o.text })}
            >
              <Arrow up />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={i === order.length - 1}
              onClick={() => move(i, 1)}
              aria-label={t("moveDown", { item: o.text })}
            >
              <Arrow />
            </Button>
          </li>
        ))}
      </ol>
      {chosen ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("orderChosen")}
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setValues(order.map((o) => String(o.id)))}
        >
          {t("keepOrder")}
        </Button>
      )}
    </div>
  )
}

const Arrow = ({ up }: { up?: boolean }) => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={up ? "rotate-180" : undefined}
  >
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </svg>
)
