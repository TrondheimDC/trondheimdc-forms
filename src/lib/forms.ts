// The slice of a Nextcloud Forms form this site uses, read from the public
// share page in the browser (src/lib/share-page.ts). Shapes follow
// docs/DataStructure.md in nextcloud/forms.

export type QuestionType =
  | "short"
  | "long"
  | "multiple"
  | "multiple_unique"
  | "dropdown"
  | "linearscale"
  | "date"
  | "time"
  | "color"
  | "ranking"
  // Not rendered here: the form links to Nextcloud instead (see unsupported()).
  | "file"
  | "grid"
  | "datetime"

export const SUPPORTED_TYPES: readonly QuestionType[] = [
  "short",
  "long",
  "multiple",
  "multiple_unique",
  "dropdown",
  "linearscale",
  "date",
  "time",
  "color",
  "ranking",
]

export type Option = {
  id: number
  text: string
}

export type ExtraSettings = {
  allowOtherAnswer?: boolean
  shuffleOptions?: boolean
  optionsLimitMin?: number
  optionsLimitMax?: number
  validationType?: "phone" | "email" | "regex" | "number" | null
  validationRegex?: string
  optionsLowest?: number
  optionsHighest?: number
  optionsLabelLowest?: string
  optionsLabelHighest?: string
  dateMin?: string | number
  dateMax?: string | number
  dateRange?: boolean
  timeMin?: string
  timeMax?: string
  timeRange?: boolean
}

export type Question = {
  id: number
  type: QuestionType
  text: string
  description: string
  isRequired: boolean
  options: Option[]
  extraSettings: ExtraSettings
}

// Form states, as Constants::FORM_STATE_* in nextcloud/forms.
export const FORM_STATE_ACTIVE = 0

export type PublicForm = {
  id: number
  shareHash: string
  title: string
  description: string
  submissionMessage: string | null
  // Unix seconds, 0 means never.
  expires: number
  state: number
  submitMultiple: boolean
  isAnonymous: boolean
  isMaxSubmissionsReached: boolean
  // Only known for a logged-in user: false once they have answered a form
  // that takes one answer per person.
  canSubmit?: boolean
  questions: Question[]
  // The same form in Nextcloud's own UI, for questions this site can't render.
  nextcloudUrl: string
  // src/data/sample-form.json: submitting is simulated.
  sample?: boolean
}

// A form as Nextcloud hands it out: FormsService::getPublicForm() on a share
// page (owner, shares and access settings already removed), or getForm()
// from the API for a logged-in user. Only what fromNextcloud() reads is
// typed, and only that is kept.
export type RawPublicForm = {
  id: number
  title: string
  description?: string
  submissionMessage?: string | null
  expires?: number
  state?: number
  submitMultiple?: boolean
  isAnonymous?: boolean
  isMaxSubmissionsReached?: boolean
  canSubmit?: boolean
  questions?: {
    id: number
    type: QuestionType
    text: string
    description?: string
    isRequired?: boolean
    options?: { id: number; text: string }[]
    extraSettings?: ExtraSettings | []
  }[]
}

export const fromNextcloud = (
  raw: RawPublicForm,
  // Empty for a logged-in-only form: the submission is authorised by the
  // login instead.
  shareHash: string,
  nextcloudUrl: string,
): PublicForm => ({
  id: raw.id,
  shareHash,
  title: raw.title,
  description: raw.description ?? "",
  submissionMessage: raw.submissionMessage || null,
  expires: raw.expires ?? 0,
  state: raw.state ?? FORM_STATE_ACTIVE,
  // What Forms does, not what it stores: "multiple responses" is locked on
  // for a form that is anonymous or has a public link, and stays false in
  // the database (SettingsSidebarTab.vue, "If disabled, submitMultiple will
  // be casted to true"). FormsService::canSubmit() lets every answer through
  // a public link. A share hash here means the form was opened through one.
  submitMultiple:
    (raw.submitMultiple ?? false) ||
    (raw.isAnonymous ?? false) ||
    shareHash !== "",
  isAnonymous: raw.isAnonymous ?? false,
  isMaxSubmissionsReached: raw.isMaxSubmissionsReached ?? false,
  canSubmit: raw.canSubmit,
  questions: (raw.questions ?? []).map((q) => ({
    id: q.id,
    type: q.type,
    text: q.text,
    description: q.description ?? "",
    isRequired: q.isRequired ?? false,
    options: (q.options ?? []).map(({ id, text }) => ({ id, text })),
    // PHP serialises an empty settings map as [].
    extraSettings: Array.isArray(q.extraSettings)
      ? {}
      : (q.extraSettings ?? {}),
  })),
  nextcloudUrl,
})

export const unsupported = (form: PublicForm) =>
  form.questions.filter((q) => !SUPPORTED_TYPES.includes(q.type))

export const isOpen = (
  form: Pick<PublicForm, "state" | "expires" | "isMaxSubmissionsReached">,
  nowSeconds: number,
) =>
  form.state === FORM_STATE_ACTIVE &&
  !form.isMaxSubmissionsReached &&
  (form.expires === 0 || form.expires > nowSeconds)
