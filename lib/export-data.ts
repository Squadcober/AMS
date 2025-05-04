import { Session } from "@/types/session"
import { Player } from "@/types/player"
import { Batch } from "@/types/batch"
import { Coach } from "../types/coach"

interface ExportParams {
  dataTypes: string[]
  batch: string
  player: string
  coach: string
  dateRange: string
}

export class DataExporter {
  static exportData(params: ExportParams, sessions: Session[], players: Player[], batches: Batch[], coaches: Coach[]): string {
    let csvContent = "data:text/csv;charset=utf-8,"

    if (params.dataTypes.includes("player-records")) {
      csvContent += this.exportPlayerRecords(players)
    }

    if (params.dataTypes.includes("coach-records")) {
      csvContent += this.exportCoachRecords(coaches)
    }

    if (params.dataTypes.includes("performance-data")) {
      csvContent += this.exportPerformanceData(sessions, players)
    }

    if (params.dataTypes.includes("financial-records")) {
      csvContent += this.exportFinancialRecords(players)
    }

    if (params.dataTypes.includes("attendance-records")) {
      csvContent += this.exportAttendanceRecords(sessions, players)
    }

    if (params.dataTypes.includes("batch-data")) {
      csvContent += this.exportBatchData(batches)
    }

    return csvContent
  }

  static exportPlayerRecords(players: Player[]): string {
    let csv = "Player Records\n"
    csv += "ID,Name,Age,Position\n"
    players.forEach(player => {
      csv += `${player.id},${player.name},${player.age},${player.position}\n`
    })
    csv += "\n"
    return csv
  }

  static exportCoachRecords(coaches: Coach[]): string {
    let csv = "Coach Records\n"
    csv += "ID,Name,Experience\n"
    coaches.forEach(coach => {
      csv += `${coach.id},${coach.name},${coach.experience}\n`
    })
    csv += "\n"
    return csv
  }

  static exportPerformanceData(sessions: Session[], players: Player[]): string {
    let csv = "Performance Data\n"
    csv += "Session ID,Session Name,Player ID,Player Name,Rating\n"
    sessions.forEach(session => {
      if (session.playerRatings) {
        Object.keys(session.playerRatings).forEach(playerId => {
          const player = players.find(p => p.id.toString() === playerId)
          csv += `${session.id},${session.name},${playerId},${player?.name},${session.playerRatings![playerId]}\n`
        })
      }
    })
    csv += "\n"
    return csv
  }

  static exportFinancialRecords(players: Player[]): string {
    let csv = "Financial Records\n"
    csv += "Player ID,Player Name,Fees Paid\n"
    players.forEach(player => {
      csv += `${player.id},${player.name},${player.feesPaid}\n`
    })
    csv += "\n"
    return csv
  }

  static exportAttendanceRecords(sessions: Session[], players: Player[]): string {
    let csv = "Attendance Records\n"
    csv += "Session ID,Session Name,Player ID,Player Name,Attendance\n"
    sessions.forEach(session => {
      if (session.attendance) {
        Object.keys(session.attendance).forEach(playerId => {
          const player = players.find(p => p.id.toString() === playerId)
          csv += `${session.id},${session.name},${playerId},${player?.name},${session.attendance![playerId]}\n`
        })
      }
    })
    csv += "\n"
    return csv
  }

  static exportBatchData(batches: Batch[]): string {
    let csv = "Batch Data\n"
    csv += "Batch ID,Batch Name,Coach ID,Coach Name,Player IDs\n"
    batches.forEach(batch => {
      csv += `${batch.id},${batch.name},${batch.coachId},${batch.coachName},${batch.players.join(";")}\n`
    })
    csv += "\n"
    return csv
  }
}
