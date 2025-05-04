import { Session } from "@/contexts/SessionContext"

export const generateRecurringOccurrences = (session: Session): Session[] => {
  if (!session.isRecurring || !session.selectedDays) return []

  const startDate = new Date(session.date)
  const endDate = new Date(session.recurringEndDate || "")
  const selectedDays = session.selectedDays
  const occurrences: Session[] = []

  const currentDate = new Date(startDate)
  const seenDates = new Set()

  while (currentDate <= endDate) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    if (selectedDays.includes(dayName)) {
      const occurrenceDate = currentDate.toISOString().split('T')[0]
      if (seenDates.has(occurrenceDate)) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }
      seenDates.add(occurrenceDate)

      // Create completely independent session
      occurrences.push({
        ...session,
        id: Date.now() + Math.random(),
        date: occurrenceDate,
        status: "Upcoming",
        attendance: {},
        playerMetrics: {},
        playerRatings: {},
        // Remove recurring-specific properties
        isRecurring: false,
        selectedDays: undefined,
        recurringEndDate: undefined
      })
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return occurrences
}

export const cleanupDuplicateSessions = (sessions: Session[]): Session[] => {
  const uniqueSessions = new Map<string, Session>()

  sessions.forEach((session) => {
    // Use just date and time as key since sessions are independent
    const key = `${session.date}-${session.startTime}-${session.endTime}`

    if (uniqueSessions.has(key)) {
      const existing = uniqueSessions.get(key)!
      if (existing.status === "Upcoming" && session.status === "Finished") {
        uniqueSessions.set(key, session)
      }
    } else {
      uniqueSessions.set(key, session)
    }
  })

  return Array.from(uniqueSessions.values())
}
