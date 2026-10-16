"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { NotFoundIllustration } from "@/components/illustrations"
import { QrShare } from "@/components/QrShare"
import { StatusScreen } from "@/components/StatusScreen"
import { copy } from "@/copy"
import { loadForm } from "@/lib/load"

// The hash is in the address, which only the browser has. The form is
// loaded for its title, and so that a mistyped hash gets no QR code.
export const SharedQrContent = () => {
  const [hash, setHash] = useState<string | null>(null)

  useEffect(() => {
    setHash(window.location.pathname.match(/^\/s\/([^/]+)\/qr/)?.[1] ?? "")
  }, [])

  const { data: loaded } = useQuery({
    queryKey: ["form", hash],
    queryFn: () => loadForm(hash ?? ""),
    enabled: hash !== null,
  })

  if (loaded?.kind === "notfound")
    return (
      <StatusScreen
        illustration={<NotFoundIllustration />}
        code="404"
        title={copy.load.notfoundTitle}
        body={copy.load.notfoundBody}
      />
    )

  // Closed, logged-in only or not loading: the link is still the link.
  return (
    <QrShare
      path={hash ? `/s/${hash}` : null}
      title={
        loaded ? (loaded.kind === "form" ? loaded.form.title : undefined) : null
      }
      name={hash ?? "form"}
    />
  )
}
