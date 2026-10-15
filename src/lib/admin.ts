import { isOpen } from "./forms"
import { ncFetch } from "./session"

// What /admin shows: the forms the logged-in user owns or has been given,
// which is all the Forms API will list (there is no instance-wide list,
// not even for admins).

const API = "/ocs/v2.php/apps/forms/api/v3/forms"
// IShare::TYPE_LINK
const SHARE_TYPE_LINK = 3

export type AdminForm = {
  id: number
  hash: string
  title: string
  open: boolean
  owned: boolean
  submissionCount?: number
  // Filled in by shareHash(): the public share hash, or null when the form
  // has no public link and is for logged-in users only.
  publicHash?: string | null
}

type Partial = {
  id: number
  hash: string
  title: string
  expires: number
  state: number
  submissionCount?: number
}

const list = async (type: "owned" | "shared") => {
  const res = await ncFetch(`${API}?type=${type}`)
  if (res.status === 401 || res.type === "opaqueredirect") {
    throw new Error("login")
  }
  if (!res.ok) throw new Error(`Forms: ${res.status}`)
  const body = (await res.json()) as { ocs: { data: Partial[] } }
  return body.ocs.data
}

export const loadAdminForms = async (): Promise<AdminForm[]> => {
  const [owned, shared] = await Promise.all([list("owned"), list("shared")])
  const now = Date.now() / 1000
  const toAdmin = (f: Partial, isOwned: boolean): AdminForm => ({
    id: f.id,
    hash: f.hash,
    title: f.title,
    open: isOpen({ ...f, isMaxSubmissionsReached: false }, now),
    owned: isOwned,
    submissionCount: f.submissionCount,
  })
  return [
    ...owned.map((f) => toAdmin(f, true)),
    ...shared
      .filter((f) => !owned.some((o) => o.id === f.id))
      .map((f) => toAdmin(f, false)),
  ]
}

// The list doesn't say whether a form has a public link; the form itself
// does, in its shares.
export const shareHash = async (id: number): Promise<string | null> => {
  const res = await ncFetch(`${API}/${id}`)
  if (!res.ok) return null
  const body = (await res.json()) as {
    ocs: { data: { shares?: { shareType: number; shareWith: string }[] } }
  }
  return (
    body.ocs.data.shares?.find((s) => s.shareType === SHARE_TYPE_LINK)
      ?.shareWith ?? null
  )
}

// The link to share: public when the form has a public link (anyone can
// answer), else the form's own hash (log in first).
export const linkFor = (form: AdminForm) =>
  `${window.location.origin}/s/${form.publicHash ?? form.hash}`
