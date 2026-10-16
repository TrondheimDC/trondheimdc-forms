import { type Answer, type UploadedFile, uploadedFileSchema } from "./answers"
import type { PublicForm } from "./forms"
import { ocs, ocsErrorSchema } from "./ocs"
import { ncFetch } from "./session"
import * as z from "./zod"

export class SubmitError extends Error {
  constructor(
    // Nextcloud's own reason, e.g. 'Question "…" is required.' Empty when
    // the request never got a proper OCS answer.
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

// Same origin on purpose: nginx (and next.config.ts in dev) pass this path through
// to Nextcloud. ncFetch sends it as the logged-in user when there is one,
// refreshing the token first if it ran out while the form was filled in.
export const submissionUrl = (formId: number) =>
  `/ocs/v2.php/apps/forms/api/v3/forms/${formId}/submissions`

// File questions upload as soon as a file is chosen, into the form owner's
// Nextcloud; the submission then refers to the upload. Nextcloud clears out
// uploads that never get submitted.
export const uploadUrl = (formId: number, questionId: number) =>
  `${submissionUrl(formId)}/files/${questionId}`

export const submit = async (
  form: PublicForm,
  answers: Record<string, Answer>,
) => {
  if (form.sample) {
    console.info("Sample form, not sent:", { formId: form.id, answers })
    await new Promise((resolve) => setTimeout(resolve, 600))
    return
  }

  await send(submissionUrl(form.id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Without a share hash (logged-in-only forms) the login is the
    // permission.
    body: JSON.stringify({ answers, shareHash: form.shareHash }),
  })
}

export const upload = async (
  form: PublicForm,
  questionId: number,
  files: File[],
): Promise<UploadedFile[]> => {
  if (form.sample) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return files.map((file, i) => ({
      uploadedFileId: Date.now() + i,
      fileName: file.name,
      uploadToken: "sample",
    }))
  }

  const body = new FormData()
  for (const file of files) body.append("files[]", file)
  body.append("shareHash", form.shareHash)
  // No Content-Type: the browser sets it, with the multipart boundary.
  const res = await send(uploadUrl(form.id, questionId), {
    method: "POST",
    body,
  })
  const uploaded = uploadedSchema.safeParse(await res.json().catch(() => null))
  if (!uploaded.success) throw new SubmitError("", res.status)
  return uploaded.data.ocs.data
}

const uploadedSchema = ocs(z.array(uploadedFileSchema))

const send = async (url: string, init: RequestInit) => {
  let res: Response
  try {
    res = await ncFetch(url, init)
  } catch {
    throw new SubmitError("", 0)
  }
  if (res.ok) return res

  // Not OCS JSON, e.g. a proxy error page, leaves the message empty.
  const body = ocsErrorSchema.safeParse(await res.json().catch(() => null))
  const { meta, data } = body.success ? body.data.ocs : {}
  throw new SubmitError(
    meta?.message || (typeof data === "string" ? data : ""),
    res.status,
  )
}
