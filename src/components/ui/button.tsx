import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

// trondheimdc.no's button (04-components/button.css): a pill in the display
// face, uppercase, that lifts on hover. Icon buttons skip the type treatment.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 border-transparent font-display font-semibold uppercase leading-none tracking-wide transition-[translate,background-color,color,border-color] duration-150 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Green on dark, light red on light: trondheimdc.no's primary CTA.
        default:
          "bg-primary text-always-dark hover:-translate-y-0.5 hover:bg-success active:translate-y-0 light:bg-destructive light:hover:bg-[color-mix(in_srgb,var(--color-bg-danger)_85%,var(--color-black))]",
        // trondheimdc.no's .btn--ghost
        outline:
          "border-border-strong bg-transparent text-foreground hover:-translate-y-0.5 hover:bg-card active:translate-y-0",
        // trondheimdc.no's .btn--dark
        secondary:
          "bg-always-dark text-white hover:-translate-y-0.5 hover:bg-[var(--color-black-2)] active:translate-y-0",
        ghost: "text-foreground hover:bg-card",
        link: "h-auto rounded-none border-0 p-0 normal-case tracking-normal text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "px-5 py-3 text-base",
        sm: "px-4 py-2 text-sm",
        lg: "px-8 py-4 text-lg",
        icon: "size-9 border-0 font-sans normal-case tracking-normal",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
