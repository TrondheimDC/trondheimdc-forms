"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { type Draft, emptyDraft, toSubmission, validate } from "@/lib/answers"
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
// person. Nextcloud decides for real; this only spares people a form they
// can't send.
const sentKey = (form: PublicForm) => `tdc-forms:sent:${form.id}`

export const FeedbackForm = ({ form }: { form: PublicForm }) => {
  const { t, i18n } = useTranslation("common", { keyPrefix: "form" })
  const { user } = useSession()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [status, setStatus] = useState<Status>({ kind: "filling" })
  const [showProblems, setShowProblems] = useState(false)
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

  const update =
    <K extends keyof Draft>(key: K, id: number) =>
    (value: Draft[K][number]) =>
      setDraft((d) => ({ ...d, [key]: { ...d[key], [id]: value } }))

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (problemCount > 0) {
      setShowProblems(true)
      const first = form.questions.find((q) => problems[q.id])
      document.getElementById(`q-${first?.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
      return
    }

    setStatus({ kind: "sending" })
    try {
      await submit(form, toSubmission(form.questions, draft))
      if (!form.submitMultiple && !form.sample) {
        localStorage.setItem(sentKey(form), new Date().toISOString())
      }
      setStatus({ kind: "sent" })
      window.scrollTo({ top: 0 })
    } catch (error) {
      const message =
        error instanceof SubmitError && error.message
          ? t("errorServer", { message: error.message })
          : t("errorGeneric")
      setStatus({ kind: "failed", message })
    }
  }

  const header = (
    <header className="space-y-4">
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
        kicker={form.title}
        title={t("thanksTitle")}
        body={
          <Markdown>{form.submissionMessage || t("thanksDefault")}</Markdown>
        }
        actions={
          form.submitMultiple && (
            <Button
              variant="outline"
              onClick={() => {
                setDraft(emptyDraft())
                setShowProblems(false)
                setStatus({ kind: "filling" })
              }}
            >
              {t("again")}
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
        title={t("closedTitle")}
        body={t("closedBody")}
      />
    )
  }

  if (alreadySent) {
    return (
      <StatusScreen
        illustration={<DoneIllustration />}
        kicker={form.title}
        title={t("alreadyTitle")}
        body={t("alreadyBody")}
      />
    )
  }

  if (unsupported(form).length > 0) {
    return (
      <StatusScreen
        illustration={<ElsewhereIllustration />}
        kicker={form.title}
        title={t("unsupportedTitle")}
        body={t("unsupportedBody")}
        actions={
          <Button asChild>
            <a href={form.nextcloudUrl}>{t("openInNextcloud")}</a>
          </Button>
        }
      />
    )
  }

  const expires =
    form.expires > 0
      ? new Date(form.expires * 1000).toLocaleString(
          i18n.language === "en" ? "en-GB" : "nb-NO",
          { dateStyle: "long", timeStyle: "short" },
        )
      : null

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14"
    >
      {header}

      <div className="space-y-1 text-sm text-muted-foreground">
        {form.sample && (
          <p className="font-semibold text-accent">{t("sample")}</p>
        )}
        {form.isAnonymous ? (
          <p>{t("anonymous")}</p>
        ) : (
          user && <p>{t("answeringAs", { name: user.displayName })}</p>
        )}
        {expires && <p>{t("expires", { date: expires })}</p>}
        {form.questions.some((q) => q.isRequired) && <p>{t("requiredNote")}</p>}
      </div>

      <div className="space-y-5">
        {form.questions.map((q) => (
          <Question
            key={q.id}
            question={q}
            draft={draft}
            problem={showProblems ? problems[q.id] : undefined}
            setValues={update("values", q.id)}
            setOther={update("other", q.id)}
            setOtherChecked={update("otherChecked", q.id)}
          />
        ))}
      </div>

      <div className="space-y-4">
        {/* Kept mounted so screen readers announce the message when it
            appears, rather than missing a live region added with it. */}
        <div aria-live="polite" className="empty:hidden">
          {showProblems && problemCount > 0 && (
            <p className="font-semibold text-danger">
              {t("fixErrors", { count: problemCount })}
            </p>
          )}
          {status.kind === "failed" && (
            <p className="font-semibold text-danger">{status.message}</p>
          )}
        </div>
        <Button type="submit" size="lg" disabled={status.kind === "sending"}>
          {status.kind === "sending" ? t("submitting") : t("submit")}
        </Button>
      </div>
    </form>
  )
}
