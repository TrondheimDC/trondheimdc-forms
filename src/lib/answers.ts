import * as z from "./zod"

// What Nextcloud Forms takes as answers, in POST …/submissions: question id
// to an array of values, even for a single text answer, or to a grid's rows.
// Each question type in src/questions turns its field into one of these.

// What Nextcloud answers an upload with, and wants back in the submission.
// The token proves the upload was this visitor's.
export const uploadedFileSchema = z.object({
  uploadedFileId: z.number(),
  fileName: z.string(),
  uploadToken: z.string(),
})

export type UploadedFile = z.infer<typeof uploadedFileSchema>

// A grid's answer: row id to the chosen column (radio), the ticked columns
// (checkbox), or column to number (number grid). Only rows with something
// in them.
export const gridAnswerSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string()), z.record(z.string(), z.string())]),
)

export type GridAnswer = z.infer<typeof gridAnswerSchema>

export type Answer = (string | number)[] | UploadedFile[] | GridAnswer

// Constants::QUESTION_EXTRASETTINGS_OTHER_PREFIX in nextcloud/forms.
export const OTHER_PREFIX = "system-other-answer:"

// PHP's is_numeric(): optional sign, decimal or exponent, surrounding
// whitespace allowed. No hex, no empty string.
export const isNumeric = (value: string) =>
  /^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\s*$/.test(value)

// Forms stores the pattern PHP-style, delimiters and flags included
// ("/^[a-z]+$/i"). Translate what JS can express and skip the rest, leaving
// the check to the server.
export const phpRegex = (pattern: string | undefined): RegExp | null => {
  if (!pattern) return null
  const match = /^(.)([\s\S]*)\1([a-zA-Z]*)$/.exec(pattern)
  if (!match) return null
  const [, , body = "", flags = ""] = match
  const jsFlags = [...flags].filter((f) => "ims".includes(f)).join("")
  try {
    return new RegExp(body, jsFlags)
  } catch {
    return null
  }
}
