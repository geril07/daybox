import { cva } from 'class-variance-authority'

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

export { buttonVariants }
