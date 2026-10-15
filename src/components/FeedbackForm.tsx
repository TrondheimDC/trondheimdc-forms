"use client"

import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { copy } from "@/copy"
import {
  type Draft,
  emptyDraft,
  isDraft,
  toSubmission,
  validate,
} from "@/lib/answers"
import { isOpen, type PublicForm, unsupported } from "@/lib/forms"
import { SubmitError, submit } from "@/lib/submit"
import {
  ClosedIllustration,
  DoneIllustration,
  ElsewhereIllustration,
} from "./illustrations"
import { Markdown } from "./Markdown"
import { Question } from "./Question"
import { useSession } from "./Session"
import { StatusScreen } from "./StatusScreen"

type Status =
  | { kind: "filling" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "failed"; message: string }

// Remembers a sent answer in this browser, for forms that take one answer per
// person: as Nextcloud says for a logged-in user, or as `oneAnswer` in
// forms.config.ts says for a public link, where Nextcloud takes any number.
const sentKey = (form: PublicForm) => `tdc-forms:sent:${form.id}`

// Answers being written, kept for this tab only, so a reload or a trip back
// and forth doesn't lose them. sessionStorage rather than localStorage: on a
// shared machine the next person shouldn't find them.
const draftKey = (form: PublicForm) => `tdc-forms:draft:${form.id}`

const readDraft = (form: PublicForm): Draft | null => {
  try {
    const saved: unknown = JSON.parse(
      sessionStorage.getItem(draftKey(form)) ?? "null",
    )
    return isDraft(saved) ? saved : null
  } catch {
    return null
  }
}

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

// The first thing to focus in a question: the chosen option of a radio
// group if there is one, else the first control.
const firstControl = (question: Element | null) =>
  question?.querySelector<HTMLElement>(
    "input:checked:not([type=checkbox]), input:not([disabled]), select, textarea, button:not([disabled])",
  )

