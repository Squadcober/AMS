import { DataExporter } from "@/lib/export-data"
import { PerformanceAnalytics } from "@/lib/performance-analytics"
// Update the import path below if "@/lib/tactical-analysis" is incorrect
import { TacticalAnalysis } from "./tactical-analysis"

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
