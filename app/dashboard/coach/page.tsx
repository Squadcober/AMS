"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { usePlayers } from "@/contexts/PlayerContext"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/components/ui/use-toast"
import { Sidebar } from "@/components/Sidebar"
import { useRouter } from "next/navigation"

interface TrainingSession {
  id: string
  date: Date
  time: string
  name: string
  players: string[]
  metrics: {
    playerId: string
    attributes: {
      shooting: number
      pace: number
      positioning: number
      passing: number
      ballControl: number
      crossing: number
      trainingPoints: number
      matchPoints: number
    }
  }[]
  status: "pending" | "approved" | "rejected"
}

interface AttendanceRecord {
  id: string
  userId: string
  date: string
  status: "present" | "absent" | "late"
  checkInTime?: string
  markedBy?: "coach" | "admin"
}

export default function TrainingData() {
  const { user } = useAuth()
  const { players, updatePlayerAttributes } = usePlayers()
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState("09:00")
  const [selectedName, setSelectedName] = useState("")
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [view, setView] = useState<"upcoming" | "historical" | "today">("today")
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check role-based access
    if (!user || user.role !== "COACH") {
      router.push('/auth')
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        const storedRecords = JSON.parse(localStorage.getItem("attendance-records") || "[]")
        setAttendanceRecords(storedRecords)

        // Load sessions from localStorage with proper error handling
        const storedSessions = JSON.parse(localStorage.getItem("ams-sessions") || "[]")
        const coachSessions = storedSessions.filter((session: any) => 
          session.coachId === user?.id && 
          session.academyId === user?.academyId
        )
        setSessions(coachSessions)
      } catch (err) {
        setError("Failed to load training data")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, router])

  const handleMarkAttendance = (userId: string, status: "present" | "absent" | "late") => {
    const newRecord: AttendanceRecord = {
      id: `${Date.now()}`,
      userId,
      date: new Date().toISOString().split("T")[0],
      status,
      checkInTime: status === "present" ? new Date().toLocaleTimeString() : undefined,
    }

    setAttendanceRecords((prev) => {
      const updated = [...prev.filter((r) => r.userId !== userId || r.date !== newRecord.date), newRecord]

      // Check if there's an admin record for the same user and date
      const adminRecord = updated.find(
        (r) => r.userId === userId && r.date === newRecord.date && r.markedBy === "admin",
      )

      if (!adminRecord) {
        // If no admin record exists, add the coach's record
        updated.push({ ...newRecord, markedBy: "coach" })
      }

      localStorage.setItem("attendance-records", JSON.stringify(updated))
      return updated
    })
  }

  const handleCreateSession = () => {
    if (!selectedName || !selectedDate || !selectedTime || selectedPlayers.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all fields and select at least one player.",
        variant: "destructive",
      })
      return
    }

    const newSession: TrainingSession = {
      id: Date.now().toString(),
      date: selectedDate,
      time: selectedTime,
      name: selectedName,
      players: selectedPlayers,
      metrics: selectedPlayers.map((playerId) => ({
        playerId,
        attributes: {
          shooting: 0,
          pace: 0,
          positioning: 0,
          passing: 0,
          ballControl: 0,
          crossing: 0,
          trainingPoints: 0,
          matchPoints: 0,
        },
      })),
      status: "pending",
    }

    setSessions((prevSessions) => [...prevSessions, newSession])

    // Synchronize with admin sessions
    const adminSessions = JSON.parse(localStorage.getItem("ams-sessions") || "[]")
    adminSessions.push({
      ...newSession,
      coachId: user?.id,
      status: "Upcoming",
      assignedPlayers: newSession.players,
    })
    localStorage.setItem("ams-sessions", JSON.stringify(adminSessions))

    toast({
      title: "Success",
      description: "Session created successfully.",
    })

    // Reset form
    setSelectedName("")
    setSelectedDate(new Date())
    setSelectedTime("09:00")
    setSelectedPlayers([])
  }

  const handleUpdateMetrics = (sessionId: string, playerId: string, attribute: string, value: number) => {
    setSessions((prevSessions) => {
      const updatedSessions = prevSessions.map((session) => {
        if (session.id === sessionId) {
          return {
            ...session,
            metrics: session.metrics.map((metric) => {
              if (metric.playerId === playerId) {
                return {
                  ...metric,
                  attributes: {
                    ...metric.attributes,
                    [attribute]: value,
                  },
                }
              }
              return metric
            }),
          }
        }
        return session
      })

      // Calculate sessions attended
      const playerSessions = updatedSessions.filter((session) => session.players.includes(playerId))
      const sessionsAttended = playerSessions.length

      // Update player attributes in the global context
      const player = players.find((p) => p.id.toString() === playerId)
      if (player) {
        updatePlayerAttributes(player.id, {
          attributes: {
            ...player.attributes,
            [attribute]: value,
            sessionsAttended,
          },
        })
      }

      return updatedSessions
    })

    // Synchronize with admin sessions
    const adminSessions = JSON.parse(localStorage.getItem("ams-sessions") || "[]")
    const updatedAdminSessions = adminSessions.map((adminSession: any) => {
      if (adminSession.id === sessionId) {
        return {
          ...adminSession,
          playerRatings: {
            ...adminSession.playerRatings,
            [playerId]: {
              ...adminSession.playerRatings?.[playerId],
              [attribute]: value,
            },
          },
        }
      }
      return adminSession
    })
    localStorage.setItem("ams-sessions", JSON.stringify(updatedAdminSessions))
  }

  const filteredSessions = sessions.filter((session) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sessionDate = new Date(session.date)
    sessionDate.setHours(0, 0, 0, 0)

    switch (view) {
      case "upcoming":
        return sessionDate > today
      case "historical":
        return sessionDate < today
      case "today":
        return sessionDate.getTime() === today.getTime()
      default:
        return true
    }
  })

  if (!user) return null
  if (error) return <div className="text-red-500">{error}</div>

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 p-8 overflow-auto bg-[#1a1f2b]">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-white">Training Data</h1>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Create New Session</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Training Session</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date</Label>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          className="rounded-md border"
                        />
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label>Time</Label>
                          <Input type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)} />
                        </div>
                        <div>
                          <Label>Session Name</Label>
                          <Input value={selectedName} onChange={(e) => setSelectedName(e.target.value)} />
                        </div>
                        <div>
                          <Label>Players</Label>
                          <div className="h-[200px] overflow-y-auto border rounded-md p-2">
                            {players.map((player) => (
                              <div key={player.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={selectedPlayers.includes(player.id.toString())}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPlayers([...selectedPlayers, player.id.toString()])
                                    } else {
                                      setSelectedPlayers(selectedPlayers.filter((id) => id !== player.id.toString()))
                                    }
                                  }}
                                />
                                <span>{player.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleCreateSession}>Create Session</Button>
                </DialogContent>
              </Dialog>
            </div>

            <Tabs defaultValue="today" onValueChange={(value) => setView(value as any)}>
              <TabsList>
                <TabsTrigger value="today">Today's Sessions</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
                <TabsTrigger value="historical">Historical Sessions</TabsTrigger>
              </TabsList>

              <TabsContent value="today" className="space-y-4">
                {filteredSessions.map((session) => (
                  <Card key={session.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <span>
                          {format(new Date(session.date), "PP")} - {session.time}
                        </span>
                        <span className="text-sm text-gray-400">{session.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Player</TableHead>
                            <TableHead>Shooting</TableHead>
                            <TableHead>Pace</TableHead>
                            <TableHead>Positioning</TableHead>
                            <TableHead>Passing</TableHead>
                            <TableHead>Ball Control</TableHead>
                            <TableHead>Crossing</TableHead>
                            <TableHead>Training Points</TableHead>
                            <TableHead>Match Points</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {session.metrics.map((metric) => {
                            const player = players.find((p) => p.id.toString() === metric.playerId)
                            return (
                              <TableRow key={metric.playerId}>
                                <TableCell>{player?.name}</TableCell>
                                {Object.entries(metric.attributes).map(([key, value]) => (
                                  <TableCell key={key}>
                                    <Slider
                                      value={[value]}
                                      min={0}
                                      max={10}
                                      step={0.1}
                                      onValueChange={([newValue]) => {
                                        handleUpdateMetrics(session.id, metric.playerId, key, newValue)
                                      }}
                                    />
                                  </TableCell>
                                ))}
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                      <Card className="mt-6">
                        <CardHeader>
                          <CardTitle>Mark Attendance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {session.metrics.map((metric) => {
                                const player = players.find((p) => p.id.toString() === metric.playerId)
                                const attendanceRecord = attendanceRecords.find(
                                  (r) => r.userId === metric.playerId && r.date === new Date().toISOString().split("T")[0],
                                )
                                return (
                                  <TableRow key={metric.playerId}>
                                    <TableCell>{player?.name}</TableCell>
                                    <TableCell>
                                      {attendanceRecord ? (
                                        <span
                                          className={`capitalize ${attendanceRecord.status === "present" ? "text-green-500" : attendanceRecord.status === "late" ? "text-yellow-500" : "text-red-500"}`}
                                        >
                                          {attendanceRecord.status}
                                        </span>
                                      ) : (
                                        <span className="text-gray-500">Not marked</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex space-x-2">
                                        <Button
                                          size="sm"
                                          variant={attendanceRecord?.status === "present" ? "default" : "outline"}
                                          onClick={() => handleMarkAttendance(metric.playerId, "present")}
                                        >
                                          Present
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={attendanceRecord?.status === "late" ? "default" : "outline"}
                                          onClick={() => handleMarkAttendance(metric.playerId, "late")}
                                        >
                                          Late
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={attendanceRecord?.status === "absent" ? "default" : "outline"}
                                          onClick={() => handleMarkAttendance(metric.playerId, "absent")}
                                        >
                                          Absent
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="upcoming" className="space-y-4">
                {filteredSessions.map((session) => (
                  <Card key={session.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <span>
                          {format(new Date(session.date), "PP")} - {session.time}
                        </span>
                        <span className="text-sm text-gray-400">{session.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p>Players: {session.players.length}</p>
                      <p>Status: {session.status}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="historical" className="space-y-4">
                {filteredSessions.map((session) => (
                  <Card key={session.id}>
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        <span>
                          {format(new Date(session.date), "PP")} - {session.time}
                        </span>
                        <span className="text-sm text-gray-400">{session.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Player</TableHead>
                            {/* <TableHead>Average Performance</TableHead> */}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {session.metrics.map((metric) => {
                            const player = players.find((p) => p.id.toString() === metric.playerId)
                            // const avgPerformance =
                            //   Object.values(metric.attributes).reduce((sum, value) => sum + value, 0) /
                            //   Object.values(metric.attributes).length
                            return (
                              <TableRow key={metric.playerId}>
                                <TableCell>{player?.name}</TableCell>
                                {/* <TableCell>{avgPerformance.toFixed(2)}</TableCell> */}
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}

