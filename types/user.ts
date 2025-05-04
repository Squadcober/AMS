export enum UserRole {
  ADMIN = "ADMIN",
  COORDINATOR = "COORDINATOR",
  PLAYER = "PLAYER",
  OWNER = "OWNER",
  COACH = "COACH",
  USER = "USER"
}

export interface User {
  academyId: string
  displayName: string
  photoUrl: string
  about: string
  sessionsCount: number
  ratings: never[]
  license: string
  age: number
  id: string
  username: string
  password: string
  role: UserRole
  name: string
  email: string
}

export interface Student extends User {
  academyId: string
  age: number
  grade: string
  sports: string[]
}

export interface Coach extends User {
  academyId: string
  specialization: string
  experience: number
}

export interface Admin extends User {
  academyId: string
  department: string
}

export interface COORDINATOR extends User {
  academyId: string
  department: string
}
