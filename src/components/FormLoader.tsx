"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { copy } from "@/copy"
import { LOGIN_ENABLED, NEXTCLOUD_URL } from "@/lib/config"
import { loadForm } from "@/lib/load"
import { startLogin } from "@/lib/session"
import { FeedbackForm } from "./FeedbackForm"
import { FormsLoading } from "./FormsLoading"
import {
  ClosedIllustration,
  ErrorIllustration,
  ForbiddenIllustration,
  LoginIllustration,
  NotFoundIllustration,
} from "./illustrations"
import { StatusScreen } from "./StatusScreen"

// Fetches the form from Nextcloud in the browser, so the page is always the
// form as it is right now. `shareHash` comes from forms.config.ts for the
// named pages, or from the URL for /s/{hash}. `oneAnswer` holds the form to
// one answer per person in this browser, where Nextcloud would take more.
export const FormLoader = ({
  shareHash,
  oneAnswer,
}: {
  shareHash?: string
  oneAnswer?: boolean
}) => {
  // null until read from the address, which only the browser has.
  const [hash, setHash] = useState<string | null>(null)
  // /auth/callback sends people back with ?login=failed when it didn't take.
  const [loginFailed, setLoginFailed] = useState(false)

  useEffect(() => {
    // /s/{hash}: one prerendered page for every hash, nginx maps them all to it.
    setHash(
      shareHash ?? window.location.pathname.match(/^\/s\/([^/]+)/)?.[1] ?? "",
    )
    const params = new URLSearchParams(window.location.search)
    if (params.has("login")) {
      setLoginFailed(params.get("login") === "failed")
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [shareHash])

  const {
    data: loaded,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["form", hash],
    queryFn: () => loadForm(hash ?? ""),
    enabled: hash !== null,
  })

  if (!loaded || isFetching) return <FormsLoading label={copy.load.loading} />

  switch (loaded.kind) {
    case "form":
      return (
        <FeedbackForm
          form={
            oneAnswer ? { ...loaded.form, submitMultiple: false } : loaded.form
          }
        />
      )
    case "login":
      return (
        <StatusScreen
          illustration={<LoginIllustration />}
          title={copy.load.loginTitle}
          body={
            <>
              <p>{copy.load.loginBody}</p>
              {loginFailed && (
                <p className="mt-3 font-semibold text-danger" role="alert">
                  {copy.load.loginFailed}
                </p>
              )}
            </>
          }
          actions={
            LOGIN_ENABLED ? (
              <Button onClick={startLogin}>{copy.load.loginButton}</Button>
            ) : (
              // Logging in here is parked: answer it in Nextcloud instead.
              <Button asChild>
                <a href={`${NEXTCLOUD_URL}/apps/forms/${hash ?? ""}`}>
                  {copy.load.openInNextcloud}
                </a>
              </Button>
            )
          }
        />
      )
    case "forbidden":
      return (
        <StatusScreen
          tone="danger"
          illustration={<ForbiddenIllustration />}
          title={copy.load.forbiddenTitle}
          body={copy.load.forbiddenBody}
        />
      )
    case "expired":
      return (
        <StatusScreen
          illustration={<ClosedIllustration />}
          title={copy.load.expiredTitle}
          body={copy.load.expiredBody}
        />
      )
    case "notfound":
      return (
        <StatusScreen
          illustration={<NotFoundIllustration />}
          code="404"
          title={copy.load.notfoundTitle}
          body={copy.load.notfoundBody}
        />
      )
    case "failed":
      return (
        <StatusScreen
          tone="danger"
          illustration={<ErrorIllustration />}
          title={copy.load.failedTitle}
          body={copy.load.failedBody}
          actions={
            <Button onClick={() => void refetch()}>{copy.load.retry}</Button>
          }
        />
      )
  }
}
