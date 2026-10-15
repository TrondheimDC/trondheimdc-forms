import sample from "../data/sample-form.json"
import { NEXTCLOUD_URL as NEXTCLOUD } from "./config"
import { fromNextcloud, type PublicForm, type RawPublicForm } from "./forms"
import { isLoggedIn, ncFetch, OCS_HEADERS } from "./session"
import {
  formHashPattern,
  parseFormIdPage,
  parseSharePage,
  shareHashPattern,
} from "./share-page"

export const SAMPLE_HASH = "sample"

export type Loaded =
  | { kind: "form"; form: PublicForm }
  | { kind: "expired" }
  | { kind: "notfound" }
  // A logged-in-only form, and nobody is logged in.
  | { kind: "login" }
  // Logged in, but this user may not answer it.
  | { kind: "forbidden" }
  | { kind: "failed" }

// /s/{hash} takes either kind of Nextcloud link: a public share hash
// (/apps/forms/s/{hash}) or a form's own hash (/apps/forms/{hash}), which
// only works for logged-in users. Public first, since it needs no login.
// Fetched on every visit, so an edit in Nextcloud shows up on the next load.
// All paths are same-origin; nginx (or next.config.mjs in dev) forwards them.
// The share page is always read anonymously (nginx drops any login there).
export const loadForm = async (hash: string): Promise<Loaded> => {
  if (hash === SAMPLE_HASH) {
    return {
      kind: "form",
      form: {
        // JSON imports widen "short" to string.
        ...fromNextcloud(sample as RawPublicForm, SAMPLE_HASH, NEXTCLOUD),
        sample: true,
      },
    }
  }
  if (!shareHashPattern.test(hash)) return { kind: "notfound" }

  try {
    const shared = await loadShared(hash)
    if (shared.kind !== "notfound" || !formHashPattern.test(hash)) return shared
    return await loadForUser(hash)
  } catch {
    return { kind: "failed" }
  }
}

const loadShared = async (shareHash: string): Promise<Loaded> => {
  const res = await fetch(`/apps/forms/s/${shareHash}`, {
    headers: OCS_HEADERS,
    cache: "no-store",
  })
  if (res.status === 404) return { kind: "notfound" }
  if (!res.ok) return { kind: "failed" }

  const page = parseSharePage(await res.text())
  switch (page.kind) {
    case "form":
      return {
        kind: "form",
        form: fromNextcloud(
          page.form,
          shareHash,
          `${NEXTCLOUD}/apps/forms/s/${shareHash}`,
        ),
      }
    case "unreadable":
      console.error(
        "Could not read the form from Nextcloud's share page. See src/lib/share-page.ts.",
      )
      return { kind: "failed" }
    default:
      return page
  }
}

const loadForUser = async (formHash: string): Promise<Loaded> => {
  if (!isLoggedIn()) return { kind: "login" }

  // The hash only maps to an id on the Forms app page; the API wants the id.
  const pageRes = await ncFetch(`/apps/forms/${formHash}`)
  if (pageRes.type === "opaqueredirect" || pageRes.status === 401) {
    return { kind: "login" }
  }
  if (!pageRes.ok) return { kind: "failed" }
  const page = parseFormIdPage(await pageRes.text())
  if (page.kind === "notfound") return { kind: "notfound" }
  if (page.kind === "unreadable") {
    console.error(
      "Could not read the form id from Nextcloud's Forms page. See src/lib/share-page.ts.",
    )
    return { kind: "failed" }
  }

  const res = await ncFetch(`/ocs/v2.php/apps/forms/api/v3/forms/${page.id}`)
  if (res.status === 401) return { kind: "login" }
  if (res.status === 403 || res.status === 404) return { kind: "forbidden" }
  if (!res.ok) return { kind: "failed" }
  const body = (await res.json()) as { ocs: { data: RawPublicForm } }
  return {
    kind: "form",
    form: fromNextcloud(
      body.ocs.data,
      "",
      `${NEXTCLOUD}/apps/forms/${formHash}`,
    ),
  }
}
