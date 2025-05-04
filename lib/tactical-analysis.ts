import { Player } from "@/types/player"
import { Session } from "@/types/session"

const LOCAL_STORAGE_KEY = "ams-tactical-analysis"

interface MatchFootage {
  matchId: number
  highlightsUrl: string
  heatmapUrl: string
  performanceComparison: string // URL to performance comparison report
}

interface Playbook {
  formation: string
  setPieces: string[]
  strategy: string
  trainingDrills: string[]
}

interface OpponentReport {
  teamName: string
  weaknesses: string[]
  strengths: string[]
  historicalData: string // URL to historical match data
  suggestedFormations: string[]
}

interface LiveAnalytics {
  playerId: number
  fatigueLevel: number
  performanceRating: number
  tacticalSuggestions: string[]
  substitutionRecommendations: string[]
}

interface TacticalData {
  matchFootage: MatchFootage[]
  playbooks: Playbook[]
  opponentReports: OpponentReport[]
  liveAnalytics: LiveAnalytics[]
}

export class TacticalAnalysis {
  static getTacticalData(): TacticalData {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY)
    return storedData ? JSON.parse(storedData) : { matchFootage: [], playbooks: [], opponentReports: [], liveAnalytics: [] }
  }

  static saveTacticalData(data: TacticalData): void {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
  }

  static addMatchFootage(footage: MatchFootage): TacticalData {
    const data = this.getTacticalData()
    data.matchFootage.push(footage)
    this.saveTacticalData(data)
    return data
  }

  static addPlaybook(playbook: Playbook): TacticalData {
    const data = this.getTacticalData()
    data.playbooks.push(playbook)
    this.saveTacticalData(data)
    return data
  }

  static addOpponentReport(report: OpponentReport): TacticalData {
    const data = this.getTacticalData()
    data.opponentReports.push(report)
    this.saveTacticalData(data)
    return data
  }

  static addLiveAnalytics(analytics: LiveAnalytics): TacticalData {
    const data = this.getTacticalData()
    data.liveAnalytics.push(analytics)
    this.saveTacticalData(data)
    return data
  }
}
