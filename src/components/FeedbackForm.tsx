"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { FormProvider, useForm, useFormState, useWatch } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { copy } from "@/copy"
import type { Answer } from "@/lib/answers"
import {
  isOpen,
  type PublicForm,
  type Question as QuestionData,
  unsupported,
} from "@/lib/forms"
import { SubmitError, submit } from "@/lib/submit"
import {
  emptyValues,
  fieldName,
  formSchema,
  restoreValues,
  status,
  toSubmission,
} from "@/questions"
import {
  ClosedIllustration,
  DoneIllustration,
  ElsewhereIllustration,
} from "./illustrations"
import { Markdown } from "./Markdown"
import { Question } from "./Question"
import { useSession } from "./Session"
import { StatusScreen } from "./StatusScreen"

// Remembers a sent answer in this browser, for forms that take one answer per
// person: as Nextcloud says for a logged-in user, or as `oneAnswer` in
// forms.config.ts says for a public link, where Nextcloud takes any number.
const sentKey = (form: PublicForm) => `tdc-forms:sent:${form.id}`

// Answers being written, kept for this tab only, so a reload or a trip back
// and forth doesn't lose them. sessionStorage rather than localStorage: on a
// shared machine the next person shouldn't find them.
const draftKey = (form: PublicForm) => `tdc-forms:draft:${form.id}`

