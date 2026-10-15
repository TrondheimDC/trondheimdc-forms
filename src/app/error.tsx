"use client"

import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { ErrorIllustration } from "@/components/illustrations"
import { StatusScreen } from "@/components/StatusScreen"
import { Button } from "@/components/ui/button"

// A page crashed while rendering. The layout (header, i18n) still stands.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useTranslation("common", { keyPrefix: "error" })

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusScreen
      tone="danger"
      illustration={<ErrorIllustration />}
      code={t("code")}
      title={t("title")}
      body={t("body")}
      digest={error.digest}
      actions={<Button onClick={reset}>{t("retry")}</Button>}
    />
  )
}
