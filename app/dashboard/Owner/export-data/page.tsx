"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { CustomTooltip } from "@/components/custom-tooltip"
import { usePlayers } from "@/contexts/PlayerContext"
import { useBatches } from "@/contexts/BatchContext"
import { useAuth } from "@/contexts/AuthContext"
import { Download } from "lucide-react"
import { DataExporter } from '@/lib/export-data'
import { Sidebar } from "@/components/Sidebar"

export default function ExportData() {
  const { players } = usePlayers()
  const { batches } = useBatches()
  const { user } = useAuth()
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([])
  const [selectedBatch, setSelectedBatch] = useState<string>("")
  const [selectedPlayer, setSelectedPlayer] = useState<string>("")
  const [selectedCoach, setSelectedCoach] = useState<string>("")
  const [dateRange, setDateRange] = useState<string>("last-month")
  const [coaches, setCoaches] = useState<any[]>([])

  useEffect(() => {
    // Load coaches from localStorage
    const allUsers = JSON.parse(localStorage.getItem("users") || "[]")
    setCoaches(allUsers.filter((user: any) => user.role === "coach"))
  }, [])

  const dataTypes = [
    { id: "player-records", label: "Player Records" },
    { id: "coach-records", label: "Coach Records" },
    { id: "performance-data", label: "Performance Data" },
    { id: "financial-records", label: "Financial Records" },
    { id: "attendance-records", label: "Attendance Records" },
    { id: "batch-data", label: "Batch Data" },
  ]

  const handleDataTypeChange = (checked: boolean, dataType: string) => {
    setSelectedDataTypes(
      checked ? [...selectedDataTypes, dataType] : selectedDataTypes.filter((type) => type !== dataType),
    )
  }

  const handleExport = () => {
    // In a real application, this would trigger an API call to generate and download the export file
    // For this mock-up, we'll just log the export parameters
    console.log("Exporting data with parameters:", {
      dataTypes: selectedDataTypes,
      batch: selectedBatch,
      player: selectedPlayer,
      coach: selectedCoach,
      dateRange,
    })

    // Mock export function
    const sessions = JSON.parse(localStorage.getItem("ams-sessions") || "[]")
    const csvContent = DataExporter.exportData(
      {
        dataTypes: selectedDataTypes,
        batch: selectedBatch,
        player: selectedPlayer,
        coach: selectedCoach,
        dateRange,
      },
      sessions,
      players,
      batches,
      coaches
    )

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "exported-data.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col space-y-6 overflow-auto p-4">
        <CustomTooltip content="Export academy data for analysis or reporting">
          <h1 className="text-3xl font-bold text-white">Export Data</h1>
        </CustomTooltip>
        <Card>
          <CardHeader>
            <CardTitle>Select Data to Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label>Data Types</Label>
              <div className="grid grid-cols-2 gap-4">
                {dataTypes.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.id}
                      checked={selectedDataTypes.includes(type.id)}
                      onCheckedChange={(checked) => handleDataTypeChange(checked as boolean, type.id)}
                    />
                    <label
                      htmlFor={type.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {type.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch">Batch</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger id="batch">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="player">Player</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger id="player">
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Players</SelectItem>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id.toString()}>
                      {player.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coach">Coach</Label>
              <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                <SelectTrigger id="coach">
                  <SelectValue placeholder="Select coach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Coaches</SelectItem>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-range">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id="date-range">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-week">Last Week</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                  <SelectItem value="all-time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleExport} disabled={selectedDataTypes.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

