import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Item = {
  id: string
  title: string
  subtitle?: string
  imageUrl?: string
  meta?: string
}

type Props = {
  items: Item[]
  onChoice?: (choice: 'yes' | 'no', item: Item) => void
  emptyText?: string
  title?: string
}

export default function SwipeChooser({
  items,
  onChoice,
  emptyText = 'All done',
  title = 'Discover',
}: Props) {
  const queue = useMemo(() => items.slice(0, 30), [items])
  const [idx, setIdx] = useState(0)

  const current = queue[idx]
  const remaining = queue.length - idx - 1

  function next(choice: 'yes' | 'no') {
    if (!current) return
    onChoice?.(choice, current)
    setIdx(i => i + 1)
  }

  return (
    <div className="rounded-2xl border border-gray-200 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-gray-500">{remaining >= 0 ? `${remaining} left` : ''}</span>
      </div>

      <div className="relative h-64 select-none">
        <AnimatePresence initial={false}>
          {current ? (
            <Card
              key={current.id}
              item={current}
              onSwipeLeft={() => next('no')}
              onSwipeRight={() => next('yes')}
            />
          ) : (
            <div className="h-full grid place-items-center text-sm text-gray-600">
              {emptyText}
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => next('no')}
          className="px-4 py-2 rounded-xl bg-gray-200 text-gray-900 text-sm disabled:opacity-50"
          disabled={!current}
        >
          No
        </button>
        <button
          onClick={() => next('yes')}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm disabled:opacity-50"
          disabled={!current}
        >
          Yes
        </button>
      </div>
    </div>
  )
}

function Card({
  item,
  onSwipeLeft,
  onSwipeRight,
}: {
  item: Item
  onSwipeLeft: () => void
  onSwipeRight: () => void
}) {
  const swipeConfidenceThreshold = 80 // px
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        whileDrag={{ scale: 1.02 }}
        onDragEnd={(_, info) => {
          const x = info.offset.x
          if (x > swipeConfidenceThreshold) onSwipeRight()
          else if (x < -swipeConfidenceThreshold) onSwipeLeft()
        }}
        className="h-full rounded-2xl bg-white shadow-sm overflow-hidden border border-gray-100"
      >
        {item.imageUrl ? (
          <div className="h-36 w-full overflow-hidden">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="h-36 w-full bg-gray-100" />
        )}
        <div className="p-3 space-y-1">
          <div className="font-medium">{item.title}</div>
          {item.subtitle && <div className="text-sm text-gray-600">{item.subtitle}</div>}
          {item.meta && <div className="text-xs text-gray-500">{item.meta}</div>}
        </div>
      </motion.div>
    </motion.div>
  )
}
