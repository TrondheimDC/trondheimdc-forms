import { isOpen } from "./forms"
import { ocs } from "./ocs"
import { ncFetch } from "./session"
import * as z from "./zod"

// What /admin shows: the forms the logged-in user owns or has been given,
// which is all the Forms API will list (there is no instance-wide list,
// not even for admins).

const API = "/ocs/v2.php/apps/forms/api/v3/forms"
// IShare::TYPE_LINK
const SHARE_TYPE_LINK = 3

// One form in GET /forms: the partial form, as FormsService::getPartialForm().
const partialFormSchema = z.object({
  id: z.number(),
  hash: z.string(),
  title: z.string(),
  expires: z.number(),
  state: z.number(),
  submissionCount: z.number().optional(),
})

type PartialForm = z.infer<typeof partialFormSchema>

const toAdmin = (f: PartialForm, owned: boolean, now: number) => ({
  id: f.id,
  hash: f.hash,
  title: f.title,
  open: isOpen({ ...f, isMaxSubmissionsReached: false }, now),
  owned,
  submissionCount: f.submissionCount,
})

export type AdminForm = ReturnType<typeof toAdmin> & {
  // Filled in by shareHash(): the public share hash, or null when the form
  // has no public link and is for logged-in users only.
  publicHash?: string | null
}

const listSchema = ocs(z.array(partialFormSchema))

const sharesSchema = ocs(
  z.object({
    shares: z
      .array(z.object({ shareType: z.number(), shareWith: z.string() }))
      .nullish(),
  }),
)

const list = async (type: "owned" | "shared") => {
  const res = await ncFetch(`${API}?type=${type}`)
  if (res.status === 401 || res.type === "opaqueredirect") {
    throw new LoginRequired()
  }
  if (!res.ok) throw new Error(`Forms: ${res.status}`)
  return listSchema.parse(await res.json()).ocs.data
}

export class LoginRequired extends Error {}

export const loadAdminForms = async (): Promise<AdminForm[]> => {
  const [owned, shared] = await Promise.all([list("owned"), list("shared")])
  const now = Date.now() / 1000
  return [
    ...owned.map((f) => toAdmin(f, true, now)),
    ...shared
      .filter((f) => !owned.some((o) => o.id === f.id))
      .map((f) => toAdmin(f, false, now)),
  ]
}

// One request per form, so a few at a time: a long list shouldn't flood
// Nextcloud. A finished request hands its slot straight to the next.
const MAX_AT_ONCE = 4
let running = 0
const waiting: (() => void)[] = []
const fewAtATime = async <T>(task: () => Promise<T>): Promise<T> => {
  if (running < MAX_AT_ONCE) running++
  else await new Promise<void>((resolve) => waiting.push(resolve))
  try {
    return await task()
  } finally {
    const next = waiting.shift()
    if (next) next()
    else running--
  }
}

// The list doesn't say whether a form has a public link; the form itself
// does, in its shares.
export const shareHash = (id: number): Promise<string | null> =>
  fewAtATime(() => readShareHash(id))

const readShareHash = async (id: number) => {
  const res = await ncFetch(`${API}/${id}`)
  if (!res.ok) return null
  const body = sharesSchema.safeParse(await res.json())
  if (!body.success) return null
  return (
    body.data.ocs.data.shares?.find((s) => s.shareType === SHARE_TYPE_LINK)
      ?.shareWith ?? null
  )
}

// The link to share: public when the form has a public link (anyone can
// answer), else the form's own hash (log in first).
export const linkFor = (form: AdminForm) =>
  `${window.location.origin}/s/${form.publicHash ?? form.hash}`
