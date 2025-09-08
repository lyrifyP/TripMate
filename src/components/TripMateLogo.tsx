import React from 'react'
import TripMateLogoIcon from './TripMateLogoIcon'

type Props = {
  size?: number      // icon size
  stacked?: boolean  // stack text under the icon if true
  color?: string     // text color
}

export default function TripMateLogo({ size = 20, stacked = false, color = '#0F172A' }: Props) {
  const Text = (
    <span
      style={{ color }}
      className="font-semibold tracking-tight"
    >
      Trip<span className="text-indigo-600">Mate</span>
    </span>
  )
  return stacked ? (
    <div className="flex flex-col items-center gap-1">
      <TripMateLogoIcon size={size} />
      {Text}
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <TripMateLogoIcon size={size} />
      {Text}
    </div>
  )
}
