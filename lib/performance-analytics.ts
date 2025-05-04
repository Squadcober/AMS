import { Player } from "@/types/player"
import { Session } from "@/types/session"

const LOCAL_STORAGE_KEY = "ams-performance"

interface PerformanceMetrics {
  passes: number
  goals: number
  assists: number
  tackles: number
  heatmap: string // URL to heatmap image
  distanceCovered: number // in kilometers
  xG: number // expected goals
}

interface TrainingPlan {
  date: string
  activities: string[]
}

interface InjuryRecord {
  date: string
  injury: string
  status: "Recovering" | "Recovered"
  recommendations: string
}

interface WearableData {
  date: string
  gpsData: string // URL to GPS data
  heartRate: number
  sleepHours: number
  recoveryStatus: string
}

interface PerformanceData {
  playerId: number
  metrics: PerformanceMetrics[]
  trainingPlans: TrainingPlan[]
  injuryRecords: InjuryRecord[]
  wearableData: WearableData[]
}

export class PerformanceAnalytics {
  static getPerformanceData(): PerformanceData[] {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY)
    return storedData ? JSON.parse(storedData) : []
  }

  static savePerformanceData(data: PerformanceData[]): void {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
  }

  static addPerformanceMetrics(playerId: number, metrics: PerformanceMetrics): PerformanceData[] {
    const data = this.getPerformanceData()
    const playerData = data.find((d) => d.playerId === playerId) || { playerId, metrics: [], trainingPlans: [], injuryRecords: [], wearableData: [] }
    playerData.metrics.push(metrics)
    this.savePerformanceData(data)
    return data
  }

  static addTrainingPlan(playerId: number, plan: TrainingPlan): PerformanceData[] {
    const data = this.getPerformanceData()
    const playerData = data.find((d) => d.playerId === playerId) || { playerId, metrics: [], trainingPlans: [], injuryRecords: [], wearableData: [] }
    playerData.trainingPlans.push(plan)
    this.savePerformanceData(data)
    return data
  }

  static addInjuryRecord(playerId: number, record: InjuryRecord): PerformanceData[] {
    const data = this.getPerformanceData()
    const playerData = data.find((d) => d.playerId === playerId) || { playerId, metrics: [], trainingPlans: [], injuryRecords: [], wearableData: [] }
    playerData.injuryRecords.push(record)
    this.savePerformanceData(data)
    return data
  }

  static addWearableData(playerId: number, wearableData: WearableData): PerformanceData[] {
    const data = this.getPerformanceData()
    const playerData = data.find((d) => d.playerId === playerId) || { playerId, metrics: [], trainingPlans: [], injuryRecords: [], wearableData: [] }
    playerData.wearableData.push(wearableData)
    this.savePerformanceData(data)
    return data
  }
}
