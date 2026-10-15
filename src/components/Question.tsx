"use client"

import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Check, Input, Select, Textarea } from "@/components/ui/field"
import type { Draft, Problem } from "@/lib/answers"
import type { Option, Question as Q } from "@/lib/forms"
import { cn } from "@/lib/utils"
import { Markdown } from "./Markdown"

export type QuestionProps = {
  question: Q
  // Position in the form, from 0: the number on the card and the delay it
  // rises in with.
  index: number
  answered: boolean
  draft: Draft
  problem: Problem | undefined
  setValues: (values: string[]) => void
  setOther: (text: string) => void
  setOtherChecked: (checked: boolean) => void
  // Focus left the question, so a problem with it may be shown now.
  onLeave: () => void
}

export const Question = (props: QuestionProps) => {
  const { question: q, index, answered, problem, onLeave } = props
  const { t } = useTranslation("common")
  const ids = {
    legend: `q-${q.id}-label`,
    description: `q-${q.id}-description`,
    hint: `q-${q.id}-hint`,
    problem: `q-${q.id}-problem`,
  }
  const hint = useHint(q)
  const describedBy =
    [q.description && ids.description, hint && ids.hint, problem && ids.problem]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <fieldset
      className="question-card form-rise scroll-mt-24 rounded-xl border border-border bg-card p-5 transition-[border-color,box-shadow] duration-300 focus-within:border-border-strong focus-within:shadow-md data-[invalid]:border-destructive/70 sm:p-6"
      style={{ "--i": index + 1 } as React.CSSProperties}
      aria-describedby={describedBy}
      aria-invalid={problem ? true : undefined}
      data-invalid={problem ? "" : undefined}
      data-answered={answered ? "" : undefined}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onLeave()
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
            <span className="sr-only"> ({t("form.required")})</span>
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

        <Control {...props} labelledBy={ids.legend} describedBy={describedBy} />

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
                {t(
                  `problem.${problem.kind}`,
                  "count" in problem ? { count: problem.count } : {},
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </fieldset>
  )
}

// What the question asks for, said up front rather than only once it's
// wrong: how many to pick, and how to rank.
const useHint = (q: Q) => {
  const { t } = useTranslation("common", { keyPrefix: "form" })
  if (q.type === "ranking") return t("rankHint")
  if (q.type !== "multiple") return null
  const { optionsLimitMin: min, optionsLimitMax: max } = q.extraSettings
  if (min && max)
    return min === max
      ? t("chooseExactly", { count: min })
      : t("chooseBetween", { min, max })
  if (min) return t("chooseAtLeast", { count: min })
  if (max) return t("chooseAtMost", { count: max })
  return null
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
          autoComplete={
            s.validationType === "email"
              ? "email"
              : s.validationType === "phone"
                ? "tel"
                : "off"
          }
          spellCheck={s.validationType ? false : undefined}
          enterKeyHint="next"
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
            enterKeyHint="next"
            className="w-auto min-w-44"
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
                enterKeyHint="next"
                className="w-auto min-w-44"
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
        <div className="flex items-center gap-3">
          <Input
            {...aria}
            type="color"
            className="h-11 w-20 cursor-pointer p-1"
            value={values[0] || "#000000"}
            onChange={(e) => setValues([e.target.value])}
          />
          {values[0] && (
            <span className="font-mono text-sm uppercase text-muted-foreground">
              {values[0]}
            </span>
          )}
        </div>
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
  const value = draft.values[q.id]?.[0] ?? ""

  return (
    <Select
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={problem ? true : undefined}
      className={value ? undefined : "text-muted-foreground"}
      value={value}
      onChange={(e) => setValues(e.target.value ? [e.target.value] : [])}
    >
      <option value="">{t("choose")}</option>
      {options.map((o) => (
        <option key={o.id} value={String(o.id)} className="text-foreground">
          {o.text}
        </option>
      ))}
    </Select>
  )
}

// One option: the whole row is the click target, and it lights up when
// chosen.
const option =
  "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 transition-[border-color,background-color,scale] duration-150 hover:border-border-strong active:scale-[0.99] has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/40"

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
  const otherInput = useRef<HTMLInputElement>(null)
  const name = `q-${q.id}`
  const max = single ? 0 : (q.extraSettings.optionsLimitMax ?? 0)
  const chosen = values.length + (otherChecked ? 1 : 0)

  const toggle = (id: string, checked: boolean) => {
    if (single) {
      setValues(checked ? [id] : [])
      setOtherChecked(false)
    } else {
      setValues(checked ? [...values, id] : values.filter((v) => v !== id))
    }
  }

  return (
    <div className="space-y-2">
      {options.map((o) => (
        <label key={o.id} className={option}>
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
        <div className={cn(option, "cursor-default flex-wrap")}>
          <label className="flex cursor-pointer items-center gap-3">
            <Check
              type={single ? "radio" : "checkbox"}
              name={name}
              checked={otherChecked}
              onChange={(e) => {
                if (single && e.target.checked) setValues([])
                setOtherChecked(e.target.checked)
                if (e.target.checked) otherInput.current?.focus()
              }}
            />
            <span>{t("other")}</span>
          </label>
          <Input
            ref={otherInput}
            className="h-9 min-w-48 flex-1"
            aria-label={t("other")}
            aria-describedby={describedBy}
            placeholder={t("otherPlaceholder")}
            enterKeyHint="next"
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
      {max > 0 && (
        <p
          className={cn(
            "text-right font-mono text-xs tabular-nums transition-colors",
            chosen > max ? "text-danger" : "text-muted-foreground",
          )}
        >
          {t("chosenOf", { count: chosen, max })}
        </p>
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
    // Every step gets an equal share of the row, up to a comfortable size,
    // so even 0 to 10 stays on one line on a phone; the end labels sit
    // under the ends.
    <div
      className="flex w-full flex-col gap-2"
      style={{ maxWidth: `${steps.length * 3.75}rem` }}
    >
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
      >
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
            <span className="scale-step flex h-11 cursor-pointer items-center justify-center rounded-xl border-2 border-border-strong font-display text-base tabular-nums transition-[border-color,background-color,color,scale] duration-150 hover:border-primary active:scale-95 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-brand peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50">
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
// unanswered, so a default order is never sent by accident. Drag by the
// handle, or use the arrows (and the keyboard); either way the rows slide
// into place.
const Ranking = ({ question: q, draft, setValues }: ControlProps) => {
  const { t } = useTranslation("common", { keyPrefix: "form" })
  const shuffled = useShuffled(q.options, q.extraSettings.shuffleOptions)
  const chosen = draft.values[q.id]
  const byId = new Map(q.options.map((o) => [String(o.id), o]))
  const order = chosen
    ? chosen.map((id) => byId.get(id)).filter((o): o is Option => !!o)
    : shuffled
  const ids = order.map((o) => String(o.id))
  const [announcement, setAnnouncement] = useState("")

  const move = (index: number, by: -1 | 1) => {
    const next = [...ids]
    const target = index + by
    ;[next[index], next[target]] = [
      next[target] as string,
      next[index] as string,
    ]
    setValues(next)
    const item = order[index]
    if (item)
      setAnnouncement(t("moved", { item: item.text, position: target + 1 }))
  }

  return (
    <div className="space-y-3">
      <Reorder.Group
        as="ol"
        axis="y"
        values={ids}
        onReorder={setValues}
        className="space-y-2"
      >
        {order.map((o, i) => (
          <RankItem
            key={o.id}
            id={String(o.id)}
            text={o.text}
            position={i}
            count={order.length}
            onMove={(by) => move(i, by)}
          />
        ))}
      </Reorder.Group>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {chosen ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 text-primary"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          {t("orderChosen")}
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setValues(ids)}
        >
          {t("keepOrder")}
        </Button>
      )}
    </div>
  )
}

const RankItem = ({
  id,
  text,
  position,
  count,
  onMove,
}: {
  id: string
  text: string
  position: number
  count: number
  onMove: (by: -1 | 1) => void
}) => {
  const { t } = useTranslation("common", { keyPrefix: "form" })
  const controls = useDragControls()
  const up = useRef<HTMLButtonElement>(null)
  const down = useRef<HTMLButtonElement>(null)

  return (
    <Reorder.Item
      as="li"
      value={id}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, boxShadow: "var(--shadow-lg)", zIndex: 1 }}
      className="relative flex items-center gap-2 rounded-lg border border-border bg-background py-1 pl-1 pr-1"
    >
      {/* Pointer only: keyboards and screen readers use the arrows. */}
      <span
        aria-hidden="true"
        onPointerDown={(e) => controls.start(e)}
        className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground active:cursor-grabbing"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-4"
        >
          {[6, 12, 18].map((y) =>
            [9, 15].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />
            )),
          )}
        </svg>
      </span>
      <span className="w-5 font-mono text-sm tabular-nums text-muted-foreground">
        {position + 1}
      </span>
      <span className="flex-1 select-none">{text}</span>
      <Button
        ref={up}
        type="button"
        variant="ghost"
        size="icon"
        disabled={position === 0}
        onClick={() => {
          onMove(-1)
          // The row moves with focus still on this button; at the top it is
          // disabled, so hand focus to its partner.
          if (position === 1) down.current?.focus()
        }}
        aria-label={t("moveUp", { item: text })}
      >
        <Arrow up />
      </Button>
      <Button
        ref={down}
        type="button"
        variant="ghost"
        size="icon"
        disabled={position === count - 1}
        onClick={() => {
          onMove(1)
          if (position === count - 2) up.current?.focus()
        }}
        aria-label={t("moveDown", { item: text })}
      >
        <Arrow />
      </Button>
    </Reorder.Item>
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
