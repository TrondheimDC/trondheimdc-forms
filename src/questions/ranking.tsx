import { Reorder, useDragControls } from "motion/react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { copy } from "@/copy"
import type { Option } from "@/lib/forms"
import * as z from "@/lib/zod"
import { type FieldProps, kind, useField, useShuffled } from "./kind"

// Forms wants every option exactly once, in ranked order. The field holds
// the option ids in that order, empty until it is touched, so a default
// order is never sent by accident. Drag by the handle, or use the arrows
// (and the keyboard); either way the rows slide into place.
const order = z.array(z.number())

const RankingField = ({ question: q, name }: FieldProps) => {
  const { field } = useField(name, order)
  const shuffled = useShuffled(q.options, q.extraSettings.shuffleOptions)
  const chosen = field.value.length > 0 ? field.value : undefined
  const byId = new Map(q.options.map((o) => [o.id, o]))
  const items = chosen
    ? chosen.map((id) => byId.get(id)).filter((o): o is Option => !!o)
    : shuffled
  const ids = items.map((o) => o.id)
  const [announcement, setAnnouncement] = useState("")

  const move = (index: number, by: -1 | 1) => {
    const item = items[index]
    const other = items[index + by]
    if (!item || !other) return
    field.onChange(ids.with(index, other.id).with(index + by, item.id))
    setAnnouncement(
      copy.form.moved({ item: item.text, position: index + by + 1 }),
    )
  }

  return (
    <div className="space-y-3">
      <Reorder.Group
        as="ol"
        axis="y"
        values={ids}
        onReorder={field.onChange}
        className="space-y-2"
      >
        {items.map((o, i) => (
          <RankItem
            key={o.id}
            id={o.id}
            text={o.text}
            position={i}
            count={items.length}
            onMove={(by) => move(i, by)}
          />
        ))}
      </Reorder.Group>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {chosen ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 text-primary"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          {copy.form.orderChosen}
        </p>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => field.onChange(ids)}
        >
          {copy.form.keepOrder}
        </Button>
      )}
    </div>
  )
}

const RankItem = ({
  id,
  text,
  position,
  count,
  onMove,
}: {
  id: number
  text: string
  position: number
  count: number
  onMove: (by: -1 | 1) => void
}) => {
  const controls = useDragControls()
  const up = useRef<HTMLButtonElement>(null)
  const down = useRef<HTMLButtonElement>(null)

  return (
    <Reorder.Item
      as="li"
      value={id}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, boxShadow: "var(--shadow-lg)", zIndex: 1 }}
      className="relative flex items-center gap-2 rounded-lg border border-border bg-background py-1 pl-1 pr-1"
    >
      {/* Pointer only: keyboards and screen readers use the arrows. */}
      <span
        aria-hidden="true"
        onPointerDown={(e) => controls.start(e)}
        className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground active:cursor-grabbing"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-4"
        >
          {[6, 12, 18].map((y) =>
            [9, 15].map((x) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />
            )),
          )}
        </svg>
      </span>
      <span className="w-5 font-mono text-sm tabular-nums text-muted-foreground">
        {position + 1}
      </span>
      <span className="flex-1 select-none">{text}</span>
      <Button
        ref={up}
        type="button"
        variant="ghost"
        size="icon"
        disabled={position === 0}
        onClick={() => {
          onMove(-1)
          // The row moves with focus still on this button; at the top it is
          // disabled, so hand focus to its partner.
          if (position === 1) down.current?.focus()
        }}
        aria-label={copy.form.moveUp({ item: text })}
      >
        <Arrow up />
      </Button>
      <Button
        ref={down}
        type="button"
        variant="ghost"
        size="icon"
        disabled={position === count - 1}
        onClick={() => {
          onMove(1)
          if (position === count - 2) up.current?.focus()
        }}
        aria-label={copy.form.moveDown({ item: text })}
      >
        <Arrow />
      </Button>
    </Reorder.Item>
  )
}

const Arrow = ({ up }: { up?: boolean }) => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={up ? "rotate-180" : undefined}
  >
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </svg>
)

export const ranking = kind({
  value: () => order,
  empty: () => [],
  answer: () => order.transform((ids) => (ids.length > 0 ? ids : undefined)),
  hint: () => copy.form.rankHint,
  Field: RankingField,
})
