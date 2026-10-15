import type { RawPublicForm } from "./forms"

// Nextcloud Forms has no API to read a form by its hash, and none at all to
// read one anonymously; only to submit.
// What it does have is the public share page, /apps/forms/s/{hash}, which
// carries the form for its own Vue app as initial state: Nextcloud core
// writes every value as
//   <input type="hidden" id="initial-state-{app}-{key}" value="{base64 JSON}">
// (core/templates/layout.initial-state.php). Forms puts the form under `form`
// (PageController::createPublicSubmitView), or, when there is nothing to
// show, `renderAs` = "expired" | "notfound" (provideEmptyContent).
//
// This is Nextcloud's page bootstrap, not its documented API. If a Forms
// upgrade breaks the site, this file and its test are where to look.

export type SharePage =
  | { kind: "form"; form: RawPublicForm }
  | { kind: "expired" }
  | { kind: "notfound" }
  | { kind: "unreadable" }

export const shareHashPattern = /^[a-zA-Z0-9]{1,256}$/
// A form's own hash (Constants::FORM_HASH_LENGTH is 16 in Forms).
export const formHashPattern = /^[a-zA-Z0-9]{16,}$/

const readInitialState = (html: string) => {
  const states = new Map<string, unknown>()
  for (const [, key, value] of html.matchAll(
    /id="initial-state-forms-([A-Za-z]+)"\s+value="([A-Za-z0-9+/=]*)"/g,
  )) {
    if (!key || value === undefined) continue
    try {
      states.set(key, JSON.parse(decodeBase64(value)))
    } catch {
      // Leave it out; the callers decide what a missing value means.
    }
  }
  return states
}

export const parseSharePage = (html: string): SharePage => {
  const states = readInitialState(html)

  const form = states.get("form") as RawPublicForm | undefined
  if (form && typeof form.id === "number" && Array.isArray(form.questions)) {
    return { kind: "form", form }
  }
  const renderAs = states.get("renderAs")
  if (renderAs === "expired") return { kind: "expired" }
  if (renderAs === "notfound") return { kind: "notfound" }
  return { kind: "unreadable" }
}

// The logged-in Forms app at /apps/forms/{hash} (PageController::index)
// only carries the form's id, or "invalid" for an unknown hash. The form
// itself then comes from the API.
export type FormIdPage =
  | { kind: "id"; id: number }
  | { kind: "notfound" }
  | { kind: "unreadable" }

export const parseFormIdPage = (html: string): FormIdPage => {
  const id = readInitialState(html).get("formId")
  if (typeof id === "number") return { kind: "id", id }
  if (id === "invalid") return { kind: "notfound" }
  return { kind: "unreadable" }
}

// atob() gives bytes as a binary string; the JSON inside is UTF-8.
const decodeBase64 = (value: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0)))
