'use client'

import { Icon } from '@/core/components/v4'
import type { BookingItem } from './types'
import { CATEGORY_ICON } from './BookingsV4'

/**
 * The Amenities map (v4.43.0): the community's picture of the land with a pin for each bookable thing
 * that has one. Pins sit at a percent of the picture, so they stay put at any size. With `placing`,
 * a click on the picture says where that item goes (Admin › Bookings › Map).
 */
export default function AmenitiesMap({ url, items, onOpen, placing, onPlace, selectedId }: {
  url: string
  items: BookingItem[]
  onOpen?: (id: string) => void
  placing?: BookingItem | null
  onPlace?: (x: number, y: number) => void
  selectedId?: string | null
}) {
  const pinned = items.filter(i => i.map_x != null && i.map_y != null)

  function click(e: React.MouseEvent<HTMLDivElement>) {
    if (!placing || !onPlace) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100
    const y = ((e.clientY - r.top) / r.height) * 100
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) onPlace(x, y)
  }

  return (
    <div className={`v4-map${placing ? ' v4-map--placing' : ''}`} onClick={click}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a community upload of any size; next/image needs known sizes */}
      <img src={url} alt="Map of the land" className="v4-map__img" draggable={false} />
      {pinned.map(i => {
        const ci = CATEGORY_ICON[i.category]
        return (
          <button
            key={i.id} type="button"
            className={`v4-pin v4-pin--${ci.tone}${selectedId === i.id ? ' v4-pin--on' : ''}`}
            style={{ left: `${i.map_x}%`, top: `${i.map_y}%` }}
            onClick={e => { e.stopPropagation(); if (!placing) onOpen?.(i.id) }}
            aria-label={i.name}
          >
            <Icon name={ci.icon} size={14} />
            <span className="v4-pin__label">{i.name}</span>
          </button>
        )
      })}
    </div>
  )
}
