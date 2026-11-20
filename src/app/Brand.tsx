import { useId } from 'react'

export function BrandMark() {
  const maskId = `daybox-logo-clock-cutout-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center">
      <svg
        width="26"
        height="26"
        viewBox="0 0 256 256"
        role="img"
        aria-label="DayBox"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <rect width="256" height="256" fill="#fff" />
            <circle cx="183" cy="177" r="57" fill="#000" />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          <rect
            x="38"
            y="44"
            width="152"
            height="168"
            rx="28"
            fill="none"
            stroke="#d65332"
            strokeWidth="18"
          />
          <path
            d="M76 93h70M76 132h48"
            stroke="#d65332"
            strokeWidth="16"
            strokeLinecap="round"
          />
        </g>
        <circle
          cx="183"
          cy="177"
          r="48"
          fill="none"
          stroke="#d65332"
          strokeWidth="18"
        />
        <path
          d="M183 153v27l18 12"
          fill="none"
          stroke="#d65332"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <span className="text-foreground text-base font-semibold tracking-tight">
        DayBox
      </span>
    </div>
  )
}
