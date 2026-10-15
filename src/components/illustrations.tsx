import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// Drawings for the status screens, in the manner of checkin's printer
// scenes: one form sheet, with an accent that lands on it after the sheet
// rises in (.status-stamp / .status-pop in globals.css). Paper and ink are
// fixed so the sheet reads the same in both themes; accents use the theme's
// brand colour, green on dark and red on light, like the wordmark.

const ink = "#0f0f0f"
const paper = "#fefefe"
const fold = "#d9d9d9"
const brand = "var(--color-fg-brand)"
const danger = "var(--color-bg-danger)"

type ArtProps = { className?: string }

const Scene = ({
  label,
  className,
  children,
}: ArtProps & { label: string; children: ReactNode }) => (
  <svg
    viewBox="0 0 320 240"
    className={cn("h-auto w-full font-sans", className)}
    role="img"
    aria-label={label}
  >
    {children}
  </svg>
)

// A form: title bar and three rows of checkbox + answer line. `checked`
// fills the boxes from the top.
const Sheet = ({
  checked = 0,
  tilt = 0,
  children,
}: {
  checked?: number
  tilt?: number
  children?: ReactNode
}) => (
  <g transform={`rotate(${tilt} 160 118)`}>
    <rect
      x="98"
      y="26"
      width="124"
      height="176"
      rx="12"
      fill="#000"
      opacity="0.18"
      transform="translate(4 6)"
    />
    <rect
      x="98"
      y="26"
      width="124"
      height="176"
      rx="12"
      fill={paper}
      stroke={fold}
    />
    <rect
      x="114"
      y="44"
      width="62"
      height="9"
      rx="4.5"
      fill={ink}
      opacity="0.85"
    />
    <rect
      x="114"
      y="59"
      width="40"
      height="5"
      rx="2.5"
      fill={ink}
      opacity="0.3"
    />
    {[84, 116, 148].map((y, i) => (
      <g key={y}>
        <rect
          x="114"
          y={y}
          width="16"
          height="16"
          rx="4"
          fill={i < checked ? brand : paper}
          stroke={i < checked ? brand : ink}
          strokeOpacity={i < checked ? 1 : 0.45}
          strokeWidth="2"
        />
        {i < checked && (
          <path
            d={`M118 ${y + 8.5}l3 3 6-6.5`}
            fill="none"
            stroke={ink}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        <rect
          x="138"
          y={y + 5}
          width={[64, 50, 58][i]}
          height="6"
          rx="3"
          fill={ink}
          opacity="0.28"
        />
      </g>
    ))}
    <rect
      x="114"
      y="178"
      width="38"
      height="12"
      rx="6"
      fill={ink}
      opacity="0.85"
    />
    {children}
  </g>
)

/** Not found: a 404 stamped across the form. */
export const NotFoundIllustration = ({ className }: ArtProps) => (
  <Scene label="Et skjema stemplet 404" className={className}>
    <Sheet />
    {/* The tilt sits on its own group: the entrance animation is a CSS
        transform, which would replace an SVG transform on the same element. */}
    <g transform="rotate(-12 160 112)">
      <g className="status-stamp">
        <rect
          x="104"
          y="84"
          width="112"
          height="56"
          rx="10"
          fill={paper}
          fillOpacity="0.9"
          stroke={brand}
          strokeWidth="4"
        />
        <text
          x="160"
          y="118"
          textAnchor="middle"
          fill={brand}
          fontSize="30"
          fontWeight="700"
          className="font-display"
        >
          404
        </text>
        <text
          x="160"
          y="132"
          textAnchor="middle"
          fill={brand}
          fontSize="7.5"
          fontWeight="700"
          letterSpacing="1.6"
          className="font-mono"
        >
          IKKE FUNNET
        </text>
      </g>
    </g>
  </Scene>
)

/** Closed or expired: a padlock on the form. */
export const ClosedIllustration = ({ className }: ArtProps) => (
  <Scene label="Et skjema med hengelås" className={className}>
    <Sheet checked={1} />
    <g className="status-stamp">
      <path
        d="M200 150v-14a18 18 0 0 1 36 0v14"
        fill="none"
        stroke={brand}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <rect x="188" y="146" width="60" height="50" rx="10" fill={brand} />
      <circle cx="218" cy="166" r="6" fill={ink} />
      <rect x="215" y="168" width="6" height="14" rx="3" fill={ink} />
    </g>
  </Scene>
)

/** Log in first: the form with a person badge. */
export const LoginIllustration = ({ className }: ArtProps) => (
  <Scene label="Et skjema med et personmerke" className={className}>
    <Sheet />
    <g className="status-stamp">
      <circle cx="220" cy="168" r="32" fill={brand} />
      <circle cx="220" cy="158" r="10" fill={ink} />
      <path d="M201 186a19 19 0 0 1 38 0Z" fill={ink} />
    </g>
  </Scene>
)

/** No access: the person badge, crossed out. */
export const ForbiddenIllustration = ({ className }: ArtProps) => (
  <Scene label="Et skjema med et overstrøket personmerke" className={className}>
    <Sheet />
    <g className="status-stamp">
      <circle cx="220" cy="168" r="32" fill={danger} />
      <circle cx="220" cy="158" r="10" fill={ink} />
      <path d="M201 186a19 19 0 0 1 38 0Z" fill={ink} />
      <path
        d="M198 146l44 44"
        stroke={paper}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </g>
  </Scene>
)

/** Sent or already answered: every box ticked, a check badge, confetti. */
export const DoneIllustration = ({ className }: ArtProps) => {
  const confetti = [
    { x: 64, y: 54, r: 5, c: "var(--color-fg-brand-2)", d: 0.55 },
    { x: 252, y: 44, r: 4, c: "var(--color-fg-accent)", d: 0.65 },
    { x: 270, y: 112, r: 6, c: "var(--color-fg-accent-2)", d: 0.75 },
    { x: 52, y: 150, r: 4, c: "var(--color-fg-accent)", d: 0.7 },
    { x: 78, y: 206, r: 5, c: "var(--color-fg-accent-3)", d: 0.6 },
    { x: 262, y: 214, r: 4, c: "var(--color-fg-brand-2)", d: 0.8 },
  ]
  return (
    <Scene label="Et ferdig utfylt skjema med hake" className={className}>
      <Sheet checked={3} />
      {confetti.map((p) => (
        <circle
          key={`${p.x}-${p.y}`}
          cx={p.x}
          cy={p.y}
          r={p.r}
          fill={p.c}
          className="status-pop"
          style={{ animationDelay: `${p.d}s` }}
        />
      ))}
      <g className="status-stamp">
        <circle cx="222" cy="170" r="32" fill={brand} />
        <path
          d="M207 170l10 10 20-21"
          fill="none"
          stroke={ink}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </Scene>
  )
}

/** Has to be filled in on Nextcloud: an arrow out of the form. */
export const ElsewhereIllustration = ({ className }: ArtProps) => (
  <Scene label="Et skjema med en pil ut" className={className}>
    <Sheet />
    <g className="status-stamp">
      <circle cx="220" cy="168" r="32" fill={brand} />
      <path
        d="M208 180l22-22m-14 0h14v14"
        fill="none"
        stroke={ink}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </Scene>
)

/** Something broke: the sheet knocked askew, a blinking warning. */
export const ErrorIllustration = ({ className }: ArtProps) => (
  <Scene label="Et skjema på skeive med et varsel" className={className}>
    <Sheet tilt={-8} />
    <path
      d="M206 82L246 60"
      stroke={danger}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <g className="status-stamp">
      <circle
        cx="266"
        cy="50"
        r="26"
        fill={paper}
        stroke={danger}
        strokeWidth="3"
      />
      <g className="status-blink">
        <rect x="263" y="35" width="6" height="20" rx="3" fill={danger} />
        <circle cx="266" cy="63" r="3.4" fill={danger} />
      </g>
    </g>
  </Scene>
)
