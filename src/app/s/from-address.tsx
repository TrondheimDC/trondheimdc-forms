"use client"

import { useQuery } from "@tanstack/react-query"
import { type ReactNode, useEffect, useState } from "react"
import { NotFoundIllustration } from "@/components/illustrations"
import { Poster } from "@/components/Poster"
import { QrShare } from "@/components/QrShare"
import { StatusScreen } from "@/components/StatusScreen"
import { copy } from "@/copy"
import { loadForm } from "@/lib/load"

export type SharedForm = {
  // The form's own path, /s/{hash}: null until read from the address.
  path: string | null
  // null while the form loads; undefined when it has none to show.
  title: string | null | undefined
  // For downloaded files' names.
  name: string
}

// /s/{hash}/share and /s/{hash}/poster: the hash is in the address, which
// only the browser has. The form is loaded for its title, and so that a
// mistyped hash gets no QR code.
const FromAddress = ({
  page,
  children,
}: {
  page: "share" | "poster"
  children: (form: SharedForm) => ReactNode
}) => {
  const [hash, setHash] = useState<string | null>(null)

  useEffect(() => {
    const match = window.location.pathname.match(/^\/s\/([^/]+)\/([^/]+)/)
    setHash(match?.[2] === page ? (match[1] ?? "") : "")
  }, [page])

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
  return children({
    path: hash ? `/s/${hash}` : null,
    title: loaded
      ? loaded.kind === "form"
        ? loaded.form.title
        : undefined
      : null,
    name: hash ?? "form",
  })
}

// Here rather than in the pages: a server page can't hand a client
// component a function.
export const SharedShare = () => (
  <FromAddress page="share">{(form) => <QrShare {...form} />}</FromAddress>
)

export const SharedPoster = () => (
  <FromAddress page="poster">{(form) => <Poster {...form} />}</FromAddress>
)
