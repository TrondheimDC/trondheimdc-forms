"use client"

import { useEffect } from "react"
import { ErrorIllustration } from "@/components/illustrations"
import { StatusScreen } from "@/components/StatusScreen"
import { Button } from "@/components/ui/button"
import "./globals.css"

// The root layout itself crashed: no providers, no i18n, so Norwegian only,
// and reload instead of reset().
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="no">
      <body>
        <title>Noe gikk galt · TrondheimDC</title>
        <StatusScreen
          tone="danger"
          illustration={<ErrorIllustration />}
          code="Feil"
          title="Noe gikk galt"
          body="Siden fikk ikke startet. Last den inn på nytt."
          digest={error.digest}
          actions={
            <Button onClick={() => window.location.reload()}>
              Last inn på nytt
            </Button>
          }
        />
      </body>
    </html>
  )
}
