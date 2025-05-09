"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { setCache, getCache } from "@/app/cache"
import { generateRecurringOccurrences, cleanupDuplicateSessions } from "@/lib/session-utils"

export interface Session {
  id: number
  type: string
  category: string
  status: "Finished" | "On-going" | "Upcoming"
  date: string
  startTime: string
  endTime: string
  assignedBatch?: string
  assignedPlayers: string[]
  coachId: string
  // Recurring properties now only used during creation
  isRecurring?: boolean
  recurringEndDate?: string
  selectedDays?: string[]
  parentSessionId?: number
  academyId: string
  attendance: Record<string, any>
  playerMetrics: Record<string, any>
  playerRatings: Record<string, any>
}

interface SessionContextType {
  sessions: Session[]
  addSession: (session: Session) => void
  updateSession: (id: number, updatedSession: Partial<Session>) => void
  removeSession: (id: number) => void
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = "ams-sessions"

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    const storedSessions = getCache(LOCAL_STORAGE_KEY)
    if (storedSessions) {
      setSessions(storedSessions)
    }
  }, [])

  useEffect(() => {
    setCache(LOCAL_STORAGE_KEY, sessions)
  }, [sessions])

  const addSession = (session: Session) => {
    let newSessions = [session]
    if (session.isRecurring) {
      // Generate independent sessions
      const occurrences = generateRecurringOccurrences(session)
      // Don't include the template session, only the generated ones
      newSessions = occurrences
    }
    setSessions((prevSessions) => cleanupDuplicateSessions([...prevSessions, ...newSessions]))
  }

  const updateSession = (id: number, updatedSession: Partial<Session>) => {
    setSessions((prevSessions) => {
      const updatedSessions = prevSessions.map((session) =>
        session.id === id ? { ...session, ...updatedSession } : session
      )
      return cleanupDuplicateSessions(updatedSessions)
    })
  }

  const removeSession = (id: number) => {
    setSessions((prevSessions) => {
      const sessionToRemove = prevSessions.find((session) => session.id === id)
      if (sessionToRemove?.isRecurring) {
        return prevSessions.filter(
          (session) => session.id !== id && session.parentSessionId !== id
        )
      }
      return prevSessions.filter((session) => session.id !== id)
    })
  }

  return (
    <SessionContext.Provider value={{ sessions, addSession, updateSession, removeSession }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSessions = () => {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSessions must be used within a SessionProvider")
  }
  return context
}
