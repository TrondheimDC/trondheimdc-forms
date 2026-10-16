import { Check, Input } from "@/components/ui/field"
import { copy } from "@/copy"
import { type GridAnswer, gridAnswerSchema, isNumeric } from "@/lib/answers"
import {
  gridColumns,
  gridRows,
  gridType,
  type Option,
  type Question,
} from "@/lib/forms"
import * as z from "@/lib/zod"
import { type FieldProps, kind, useField } from "./kind"

// Rows down the side, columns across the top: one radio group per row, a
// checkbox per cell, or a number per cell. The field holds the cells by
// `${rowId}:${columnId}`: "1" for a ticked radio or checkbox, the number as
// written in a number grid.
const cells = z.record(z.string(), z.string())

type Cells = z.infer<typeof cells>

const cellKey = (row: number, column: number) => `${row}:${column}`

// Forms' answer has only the rows with something in them.
const toAnswer = (q: Question, cells: Cells) => {
  const type = gridType(q)
  const columns = gridColumns(q)
  const answer: GridAnswer = {}
  for (const row of gridRows(q)) {
    const value = (c: Option) => (cells[cellKey(row.id, c.id)] ?? "").trim()
    const filled = columns.filter((c) => value(c) !== "")
    if (filled.length === 0) continue
    const id = String(row.id)
    if (type === "radio") answer[id] = String(filled[0]?.id)
    else if (type === "checkbox") answer[id] = filled.map((c) => String(c.id))
    else
      answer[id] = Object.fromEntries(
        filled.map((c) => [String(c.id), value(c)]),
      )
  }
  return Object.keys(answer).length > 0 ? answer : undefined
}

const allCells = (answer: GridAnswer) =>
  Object.values(answer).flatMap((row) =>
    typeof row === "string"
      ? [row]
      : Array.isArray(row)
        ? row
        : Object.values(row),
  )

// Wide grids scroll sideways, with the row names staying put.
const GridField = ({ question: q, name, aria }: FieldProps) => {
  const { field } = useField(name, cells)
  const type = gridType(q)
  const columns = gridColumns(q)
  const invalid = aria["aria-invalid"]
  const describedBy = aria["aria-describedby"]

  const set = (row: Option, column: Option, value: string) => {
    const next = { ...field.value }
    if (type === "radio")
      for (const c of columns) delete next[cellKey(row.id, c.id)]
    if (value) next[cellKey(row.id, column.id)] = value
    else delete next[cellKey(row.id, column.id)]
    field.onChange(next)
  }

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <td className="sticky left-0 bg-card" />
            {columns.map((c) => (
              <th
                key={c.id}
                scope="col"
                className="min-w-16 px-2 pb-2 align-bottom text-sm font-semibold text-muted-foreground"
              >
                {c.text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gridRows(q).map((r) => (
            <tr key={r.id} className="[&>*]:border-t [&>*]:border-border">
              <th
                scope="row"
                className="sticky left-0 bg-card py-2 pr-3 text-left font-normal"
              >
                {r.text}
              </th>
              {columns.map((c) => {
                const value = field.value[cellKey(r.id, c.id)] ?? ""
                const label = copy.form.cell({ row: r.text, column: c.text })
                return (
                  <td key={c.id} className="px-1 py-1 text-center">
                    {type === "number" ? (
                      <Input
                        inputMode="decimal"
                        enterKeyHint="next"
                        aria-label={label}
                        aria-describedby={describedBy}
                        aria-invalid={invalid}
                        className="h-9 min-w-16 px-2 text-center tabular-nums"
                        value={value}
                        onChange={(e) => set(r, c, e.target.value)}
                      />
                    ) : (
                      <label className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-background has-focus-visible:ring-[3px] has-focus-visible:ring-ring/40">
                        <Check
                          type={type === "radio" ? "radio" : "checkbox"}
                          name={`${name}-${r.id}`}
                          aria-label={label}
                          aria-describedby={describedBy}
                          aria-invalid={invalid}
                          checked={value !== ""}
                          onChange={(e) =>
                            set(r, c, e.target.checked ? "1" : "")
                          }
                        />
                      </label>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const grid = kind({
  value: () => cells,
  empty: () => ({}),
  answer: (q) => cells.transform((c) => toAnswer(q, c)),
  // Forms counts a grid as answered when any cell has something in it, a
  // zero included: the answer only has those, so required is as for the
  // rest, in index.ts.
  rules: (q) =>
    gridType(q) === "number"
      ? gridAnswerSchema.refine((a) => allCells(a).every(isNumeric), {
          error: copy.problem.number,
        })
      : undefined,
  Field: GridField,
})
