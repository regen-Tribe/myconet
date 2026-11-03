'use client'
import { createContext, useContext, useMemo } from 'react'
import { circleSet, type Circle, type CircleSet } from '@/core/lib/circles'

const CirclesContext = createContext<CircleSet>(circleSet([]))

/** Provided once in the root layout, so every client component can read the circles. */
export function CirclesProvider({ rows, children }: { rows: Circle[]; children: React.ReactNode }) {
  const set = useMemo(() => circleSet(rows), [rows])
  return <CirclesContext.Provider value={set}>{children}</CirclesContext.Provider>
}

export function useCircles(): CircleSet {
  return useContext(CirclesContext)
}
