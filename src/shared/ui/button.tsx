import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'
import type { ComponentPropsWithRef } from 'react'

import { cn } from '../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap transition-all duration-140 outline-none',
  {
    variants: {
      variant: {
        primary: 'rounded-[6px] py-2 text-xs font-medium text-white',
        secondary: 'rounded-[6px] py-2 text-xs transition-all duration-120',
        danger: 'rounded-[6px] py-2 text-xs transition-all duration-120',
        ghost: 'rounded-[4px] transition-all duration-120',
        export: 'w-full rounded-[6px] py-2 text-[13.5px]',
      },
    },
    defaultVariants: {
      variant: 'secondary',
    },
  },
)

interface ButtonProps
  extends ComponentPropsWithRef<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild, ...props }, ref) => {
    if (asChild) {
      return (
        <span
          ref={ref}
          className={cn(buttonVariants({ variant }), className)}
          {...(props as Record<string, unknown>)}
        />
      )
    }
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
export type { ButtonProps }
