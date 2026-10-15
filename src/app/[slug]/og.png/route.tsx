// A named form's link preview, /{slug}/og.png: its title on the site's
// image (src/lib/og-image.tsx), one per form in forms.config.json.
import { configForm, configForms } from "@/lib/config"
import { renderOgImage } from "@/lib/og-image"

export const dynamic = "force-static"
export const dynamicParams = false

export const generateStaticParams = () =>
  configForms.map(({ slug }) => ({ slug }))

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) => {
  const form = configForm((await params).slug)
  if (!form) return new Response(null, { status: 404 })
  return renderOgImage({
    title: form.title,
    description: form.description,
    path: `/${form.slug}`,
  })
}
