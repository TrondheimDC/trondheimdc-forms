import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { QrShare } from "@/components/QrShare"
import { copy } from "@/copy"
import { configForm, configForms } from "@/lib/config"

// A named form's QR code, /{slug}/share: add /share to the form's link to
// get it. Drawn from the link, so it's in the page from the start.
export const dynamicParams = false

export const generateStaticParams = () =>
  configForms.map(({ slug }) => ({ slug }))

type Props = { params: Promise<{ slug: string }> }

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const form = configForm((await params).slug)
  if (!form) return {}
  return {
    title: copy.share.pageTitle({ title: form.title }),
    robots: { index: false },
  }
}

export default async function FormSharePage({ params }: Props) {
  const form = configForm((await params).slug)
  if (!form) notFound()

  return <QrShare path={`/${form.slug}`} title={form.title} name={form.slug} />
}