export const FeedbackForm = ({ form }: { form: PublicForm }) => {
  const { user } = useSession()
  const [restored] = useState(() => readDraft(form))
  const [draft, setDraft] = useState<Draft>(() => restored ?? emptyDraft())
  const [showRestored, setShowRestored] = useState(restored !== null)
  const [status, setStatus] = useState<Status>({ kind: "filling" })
  // Problems show once someone has left a question, so nobody is told off
  // mid-sentence, and only after a try at submitting for unanswered required
  // questions. Once shown, a problem goes away as soon as it is fixed.
  const [left, setLeft] = useState<Record<number, boolean>>({})
  const [showProblems, setShowProblems] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  // Only ever rendered in the browser, after FormLoader has fetched the
  // form, so the clock and storage can be read straight away.
  const [open] = useState(() => isOpen(form, Date.now() / 1000))
  // For a logged-in user Nextcloud says so itself (canSubmit); anonymous
  // visitors only have this browser's memory.
  const [alreadySent] = useState(
    () =>
      form.canSubmit === false ||
      (!form.submitMultiple &&
        !form.sample &&
        localStorage.getItem(sentKey(form)) !== null),
  )

  const problems = validate(form.questions, draft)
  const problemCount = Object.keys(problems).length
  const answers = toSubmission(form.questions, draft)
  // Answered, and good to send as it is.
  const done = (id: number) => !!answers[String(id)] && !problems[id]
  const answered = form.questions.filter((q) => done(q.id)).length
  const started = Object.keys(answers).length > 0

  const shownProblem = (id: number) => {
    const problem = problems[id]
    if (showProblems) return problem
    return left[id] && problem?.kind !== "required" ? problem : undefined
  }

  useEffect(() => {
    if (status.kind === "sent") return
    if (!started) sessionStorage.removeItem(draftKey(form))
    else sessionStorage.setItem(draftKey(form), JSON.stringify(draft))
  }, [form, draft, started, status.kind])

  const update =
    <K extends keyof Draft>(key: K, id: number) =>
    (value: Draft[K][number]) =>
      setDraft((d) => ({ ...d, [key]: { ...d[key], [id]: value } }))

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (status.kind === "sending") return
    if (problemCount > 0) {
      setShowProblems(true)
      const invalid = form.questions
        .filter((q) => problems[q.id])
        .map((q) => document.getElementById(`q-${q.id}`))
      // Focus the first problem without the browser's jump, then glide to
      // it, and give every card with a problem a shake.
      firstControl(invalid[0] ?? null)?.focus({ preventScroll: true })
      invalid[0]?.scrollIntoView({
        behavior: reducedMotion() ? "auto" : "smooth",
        block: "center",
      })
      if (!reducedMotion()) {
        for (const card of invalid) {
          card?.animate(
            [
              { translate: "0" },
              { translate: "-6px" },
              { translate: "5px" },
              { translate: "-3px" },
              { translate: "2px" },
              { translate: "0" },
            ],
            { duration: 420, easing: "ease-out" },
          )
        }
      }
      return
    }

    setStatus({ kind: "sending" })
    try {
      await submit(form, toSubmission(form.questions, draft))
      if (!form.submitMultiple && !form.sample) {
        localStorage.setItem(sentKey(form), new Date().toISOString())
      }
      sessionStorage.removeItem(draftKey(form))
      // The draft it was about is sent: a new answer starts fresh.
      setShowRestored(false)
      setStatus({ kind: "sent" })
      window.scrollTo({ top: 0 })
    } catch (error) {
      const message =
        error instanceof SubmitError && error.message
          ? copy.form.errorServer({ message: error.message })
          : copy.form.errorGeneric
      setStatus({ kind: "failed", message })
    }
  }

  // Enter in a one-line field goes on to the next question, as on a phone's
  // "next" key, rather than submitting a form that is half done. The last
  // one lands on the submit button.
  const onKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    const target = event.target as HTMLElement
    if (
      event.key !== "Enter" ||
      event.nativeEvent.isComposing ||
      !(target instanceof HTMLInputElement) ||
      ["checkbox", "radio", "submit", "button", "color"].includes(target.type)
    )
      return
    event.preventDefault()
    const cards = [
      ...(formRef.current?.querySelectorAll(".question-card") ?? []),
    ]
    const current = cards.findIndex((card) => card.contains(target))
    const next = firstControl(cards[current + 1] ?? null)
    if (next) {
      next.focus({ preventScroll: true })
      next.closest(".question-card")?.scrollIntoView({
        behavior: reducedMotion() ? "auto" : "smooth",
        block: "nearest",
      })
    } else {
      formRef.current?.querySelector<HTMLElement>("[type=submit]")?.focus()
    }
  }

  const header = (
    <header
      className="form-rise space-y-4"
      style={{ "--i": 0 } as React.CSSProperties}
    >
      <h1>{form.title}</h1>
      {form.description && (
        <div className="text-muted-foreground">
          <Markdown>{form.description}</Markdown>
        </div>
      )}
    </header>
  )

  if (status.kind === "sent") {
    return (
      <StatusScreen
        illustration={<DoneIllustration />}
        celebrate
        kicker={form.title}
        title={copy.form.thanksTitle}
        body={
          <Markdown>
            {form.submissionMessage || copy.form.thanksDefault}
          </Markdown>
        }
        actions={
          form.submitMultiple && (
            <Button
              variant="outline"
              onClick={() => {
                setDraft(emptyDraft())
                setLeft({})
                setShowProblems(false)
                setStatus({ kind: "filling" })
              }}
            >
              {copy.form.again}
            </Button>
          )
        }
      />
    )
  }

  if (!open) {
    return (
      <StatusScreen
        illustration={<ClosedIllustration />}
        kicker={form.title}
        title={copy.form.closedTitle}
        body={copy.form.closedBody}
      />
    )
  }

  if (alreadySent) {
    return (
      <StatusScreen
        illustration={<DoneIllustration />}
        kicker={form.title}
        title={copy.form.alreadyTitle}
        body={copy.form.alreadyBody}
      />
    )
  }

  if (unsupported(form).length > 0) {
    return (
      <StatusScreen
        illustration={<ElsewhereIllustration />}
        kicker={form.title}
        title={copy.form.unsupportedTitle}
        body={copy.form.unsupportedBody}
        actions={
          <Button asChild>
            <a href={form.nextcloudUrl}>{copy.form.openInNextcloud}</a>
          </Button>
        }
      />
    )
  }

  // Only when the form says to show it: a closing date can be set without.
  const expires =
    form.expires > 0 && form.showExpiration
      ? new Date(form.expires * 1000).toLocaleString("en-GB", {
          dateStyle: "long",
          timeStyle: "short",
        })
      : null

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      noValidate
      className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14"
    >
      <Progress answered={answered} total={form.questions.length} />

      {header}

      <div
        className="form-rise space-y-1 text-sm text-muted-foreground"
        style={{ "--i": 0 } as React.CSSProperties}
      >
        {form.sample && (
          <p className="font-semibold text-accent">{copy.form.sample}</p>
        )}
        {form.isAnonymous ? (
          <p>{copy.form.anonymous}</p>
        ) : (
          user && <p>{copy.form.answeringAs({ name: user.displayName })}</p>
        )}
        {expires && <p>{copy.form.expires({ date: expires })}</p>}
        {form.questions.some((q) => q.isRequired) && (
          <p>{copy.form.requiredNote}</p>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showRestored && (
          <motion.div
            key="restored"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-primary/40 bg-primary/10 px-5 py-3 text-sm">
              <p>{copy.form.draftRestored}</p>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => {
                  setDraft(emptyDraft())
                  setLeft({})
                  setShowProblems(false)
                  setShowRestored(false)
                }}
              >
                {copy.form.clearDraft}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-5">
        {form.questions.map((q, index) => (
          <Question
            key={q.id}
            question={q}
            index={index}
            answered={done(q.id)}
            draft={draft}
            problem={shownProblem(q.id)}
            setValues={update("values", q.id)}
            setOther={update("other", q.id)}
            setOtherChecked={update("otherChecked", q.id)}
            onLeave={() =>
              setLeft((l) => (l[q.id] ? l : { ...l, [q.id]: true }))
            }
          />
        ))}
      </div>

      <div
        className="form-rise space-y-4"
        style={{ "--i": form.questions.length + 1 } as React.CSSProperties}
      >
        {/* Kept mounted so screen readers announce the message when it
            appears, rather than missing a live region added with it. */}
        <div aria-live="polite" className="empty:hidden">
          {showProblems && problemCount > 0 && (
            <p className="font-semibold text-danger">
              {copy.form.fixErrors({ count: problemCount })}
            </p>
          )}
          {status.kind === "failed" && (
            <p className="font-semibold text-danger">{status.message}</p>
          )}
        </div>
        <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center">
          <Button
            type="submit"
            size="lg"
            aria-disabled={status.kind === "sending" || undefined}
            className="relative aria-disabled:pointer-events-none"
          >
            {/* Both labels take up room, so the button keeps its width. */}
            <span
              className={status.kind === "sending" ? "invisible" : undefined}
            >
              {copy.form.submit}
            </span>
            {status.kind === "sending" && (
              <span className="absolute inset-0 flex items-center justify-center gap-3">
                <span className="submit-spinner" aria-hidden="true" />
                {copy.form.submitting}
              </span>
            )}
          </Button>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {copy.form.progress({ answered, total: form.questions.length })}
          </p>
        </div>
      </div>
    </form>
  )
}

// A thin bar under the header that fills as questions are answered.
const Progress = ({ answered, total }: { answered: number; total: number }) => {
  return (
    <div
      role="progressbar"
      aria-label={copy.form.progressLabel}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={answered}
      aria-valuetext={copy.form.progress({ answered, total })}
      className="fixed inset-x-0 top-16 z-40 h-[3px] bg-border/60"
    >
      <div
        className="form-progress h-full origin-left bg-primary"
        style={{ scale: `${total ? answered / total : 0} 1` }}
      />
    </div>
  )
}
