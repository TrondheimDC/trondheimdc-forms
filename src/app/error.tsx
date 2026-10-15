"use client"

import { useEffect } from "react"
import { ErrorIllustration } from "@/components/illustrations"
import { StatusScreen } from "@/components/StatusScreen"
import { Button } from "@/components/ui/button"
import { copy } from "@/copy"

// A page crashed while rendering. The layout (header, theme) still stands.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <StatusScreen
      tone="danger"
      illustration={<ErrorIllustration />}
      code={copy.error.code}
      title={copy.error.title}
      body={copy.error.body}
      digest={error.digest}
      actions={<Button onClick={reset}>{copy.error.retry}</Button>}
    />
  )
}
