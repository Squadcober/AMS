export interface Session {
  academyId: string
  id: number
  name: string
  status: "Finished" | "On-going" | "Upcoming"
  date: string
  startTime: string
  endTime: string
  assignedBatch?: string
  assignedPlayers: string | string[]
  coachId: string | string[]
  userId: string
  isRecurring?: boolean
  recurringEndDate?: string
  selectedDays?: string[]
  totalOccurrences?: number
  playerRatings?: { [playerId: string]: number }
  attendance?: { [playerId: string]: "Present" | "Absent" }
}

export interface Player {
  academyId: string
  id: string
  name: string
  // ... other player properties
}

export interface Coach {
  academyId: string
  id: string
  name: string
  // ... other coach properties
}