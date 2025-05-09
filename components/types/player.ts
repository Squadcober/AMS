import { Drill } from "./drill"

export type PlayerAttributes = {
  shooting: number
  pace: number
  positioning: number
  passing: number
  ballControl: number
  crossing: number
  sessionRating: number
  matchpoints: number
  trainingPoints: number
  sessionsAttended: number
  overall: number
}

export type PerformanceHistoryEntry = {
  date: string;
  sessionId?: string | number;
  sessionName?: string;
  rating?: number;
  attendance?: boolean;
  position?: string;
  attributes?: {
    shooting: number;
    pace: number;
    positioning: number;
    passing: number;
    ballControl: number;
    crossing: number;
    matchPoints?: number;
    trainingPoints?: number;
  };
}

export type Player = {
  academyId: string
  schedule: Drill[]
  id: string
  userId: string
  name: string
  username: string // Add the username attribute
  age: number
  position: string
  photoUrl: string
  attributes: PlayerAttributes
  batchId?: string // Changed to string
  coachId?: string
  coachNotes?: string
  performanceHistory: PerformanceHistoryEntry[]
  playingStyle: string
  trainingStats: {
    sessionsAttended: number
    averagePerformance: number
  }
  matchStats: {
    goalsScored: number
    assists: number
    cleanSheets: number
  }
  injuries?: unknown[]
  galleryImages: string[]
  feesPaid: number
}

export type Batch = {
  academyId: string
  id: string // Corrected to string
  name: string
  coachId: string
  coachName: string
  players: string[]
}

