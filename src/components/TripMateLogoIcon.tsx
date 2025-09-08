import React from 'react'

type Props = {
  size?: number
  monochrome?: boolean // set true for single-color version
  color?: string       // used when monochrome is true
}

export default function TripMateLogoIcon({ size = 24, monochrome = false, color = '#0F172A' }: Props) {
  const gradId = 'tm-grad'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-label="TripMate logo"
      role="img"
    >
      {!monochrome && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" />   {/* sky-500 */}
            <stop offset="100%" stopColor="#6366F1" /> {/* indigo-500 */}
          </linearGradient>
        </defs>
      )}

      {/* Map pin */}
      <path
        d="M12 2c3.9 0 7 2.93 7 6.55 0 5.3-7 12.9-7 12.9S5 13.85 5 8.55C5 4.93 8.1 2 12 2Z"
        fill={monochrome ? color : `url(#${gradId})`}
      />
      {/* Pin center */}
      <circle cx="12" cy="8.5" r="2.15" fill="white" opacity="0.9" />

      {/* Flight trail (dotted arc) */}
      <path
        d="M7 15.5c2.8 1.2 6.2 1.2 10 0"
        fill="none"
        stroke={monochrome ? color : `url(#${gradId})`}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="2 3"
        opacity="0.9"
      />

      {/* Tiny plane at end of trail */}
      <polygon
        points="17.5,15.1 20.3,15.7 18.3,16.8"
        fill={monochrome ? color : '#6366F1'}
        opacity="0.95"
      />
    </svg>
  )
}