const readDraft = (form: PublicForm) => {
  try {
    return restoreValues(
      form.questions,
      JSON.parse(sessionStorage.getItem(draftKey(form)) ?? "null"),
    )
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

// Sending an answer, and what happens once it is in.
const useSending = (form: PublicForm) =>
  useMutation({
    mutationFn: (answers: Record<string, Answer>) => submit(form, answers),
    onSuccess: () => {
      if (!form.submitMultiple && !form.sample) {
        localStorage.setItem(sentKey(form), new Date().toISOString())
      }
      sessionStorage.removeItem(draftKey(form))
      window.scrollTo({ top: 0 })
    },
  })

type Sending = ReturnType<typeof useSending>

// Which screen: the form, or why not, or thanks once it is sent.
export const FeedbackForm = ({ form }: { form: PublicForm }) => {
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
  // Each round of answering is a new form: "Start over" and "Send another
  // answer" begin one, empty.
  const [round, setRound] = useState(0)
  const sending = useSending(form)

  if (sending.isSuccess) {
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
                sending.reset()
                setRound((r) => r + 1)
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

  return (
    <Answering
      key={round}
      form={form}
      sending={sending}
      onStartOver={() => {
        sessionStorage.removeItem(draftKey(form))
        setRound((r) => r + 1)
      }}
    />
  )
}

// The form itself. Nothing here reads the answers or formState while
// rendering: that would render every question on every keystroke. Each
// question, the progress and the problem count subscribe to what they show.
const Answering = ({
  form,
  sending,
  onStartOver,
}: {
  form: PublicForm
  sending: Sending
  onStartOver: () => void
}) => {
  const { user } = useSession()
  const [restored] = useState(() => readDraft(form))
  const [resolver] = useState(() => zodResolver(formSchema(form.questions)))
  const methods = useForm({
    defaultValues: restored ?? emptyValues(form.questions),
    resolver,
    // Every answer is checked as it changes, so a problem can go away as
    // soon as it is fixed. When one is shown is up to its Question.
    mode: "onChange",
    // Focus goes to the first problem in onInvalid, with a glide and a shake.
    shouldFocusError: false,
  })
  const { handleSubmit, subscribe, trigger } = methods
  const formRef = useRef<HTMLFormElement>(null)

  // A restored draft is checked straight away, so leaving a question shows
  // what is wrong with it without changing it first.
  useEffect(() => {
    if (restored) void trigger()
  }, [restored, trigger])

  useEffect(
    () =>
      subscribe({
        formState: { values: true },
        callback: ({ values }) => {
          const started = form.questions.some(
            (q) => status(q, values[fieldName(q.id)]) !== "blank",
          )
          if (started) {
            sessionStorage.setItem(draftKey(form), JSON.stringify(values))
          } else {
            sessionStorage.removeItem(draftKey(form))
          }
        },
      }),
    [form, subscribe],
  )

  const onInvalid = (problems: Record<string, unknown>) => {
    const invalid = form.questions
      .filter((q) => problems[fieldName(q.id)])
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
  }

  const onSubmit = handleSubmit((answers) => {
    if (!sending.isPending)
      sending.mutate(toSubmission(form.questions, answers))
  }, onInvalid)

  const failure =
    sending.error instanceof SubmitError && sending.error.message
      ? copy.form.errorServer({ message: sending.error.message })
      : sending.error
        ? copy.form.errorGeneric
        : null

  // Enter in a one-line field goes on to the next question, as on a phone's
  // "next" key, rather than submitting a form that is half done. The last
  // one lands on the submit button.
  const onKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    const target = event.target
    if (
      event.key !== "Enter" ||
      event.nativeEvent.isComposing ||
      !(target instanceof HTMLInputElement) ||
      ["checkbox", "radio", "submit", "button", "color", "file"].includes(
        target.type,
      )
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

  // Only when the form says to show it: a closing date can be set without.
  const expires =
    form.expires > 0 && form.showExpiration
      ? new Date(form.expires * 1000).toLocaleString("en-GB", {
          dateStyle: "long",
          timeStyle: "short",
        })
      : null

  return (
    <FormProvider {...methods}>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        onKeyDown={onKeyDown}
        noValidate
        className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14"
      >
        <Progress questions={form.questions} />

        <header className="form-rise space-y-4" style={{ "--i": 0 }}>
          <h1>{form.title}</h1>
          {form.description && (
            <div className="text-muted-foreground">
              <Markdown>{form.description}</Markdown>
            </div>
          )}
        </header>

        <div
          className="form-rise space-y-1 text-sm text-muted-foreground"
          style={{ "--i": 0 }}
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

        {restored && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-primary/40 bg-primary/10 px-5 py-3 text-sm">
              <p>{copy.form.draftRestored}</p>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={onStartOver}
              >
                {copy.form.clearDraft}
              </Button>
            </div>
          </motion.div>
        )}

        <div className="space-y-5">
          {form.questions.map((q, index) => (
            <Question key={q.id} form={form} question={q} index={index} />
          ))}
        </div>

        <div
          className="form-rise space-y-4"
          style={{ "--i": form.questions.length + 1 }}
        >
          {/* Kept mounted so screen readers announce the message when it
              appears, rather than missing a live region added with it. */}
          <div aria-live="polite" className="empty:hidden">
            <ProblemCount />
            {failure && <p className="font-semibold text-danger">{failure}</p>}
          </div>
          <div className="flex flex-col-reverse items-stretch gap-4 sm:flex-row sm:items-center">
            <Button
              type="submit"
              size="lg"
              aria-disabled={sending.isPending || undefined}
              className="relative aria-disabled:pointer-events-none"
            >
              {/* Both labels take up room, so the button keeps its width. */}
              <span className={sending.isPending ? "invisible" : undefined}>
                {copy.form.submit}
              </span>
              {sending.isPending && (
                <span className="absolute inset-0 flex items-center justify-center gap-3">
                  <span className="submit-spinner" aria-hidden="true" />
                  {copy.form.submitting}
                </span>
              )}
            </Button>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              <Tally questions={form.questions} />
            </p>
          </div>
        </div>
      </form>
    </FormProvider>
  )
}

// How many questions are done. Worked out on every change, but only renders
// what shows it when the number changes.
const useAnswered = (questions: QuestionData[]) =>
  useWatch({
    compute: (values: Record<string, unknown>) =>
      questions.filter((q) => status(q, values[fieldName(q.id)]) === "done")
        .length,
  })

const Tally = ({ questions }: { questions: QuestionData[] }) => {
  const answered = useAnswered(questions)
  return copy.form.progress({ answered, total: questions.length })
}

// After a try at submitting: how many questions still have a problem.
const ProblemCount = () => {
  const { errors, isSubmitted } = useFormState()
  const count = Object.keys(errors).length
  if (!isSubmitted || count === 0) return null
  return (
    <p className="font-semibold text-danger">
      {copy.form.fixErrors({ count })}
    </p>
  )
}

// A thin bar under the header that fills as questions are answered.
const Progress = ({ questions }: { questions: QuestionData[] }) => {
  const answered = useAnswered(questions)
  const total = questions.length
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
