import { ObjectId } from 'mongodb'

export interface Academy {
  _id?: ObjectId
  id: string
  name: string
  location: string
  contact: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export interface Player {
  _id?: ObjectId
  id: string
  academyId: string
  name: string
  email: string
  phone: string
  attributes?: {
    shooting: number
    pace: number
    positioning: number
    passing: number
    ballControl: number
    crossing: number
    overall: number
  }
  performanceHistory?: Array<{
    date: string
    sessionId: string
    attributes: any
    attendance: boolean
  }>
  personalInformation?: {
    dob: string
    gender: string
    height: string
    weight: string
    address: string
    guardianName: string
    guardianPhone: string
  }
}

export interface User {
  _id?: ObjectId
  id: string
  name: string
  email: string
  role: 'admin' | 'coach' | 'player'
  academyId: string
  password: string
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  _id?: ObjectId
  id: string
  name: string
  academyId: string
  date: string
  startTime: string
  endTime: string
  status: 'Upcoming' | 'On-going' | 'Finished'
  assignedPlayers: string[]
  coachId: string | string[]
  attendance: Record<string, {
    status: 'Present' | 'Absent'
    markedAt: string
    markedBy: string
  }>
  playerMetrics?: Record<string, {
    shooting: number
    pace: number
    positioning: number
    passing: number
    ballControl: number
    crossing: number
    sessionRating: number
  }>
}
