"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

interface Coach {
  id: string
  name: string
  email: string
  photoUrl?: string
  academyId: string
}

interface CoachContextType {
  coaches: Coach[]
  setCoaches: (coaches: Coach[]) => void
}

const CoachContext = createContext<CoachContextType | undefined>(undefined)

export function CoachProvider({ children }: { children: ReactNode }) {
  const [coaches, setCoaches] = useState<Coach[]>([])

  return (
    <CoachContext.Provider value={{ coaches, setCoaches }}>
      {children}
    </CoachContext.Provider>
  )
}

export function useCoaches() {
  const context = useContext(CoachContext)
  if (!context) {
    throw new Error('useCoaches must be used within a CoachProvider')
  }
  return context
}
