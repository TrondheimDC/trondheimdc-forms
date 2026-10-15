import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { FormLoader } from "@/components/FormLoader"
import { copy } from "@/copy"
import { configForm, configForms } from "@/lib/config"
import { OG_IMAGE, pageMetadata } from "@/lib/metadata"

// Named pages for the forms in forms.config.ts, for links and QR codes.
// Only the name is fixed at build time; the questions load in the browser.
export const dynamicParams = false

export const generateStaticParams = () =>
  configForms.map(({ slug }) => ({ slug }))

type Props = { params: Promise<{ slug: string }> }

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const form = configForm((await params).slug)
  if (!form) return {}
  return pageMetadata({
    title: form.title,
    description: form.description ?? copy.meta.description,
    path: `/${form.slug}`,
    // Its own preview, with the form's title on it ([slug]/og.png).
    image: { ...OG_IMAGE, url: `/${form.slug}/og.png`, alt: form.title },
  })
}

export default async function FormPage({ params }: Props) {
  const form = configForm((await params).slug)
  if (!form) notFound()

  return <FormLoader shareHash={form.shareHash} oneAnswer={form.oneAnswer} />
}
