import * as z from "./zod"

// The slice of a Nextcloud Forms form this site uses, read from the public
// share page in the browser (src/lib/share-page.ts). Shapes follow
// docs/DataStructure.md in nextcloud/forms, and are checked with Zod as they
// come in: a form that doesn't fit is unreadable, not half rendered.

// The question types rendered here, each in src/questions. Any other (one
// Forms adds later) sends the form to Nextcloud instead (see unsupported()).
export const SUPPORTED_TYPES = [
  "short",
  "long",
  "multiple",
  "multiple_unique",
  "dropdown",
  "linearscale",
  "date",
  "time",
  "datetime",
  "color",
  "ranking",
  "grid",
  "file",
] as const

export type QuestionType = (typeof SUPPORTED_TYPES)[number]

// What a grid holds per cell, as Constants::ANSWER_GRID_TYPE_* in Forms.
export const GRID_TYPES = ["radio", "checkbox", "number"] as const

export type GridType = (typeof GRID_TYPES)[number]

// What Nextcloud leaves out, or sends as null, is this instead.
const orElse = <T extends z.ZodType>(schema: T, fallback: z.output<T>) =>
  schema.nullish().transform((v) => v ?? fallback)

// A setting that is off, or that this site can't read, is left out: the
// browser then checks less, and Nextcloud still checks it all on submit.
const setting = <T extends z.ZodType>(schema: T) =>
  schema.optional().catch(undefined)

const extraSettingsSchema = z.object({
  allowOtherAnswer: setting(z.boolean()),
  shuffleOptions: setting(z.boolean()),
  optionsLimitMin: setting(z.number()),
  optionsLimitMax: setting(z.number()),
  validationType: setting(z.enum(["phone", "email", "regex", "number"])),
  validationRegex: setting(z.string()),
  optionsLowest: setting(z.number()),
  optionsHighest: setting(z.number()),
  optionsLabelLowest: setting(z.string()),
  optionsLabelHighest: setting(z.string()),
  // "YYYY-MM-DD" or a Unix timestamp.
  dateMin: setting(z.union([z.string(), z.number()])),
  dateMax: setting(z.union([z.string(), z.number()])),
  dateRange: setting(z.boolean()),
  timeMin: setting(z.string()),
  timeMax: setting(z.string()),
  timeRange: setting(z.boolean()),
  // Grids: what goes in a cell. Unknown sends the form to Nextcloud.
  questionType: setting(z.string()),
  // File questions. Types are MIME groups ("image", "x-office/document").
  allowedFileTypes: setting(z.array(z.string())),
  allowedFileExtensions: setting(z.array(z.string())),
  maxAllowedFilesCount: setting(z.number()),
  // Bytes.
  maxFileSize: setting(z.number()),
})

export type ExtraSettings = z.infer<typeof extraSettingsSchema>

const optionSchema = z.object({
  id: z.number(),
  text: z.string(),
  // Grids keep their rows and columns as options.
  optionType: setting(z.enum(["row", "column"])),
})

export type Option = z.infer<typeof optionSchema>

const questionSchema = z.object({
  id: z.number(),
  // Any string: an unknown type is a question this site can't render, not
  // an unreadable form.
  type: z.string(),
  text: z.string(),
  description: orElse(z.string(), ""),
  isRequired: orElse(z.boolean(), false),
  options: orElse(z.array(optionSchema), []),
  // PHP serialises an empty settings map as [].
  extraSettings: orElse(
    z.preprocess((v) => (Array.isArray(v) ? {} : v), extraSettingsSchema),
    {},
  ),
})

export type Question = z.output<typeof questionSchema>

// Form states, as Constants::FORM_STATE_* in nextcloud/forms.
export const FORM_STATE_ACTIVE = 0

// A form as Nextcloud hands it out: FormsService::getPublicForm() on a share
// page (owner, shares and access settings already removed), or getForm()
// from the API for a logged-in user. Only what this site uses is checked,
// and only that is kept: Zod drops the rest.
export const rawFormSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: orElse(z.string(), ""),
  // Shown once an answer is sent, instead of the site's own thanks.
  submissionMessage: z
    .string()
    .nullish()
    .transform((v) => v || null),
  // Unix seconds, 0 means never.
  expires: orElse(z.number(), 0),
  // Whether to say when it closes. Off, the form still closes at `expires`.
  showExpiration: orElse(z.boolean(), false),
  state: orElse(z.number(), FORM_STATE_ACTIVE),
  submitMultiple: orElse(z.boolean(), false),
  isAnonymous: orElse(z.boolean(), false),
  isMaxSubmissionsReached: orElse(z.boolean(), false),
  // Only known for a logged-in user: false once they have answered a form
  // that takes one answer per person.
  canSubmit: z
    .boolean()
    .nullish()
    .transform((v) => v ?? undefined),
  questions: orElse(z.array(questionSchema), []),
})

export type RawForm = z.output<typeof rawFormSchema>

export const fromNextcloud = (
  raw: RawForm,
  // Empty for a logged-in-only form: the submission is authorised by the
  // login instead.
  shareHash: string,
  // The same form in Nextcloud's own UI, for questions this site can't
  // render.
  nextcloudUrl: string,
) => ({
  ...raw,
  shareHash,
  // What Forms does, not what it stores: "multiple responses" is locked on
  // for a form that is anonymous or has a public link, and stays false in
  // the database (SettingsSidebarTab.vue, "If disabled, submitMultiple will
  // be casted to true"). FormsService::canSubmit() lets every answer through
  // a public link. A share hash here means the form was opened through one.
  submitMultiple: raw.submitMultiple || raw.isAnonymous || shareHash !== "",
  nextcloudUrl,
})

export type PublicForm = ReturnType<typeof fromNextcloud> & {
  // src/data/sample-form.json: submitting is simulated.
  sample?: boolean
}

export const gridType = (q: Question): GridType | null =>
  GRID_TYPES.find((t) => t === q.extraSettings.questionType) ?? null

export const gridRows = (q: Question) =>
  q.options.filter((o) => o.optionType === "row")

export const gridColumns = (q: Question) =>
  q.options.filter((o) => o.optionType === "column")

export const isSupported = (type: string): type is QuestionType =>
  SUPPORTED_TYPES.some((t) => t === type)

export const unsupported = (form: PublicForm) =>
  form.questions.filter(
    (q) => !isSupported(q.type) || (q.type === "grid" && gridType(q) === null),
  )

export const isOpen = (
  form: Pick<PublicForm, "state" | "expires" | "isMaxSubmissionsReached">,
  nowSeconds: number,
) =>
  form.state === FORM_STATE_ACTIVE &&
  !form.isMaxSubmissionsReached &&
  (form.expires === 0 || form.expires > nowSeconds)
