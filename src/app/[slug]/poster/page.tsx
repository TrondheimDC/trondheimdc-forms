import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Poster } from "@/components/Poster"
import { copy } from "@/copy"
import { configForm, configForms } from "@/lib/config"

// A named form's poster, /{slug}/poster: add /poster to the form's link to
// get it. Its `description` from forms.config.ts goes under the title.
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
    title: copy.poster.pageTitle({ title: form.title }),
    robots: { index: false },
  }
}

export default async function FormPosterPage({ params }: Props) {
  const form = configForm((await params).slug)
  if (!form) notFound()

  return (
    <Poster
      path={`/${form.slug}`}
      title={form.title}
      description={form.description}
    />
  )
}
