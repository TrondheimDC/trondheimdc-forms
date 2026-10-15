"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { LOGIN_ENABLED, NEXTCLOUD_URL } from "@/lib/config"
import { type Loaded, loadForm } from "@/lib/load"
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
// form as it is right now. `shareHash` comes from forms.config.json for the
// named pages, or from the URL for /s/{hash}.
export const FormLoader = ({ shareHash }: { shareHash?: string }) => {
  const { t } = useTranslation("common", { keyPrefix: "load" })
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [hash, setHash] = useState("")
  // /auth/callback sends people back with ?login=failed when it didn't take.
  const [loginFailed, setLoginFailed] = useState(false)

  useEffect(() => {
    // /s/{hash}: one prerendered page for every hash, nginx maps them all to it.
    const hash =
      shareHash ?? window.location.pathname.match(/^\/s\/([^/]+)/)?.[1] ?? ""
    setHash(hash)
    const params = new URLSearchParams(window.location.search)
    if (params.has("login")) {
      setLoginFailed(params.get("login") === "failed")
      window.history.replaceState(null, "", window.location.pathname)
    }
    let current = true
    void loadForm(hash).then((result) => {
      if (current) setLoaded(result)
    })
    return () => {
      current = false
    }
  }, [shareHash])

  if (!loaded) return <FormsLoading label={t("loading")} />

  switch (loaded.kind) {
    case "form":
      return <FeedbackForm form={loaded.form} />
    case "login":
      return (
        <StatusScreen
          illustration={<LoginIllustration />}
          title={t("loginTitle")}
          body={
            <>
              <p>{t("loginBody")}</p>
              {loginFailed && (
                <p className="mt-3 font-semibold text-danger" role="alert">
                  {t("loginFailed")}
                </p>
              )}
            </>
          }
          actions={
            LOGIN_ENABLED ? (
              <Button onClick={startLogin}>{t("loginButton")}</Button>
            ) : (
              // Logging in here is parked: answer it in Nextcloud instead.
              <Button asChild>
                <a href={`${NEXTCLOUD_URL}/apps/forms/${hash}`}>
                  {t("openInNextcloud")}
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
          title={t("forbiddenTitle")}
          body={t("forbiddenBody")}
        />
      )
    case "expired":
      return (
        <StatusScreen
          illustration={<ClosedIllustration />}
          title={t("expiredTitle")}
          body={t("expiredBody")}
        />
      )
    case "notfound":
      return (
        <StatusScreen
          illustration={<NotFoundIllustration />}
          code="404"
          title={t("notfoundTitle")}
          body={t("notfoundBody")}
        />
      )
    case "failed":
      return (
        <StatusScreen
          tone="danger"
          illustration={<ErrorIllustration />}
          title={t("failedTitle")}
          body={t("failedBody")}
          actions={
            <Button onClick={() => window.location.reload()}>
              {t("retry")}
            </Button>
          }
        />
      )
  }
}
