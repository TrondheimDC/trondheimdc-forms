// While a form loads from Nextcloud: the app icon's drawing (TDC over a
// checklist), its boxes ticking one after another, over a label that
// breathes. Checkin's app-loading screen, with the checklist doing the work
// its printer does there. Fades in after a moment, so a quick load never
// flashes it. It fills the screen under the header, as the form will, so
// the footer is already out of view and doesn't jump when the form comes.
export const FormsLoading = ({ label }: { label: string }) => (
  <div
    className="forms-loading flex min-h-[calc(100dvh-4rem)] flex-1 flex-col items-center justify-center px-4 py-16"
    aria-live="polite"
  >
    <svg
      viewBox="140 160 744 700"
      className="forms-loading-mark size-28 text-primary"
      fill="none"
      aria-hidden="true"
    >
      {/* TDC wordmark, as in src/app/icon.svg */}
      <g fill="currentColor" transform="translate(152 176) scale(2.9)">
        <path d="M10.0986 17.333H0L0 0L39.8145 0V17.333H29.7178V52H10.0986V17.333Z" />
        <path
          transform="translate(47.09 0)"
          d="M153.732 34.667C153.732 44.2406 145.983 52 136.422 52H0L0 0L136.422 0C145.983 0 153.732 7.75938 153.732 17.333V34.667Z"
        />
        <path
          transform="translate(208.1 0)"
          d="M39.8145 17.333H19.9072V34.667H39.8145V52H17.3105C7.74943 52 0.000113284 44.2407 0 34.667L0 17.333C0.000185034 7.75938 7.74948 0 17.3105 0L39.8145 0V17.333Z"
        />
      </g>
      {[
        { y: 420, line: 512 },
        { y: 578, line: 400 },
        { y: 736, line: 456 },
      ].map(({ y, line }, i) => (
        <g key={y} style={{ animationDelay: `${i * 0.35}s` }}>
          <rect
            x="179"
            y={y + 11}
            width="90"
            height="90"
            rx="18"
            stroke="currentColor"
            strokeWidth="22"
          />
          <rect
            x="168"
            y={y}
            width="112"
            height="112"
            rx="26"
            fill="currentColor"
            className="forms-loading-box"
            style={{ animationDelay: `${i * 0.35}s` }}
          />
          <path
            d={`M196 ${y + 58}l26 26 34-44`}
            stroke="var(--color-bg-base)"
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            className="forms-loading-tick"
            style={{ animationDelay: `${i * 0.35}s` }}
          />
          <rect
            x="344"
            y={y + 34}
            width={line}
            height="44"
            rx="22"
            fill="currentColor"
            className="forms-loading-line"
            style={{ animationDelay: `${i * 0.35}s` }}
          />
        </g>
      ))}
    </svg>
    <p className="forms-loading-label mt-8 font-display text-sm uppercase text-primary">
      {label}
    </p>
  </div>
)
