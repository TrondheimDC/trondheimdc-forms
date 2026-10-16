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
// ("/^[a-z]+$/i"). Translated only where JS reads it the same, and the rest
// left to the server: a check here that PHP doesn't make would turn down
// answers Nextcloud takes.
export const phpRegex = (
  pattern: string | undefined,
): { test: (value: string) => boolean } | null => {
  if (!pattern) return null
  const match = /^(.)([\s\S]*)\1([a-zA-Z]*)$/.exec(pattern)
  if (!match) return null
  const [, , body = "", flags = ""] = match
  // i, m and s mean the same in both. D only changes what $ does before a
  // final newline, and u how letters beyond ASCII are read, which is left
  // to the server (below).
  if (![...flags].every((f) => "imsuD".includes(f)) || !sameInJs(body))
    return null
  let re: RegExp
  try {
    re = new RegExp(body, [...flags].filter((f) => "ims".includes(f)).join(""))
  } catch {
    return null
  }
  // Beyond ASCII PHP reads bytes, or with u Unicode classes (\w takes æ),
  // where JS reads neither: only the server can tell.
  return { test: (value) => /[\u0080-\uffff]/.test(value) || re.test(value) }
}

// Escapes JS reads as PCRE does. Any other letter is something else to PCRE
// (\A, \z, \h, \v, \p{L}, \Q…\E) and a plain letter to JS.
const JS_ESCAPES = "dDwWsSbBnrtfc"

// Whether the pattern is free of PCRE syntax that JS reads differently or
// not at all: escapes as above, \x other than two hex digits, (? groups
// other than (?: (?= (?! (?<= (?<! and (?<name>, POSIX classes
// ([:alpha:]), a class that starts with ] (a ] to PCRE) and {,n} (up to n
// in newer PCRE, plain text in JS). Possessive
// quantifiers (a++) are a syntax error in JS, so new RegExp turns them down.
const sameInJs = (body: string) => {
  for (let i = 0; i < body.length; i++) {
    const rest = body.slice(i + 1)
    if (body[i] === "\\") {
      const next = rest[0] ?? ""
      if (
        next === "x"
          ? !/^x[0-9a-fA-F]{2}/.test(rest)
          : /[a-zA-Z]/.test(next) && !JS_ESCAPES.includes(next)
      )
        return false
      i++
    } else if (body[i] === "(" && rest.startsWith("?")) {
      if (!/^\?(:|=|!|<=|<!|<[A-Za-z_]\w*>)/.test(rest)) return false
    } else if (
      (body[i] === "[" && /^\^?\]/.test(rest)) ||
      (body[i] === "{" && rest.startsWith(","))
    ) {
      return false
    }
  }
  return !/\[:\^?[a-z]+:\]/.test(body)
}
