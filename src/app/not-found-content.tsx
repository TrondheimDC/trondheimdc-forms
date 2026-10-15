"use client"

import { NotFoundIllustration } from "@/components/illustrations"
import { StatusScreen } from "@/components/StatusScreen"
import { Button } from "@/components/ui/button"
import { copy } from "@/copy"

// Also what forms.trondheimdc.no/ itself shows: forms are only reachable by
// their own link, nothing lists them.
export const NotFoundContent = () => {
  return (
    <StatusScreen
      illustration={<NotFoundIllustration />}
      code="404"
      title={copy.notFound.title}
      body={copy.notFound.body}
      actions={
        <Button asChild variant="outline">
          <a href="https://trondheimdc.no">{copy.notFound.back}</a>
        </Button>
      }
    />
  )
}
