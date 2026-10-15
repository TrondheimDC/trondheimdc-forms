"use client"

import { useEffect } from "react"
import { ErrorIllustration } from "@/components/illustrations"
import { StatusScreen } from "@/components/StatusScreen"
import { Button } from "@/components/ui/button"
import "./globals.css"

// The root layout itself crashed: no providers, so reload instead of reset().
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <title>Something went wrong · TrondheimDC</title>
        <StatusScreen
          tone="danger"
          illustration={<ErrorIllustration />}
          code="Error"
          title="Something went wrong"
          body="The page couldn't start. Reload it."
          digest={error.digest}
          actions={
            <Button onClick={() => window.location.reload()}>Reload</Button>
          }
        />
      </body>
    </html>
  )
}
