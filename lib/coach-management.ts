import { Coach } from './types'

const STORAGE_KEY = 'ams-coaches'

export class CoachManager {
  static getCoaches(): Coach[] {
    const coaches = localStorage.getItem(STORAGE_KEY)
    return coaches ? JSON.parse(coaches) : []
  }

  static addCoach(coach: Omit<Coach, "id" | "createdAt">): Coach {
    const coaches = this.getCoaches()
    const newCoach: Coach = {
      ...coach,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    }
    
    coaches.push(newCoach)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coaches))
    return newCoach
  }

  static updateCoach(id: string, updates: Partial<Coach>): Coach | null {
    const coaches = this.getCoaches()
    const index = coaches.findIndex(c => c.id === id)
    
    if (index === -1) return null
    
    coaches[index] = { ...coaches[index], ...updates }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coaches))
    return coaches[index]
  }

  static deleteCoach(id: string): boolean {
    const coaches = this.getCoaches()
    const filteredCoaches = coaches.filter(c => c.id !== id)
    
    if (filteredCoaches.length === coaches.length) return false
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredCoaches))
    return true
  }

  static getCoachById(id: string): Coach | null {
    const coaches = this.getCoaches()
    return coaches.find(c => c.id === id) || null
  }
}
