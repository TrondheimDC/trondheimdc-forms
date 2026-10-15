"use client"

import { useTranslation } from "react-i18next"
import { NotFoundIllustration } from "@/components/illustrations"
import { StatusScreen } from "@/components/StatusScreen"
import { Button } from "@/components/ui/button"

// Also what forms.trondheimdc.no/ itself shows: forms are only reachable by
// their own link, nothing lists them.
export const NotFoundContent = () => {
  const { t } = useTranslation("common", { keyPrefix: "notFound" })
  return (
    <StatusScreen
      illustration={<NotFoundIllustration />}
      code="404"
      title={t("title")}
      body={t("body")}
      actions={
        <Button asChild variant="outline">
          <a href="https://trondheimdc.no">{t("back")}</a>
        </Button>
      }
    />
  )
}
