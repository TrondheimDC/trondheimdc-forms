import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { copy } from "@/copy"
import { uploadedFileSchema } from "@/lib/answers"
import type { ExtraSettings, Question } from "@/lib/forms"
import { SubmitError, upload } from "@/lib/submit"
import { cn } from "@/lib/utils"
import * as z from "@/lib/zod"
import { type FieldProps, kind, option, useField } from "./kind"

// Files go up to Nextcloud as soon as they are chosen, as in Forms itself;
// the answer then only refers to them. The field holds what has been
// uploaded so far, and whether more is on its way: no submitting until it
// is in.
const files = z.object({
  files: z.array(uploadedFileSchema),
  uploading: z.boolean(),
})

type Files = z.infer<typeof files>

// Unset is one file, as in Forms' own form; 0 is no limit.
const maxFiles = (q: Question) => q.extraSettings.maxAllowedFilesCount ?? 1

// What a file question takes, said up front: which kinds, how many, how big.
const fileHint = (s: ExtraSettings) => {
  const kinds = [
    ...(s.allowedFileTypes ?? []).map((t) => copy.form.fileKinds.get(t) ?? t),
    ...(s.allowedFileExtensions ?? []).map((e) => `.${e.replace(/^\./, "")}`),
  ]
  return (
    [
      kinds.length > 0 && copy.form.fileKindsHint({ kinds }),
      copy.form.fileLimitsHint({
        count: s.maxAllowedFilesCount ?? 1,
        size: s.maxFileSize ? fileSize(s.maxFileSize) : undefined,
      }),
    ]
      .filter(Boolean)
      .join(" ") || null
  )
}

const fileSize = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(
    Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(1024)),
    units.length - 1,
  )
  const n = bytes / 1024 ** i
  return `${Number.isInteger(n) ? n : n.toFixed(1)} ${units[i]}`
}

// What Nextcloud's mime type aliases put under its office types. Only a
// hint to the file picker: Nextcloud checks the file itself.
const OFFICE_EXTENSIONS: Record<string, string[]> = {
  "x-office/document": [
    ".doc",
    ".docx",
    ".dot",
    ".dotx",
    ".odt",
    ".ott",
    ".rtf",
  ],
  "x-office/presentation": [
    ".ppt",
    ".pptx",
    ".pps",
    ".ppsx",
    ".odp",
    ".otp",
    ".key",
  ],
  "x-office/spreadsheet": [
    ".xls",
    ".xlsx",
    ".xlsm",
    ".ods",
    ".ots",
    ".csv",
    ".numbers",
  ],
}

// The picker's accept list, or nothing (any file) when a kind is one we
// can't spell out.
const acceptFor = (s: ExtraSettings) => {
  const types = s.allowedFileTypes ?? []
  const extensions = s.allowedFileExtensions ?? []
  if (types.length === 0 && extensions.length === 0) return undefined
  const fromTypes = types.map((t) =>
    t === "image" ? ["image/*"] : OFFICE_EXTENSIONS[t],
  )
  if (fromTypes.some((list) => !list)) return undefined
  return [
    ...fromTypes.flat(),
    ...extensions.map((e) => `.${e.replace(/^\./, "")}`),
  ].join(",")
}

const uploadError = (e: Error) =>
  e instanceof SubmitError && e.status === 413
    ? copy.form.uploadTooBig
    : e instanceof SubmitError && e.message
      ? copy.form.uploadFailed({ message: e.message })
      : copy.form.uploadFailedGeneric

// Size and count are checked here first, so nobody waits for an upload
// Nextcloud will refuse.
const FilesField = ({ form, question: q, name, aria }: FieldProps) => {
  const { field, current } = useField(name, files)
  // From the field as it is by then: an upload lands after an await.
  const set = (change: (now: Files) => Partial<Files>) =>
    field.onChange({ ...current(), ...change(current()) })
  const s = q.extraSettings
  const max = maxFiles(q)
  const chosen = field.value.files
  const full = max > 0 && chosen.length >= max
  // Chosen files this site turns down before sending anything.
  const [refused, setRefused] = useState("")
  const sending = useMutation({
    mutationFn: (files: File[]) => upload(form, q.id, files),
    onMutate: () => set(() => ({ uploading: true })),
    onSuccess: (uploaded) =>
      set((current) => ({
        files: [...current.files, ...uploaded],
        uploading: false,
      })),
    onError: () => set(() => ({ uploading: false })),
  })
  const busy = sending.isPending
  const error = refused || (sending.error ? uploadError(sending.error) : "")

  const onChoose = (input: HTMLInputElement) => {
    const picked = [...(input.files ?? [])]
    // Lets the same file be chosen again after a failed try.
    input.value = ""
    if (picked.length === 0) return
    setRefused("")
    sending.reset()
    if (max > 0 && chosen.length + picked.length > max) {
      setRefused(copy.form.tooManyFiles({ count: max }))
      return
    }
    const tooBig = s.maxFileSize
      ? picked.find((f) => f.size > (s.maxFileSize ?? 0))
      : undefined
    if (tooBig && s.maxFileSize) {
      setRefused(
        copy.form.fileTooBig({
          name: tooBig.name,
          size: fileSize(s.maxFileSize),
        }),
      )
      return
    }
    sending.mutate(picked)
  }

  return (
    <div className="space-y-2">
      {chosen.length > 0 && (
        <ul className="space-y-2">
          {chosen.map((f) => (
            <li
              key={f.uploadedFileId}
              className="flex items-center gap-3 rounded-lg border border-border bg-background py-1 pl-4 pr-1"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 shrink-0 text-primary"
              >
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
              </svg>
              <span className="min-w-0 flex-1 truncate">{f.fileName}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={busy}
                aria-label={copy.form.removeFile({ name: f.fileName })}
                onClick={() =>
                  set((current) => ({
                    files: current.files.filter(
                      (g) => g.uploadedFileId !== f.uploadedFileId,
                    ),
                  }))
                }
              >
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {!full && (
        <label
          className={cn(
            option,
            "justify-center border-dashed text-muted-foreground hover:text-foreground",
            busy && "pointer-events-none",
          )}
        >
          <input
            {...aria}
            type="file"
            className="sr-only"
            multiple={max !== 1}
            accept={acceptFor(s)}
            disabled={busy}
            onChange={(e) => onChoose(e.currentTarget)}
          />
          {busy ? (
            <>
              <span className="submit-spinner" aria-hidden="true" />
              {copy.form.uploading}
            </>
          ) : (
            <>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="M12 15V4M7 9l5-5 5 5M5 20h14" />
              </svg>
              {max === 1 ? copy.form.chooseFile : copy.form.chooseFiles}
            </>
          )}
        </label>
      )}
      <p
        aria-live="polite"
        className="text-sm font-semibold text-danger empty:hidden"
      >
        {error}
      </p>
    </div>
  )
}

export const file = kind({
  // An upload that was on its way when the page went is gone.
  value: () => files.overwrite((v) => ({ ...v, uploading: false })),
  empty: () => ({ files: [], uploading: false }),
  // Forms won't take a file answer without the upload.
  answer: () =>
    files
      .refine((v) => !v.uploading, { error: copy.problem.uploading })
      .transform((v) => (v.files.length > 0 ? v.files : undefined)),
  rules: (q) => {
    const max = maxFiles(q)
    return max > 0
      ? z
          .array(uploadedFileSchema)
          .max(max, { error: copy.problem.files({ count: max }) })
      : undefined
  },
  hint: (q) => fileHint(q.extraSettings),
  Field: FilesField,
})
