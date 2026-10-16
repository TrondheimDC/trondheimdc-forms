import "react"

// CSS custom properties in `style`, as the cards' --i (which one rises in
// when) and the confetti's, without casting every style object.
declare module "react" {
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined
  }
}
