import { type VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'
import type { ComponentPropsWithRef } from 'react'

import { cn } from '../lib/utils'
import { buttonVariants } from './button-variants'

interface ButtonProps
  extends
    ComponentPropsWithRef<'button'>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export { Button }
export type { ButtonProps }
