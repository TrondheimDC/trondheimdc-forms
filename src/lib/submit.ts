import type { PublicForm } from "./forms"
import { ncFetch } from "./session"

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

export const submit = async (
  form: PublicForm,
  answers: Record<string, (string | number)[]>,
) => {
  if (form.sample) {
    console.info("Sample form, not sent:", { formId: form.id, answers })
    await new Promise((resolve) => setTimeout(resolve, 600))
    return
  }

  let res: Response
  try {
    res = await ncFetch(submissionUrl(form.id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Without a share hash (logged-in-only forms) the login is the
      // permission.
      body: JSON.stringify({ answers, shareHash: form.shareHash }),
    })
  } catch {
    throw new SubmitError("", 0)
  }
  if (res.ok) return

  let message = ""
  try {
    const body = (await res.json()) as {
      ocs?: { meta?: { message?: string }; data?: unknown }
    }
    message =
      body.ocs?.meta?.message ||
      (typeof body.ocs?.data === "string" ? body.ocs.data : "")
  } catch {
    // Not OCS JSON, e.g. a proxy error page.
  }
  throw new SubmitError(message, res.status)
}
