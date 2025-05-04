import { SessionManager } from "@/lib/session-management"
import { DataExporter } from "@/lib/export-data"
import { PerformanceAnalytics } from "@/lib/performance-analytics"
import { TacticalAnalysis } from "@/lib/tactical-analysis"

export class BackendSetup {
  static initialize() {
    // Initialize data exporter
    if (!localStorage.getItem("ams-export-data")) {
      DataExporter.exportData(
        {
          dataTypes: [],
          batch: "",
          player: "",
          coach: "",
          dateRange: "",
        },
        [],
        [],
        [],
        []
      )
    }

    // Initialize performance analytics
    if (!localStorage.getItem("ams-performance")) {
      PerformanceAnalytics.savePerformanceData([])
    }

    // Initialize tactical analysis
    if (!localStorage.getItem("ams-tactical-analysis")) {
      TacticalAnalysis.saveTacticalData({
        matchFootage: [],
        playbooks: [],
        opponentReports: [],
        liveAnalytics: [],
      })
    }
  }
}
