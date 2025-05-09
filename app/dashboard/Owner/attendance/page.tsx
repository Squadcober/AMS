"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/Sidebar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"

interface AttendanceRecord {
  id: string
  userId: string
  date: string
  status: "present" | "absent" | "late"
  checkInTime?: string
  checkOutTime?: string
  markedBy: string
  academyId: string
  type?: string
}

export default function AttendancePage() {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [academies, setAcademies] = useState<any[]>([])
  const [selectedAcademy, setSelectedAcademy] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [userType, setUserType] = useState<"students" | "coaches">("students")
  const [playerIdNameMap, setPlayerIdNameMap] = useState<Record<string, string>>({})
  const [playerData, setPlayerData] = useState<any[]>([])

  // Helper to flatten attendance data if some records are grouped by date with a "records" object
  function flattenAttendance(raw: any[]): AttendanceRecord[] {
    const flat: AttendanceRecord[] = [];
    for (const entry of raw) {
      // If entry has a "records" object (grouped by userId)
      if (entry.records && typeof entry.records === "object" && !Array.isArray(entry.records)) {
        Object.entries(entry.records).forEach(([userId, rec]: [string, any]) => {
          flat.push({
            id: rec._id || entry._id || `${userId}-${entry.date}`,
            userId,
            date: entry.date,
            status: rec.status,
            checkInTime: rec.checkInTime,
            checkOutTime: rec.checkOutTime,
            markedBy: rec.markedBy,
            academyId: entry.academyId,
            type: entry.type,
          });
        });
      } else if (entry.userId && entry.date && entry.status) {
        // Flat record
        flat.push({
          id: entry._id || entry.id,
          userId: entry.userId,
          date: entry.date,
          status: entry.status,
          checkInTime: entry.checkInTime,
          checkOutTime: entry.checkOutTime,
          markedBy: entry.markedBy,
          academyId: entry.academyId,
          type: entry.type,
        });
      }
    }
    return flat;
  }

  // Helper: get attendance stats for a user
  function getAttendanceStats(userId: string) {
    const userRecords = attendance.filter(r => r.userId === userId)
    // Get all unique dates marked for this user
    const uniqueDates = Array.from(new Set(userRecords.map(r => r.date))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    // Count present marks (one per date)
    const presentDates = uniqueDates.filter(date =>
      userRecords.some(r => r.date === date && r.status === "present")
    )
    // Count absent marks (one per date)
    const absentDates = uniqueDates.filter(date =>
      userRecords.some(r => r.date === date && r.status === "absent")
    )
    // Count late marks (one per date)
    const lateDates = uniqueDates.filter(date =>
      userRecords.some(r => r.date === date && r.status === "late")
    )
    // Last 10 present dates (descending)
    const last10Present = presentDates.slice(0, 10)
    return {
      total: uniqueDates.length,
      present: presentDates.length,
      absent: absentDates.length,
      late: lateDates.length,
      last10Present
    }
  }

  useEffect(() => {
    const fetchAcademies = async () => {
      setLoading(true)
      try {
        // Fetch academies
        const academyRes = await fetch('/api/db/ams-academy')
        const academyData = await academyRes.json()
        const academyList = academyData.success ? academyData.data : []
        setAcademies(academyList)
        // Default to first academy if available
        if (academyList.length > 0 && !selectedAcademy) {
          setSelectedAcademy(academyList[0].id || academyList[0]._id)
        }
      } catch {
        setAcademies([])
      } finally {
        setLoading(false)
      }
    }
    fetchAcademies()
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (!selectedAcademy) return
    setLoading(true)
    const fetchData = async () => {
      try {
        // Fetch users for selected academy and type
        const usersRes = await fetch(`/api/db/ams-users?academyId=${selectedAcademy}&role=${userType === "students" ? "student" : "coach"}`)
        const usersData = await usersRes.json()
        setUsers(usersData.success ? usersData.data : [])

        // Fetch attendance for selected academy and type
        const attendanceRes = await fetch(`/api/db/ams-attendance?academyId=${selectedAcademy}&type=${userType}`)
        const attendanceData = await attendanceRes.json()
        // Always flatten the attendance data for display
        let records: AttendanceRecord[] = []
        if (Array.isArray(attendanceData)) {
          records = flattenAttendance(attendanceData)
        } else if (attendanceData.success && Array.isArray(attendanceData.data)) {
          records = flattenAttendance(attendanceData.data)
        } else if (attendanceData.success && attendanceData.data && typeof attendanceData.data === "object" && attendanceData.data.records) {
          records = flattenAttendance([attendanceData.data])
        } else if (Array.isArray(attendanceData.records)) {
          records = flattenAttendance(attendanceData.records)
        } else if (attendanceData.records && typeof attendanceData.records === "object") {
          records = flattenAttendance([attendanceData])
        }
        console.log("Fetched attendance data:", attendanceData, "Flattened:", records)
        setAttendance(records)
      } catch {
        setUsers([])
        setAttendance([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedAcademy, userType])

  useEffect(() => {
    if (!selectedAcademy) return
    const fetchPlayerData = async () => {
      try {
        const res = await fetch(`/api/db/ams-player-data?academyId=${selectedAcademy}`)
        const data = await res.json()
        if (data.success && Array.isArray(data.data)) {
          setPlayerData(data.data)
          const map: Record<string, string> = {}
          data.data.forEach((player: any) => {
            if (player.id) map[player.id] = player.name || player.username || player.id
            if (player.userId) map[player.userId] = player.name || player.username || player.userId
          })
          setPlayerIdNameMap(map)
        } else {
          setPlayerData([])
          setPlayerIdNameMap({})
        }
      } catch {
        setPlayerData([])
        setPlayerIdNameMap({})
      }
    }
    fetchPlayerData()
  }, [selectedAcademy])

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getAcademyName = (academyId: string) => {
    const academy = academies.find((a: any) => a.id === academyId || a._id === academyId)
    return academy?.name || academyId
  }

  // Helper to get display name for a user/player
  function getDisplayName(user: any) {
    // Try user.name, then playerIdNameMap, then user.username, then user.id
    return (
      user?.name ||
      playerIdNameMap[user?.id] ||
      playerIdNameMap[user?.userId] ||
      user?.username ||
      user?.id ||
      "Unknown"
    )
  }

  // Helper for attendance raw table: get name from playerIdNameMap if not found in users
  function getNameFromId(id: string) {
    const user = users.find((u: any) => u.id === id || u.userId === id)
    return user?.name || playerIdNameMap[id] || id
  }

  // Only show attendance for users whose id or userId is in playerData
  const playerIds = new Set(playerData.map((p: any) => p.id).filter(Boolean))
  const playerUserIds = new Set(playerData.map((p: any) => p.userId).filter(Boolean))
  const filteredAttendance = attendance.filter(
    rec => playerIds.has(rec.userId) || playerUserIds.has(rec.userId)
  )

  // Prepare attendance sheet rows for only those players found in playerData
  const attendanceSheetRows = playerData.map((player: any) => {
    const stats = getAttendanceStats(player.id || player.userId)
    return {
      id: player.id || player.userId,
      userName: player.name || player.username || player.id || player.userId,
      present: stats.present,
      absent: stats.absent,
      late: stats.late,
      total: stats.total,
      last10Present: stats.last10Present,
      academy: getAcademyName(player.academyId),
    }
  })

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col space-y-6 overflow-auto p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Attendance Management</h1>
        </div>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select onValueChange={setSelectedAcademy} value={selectedAcademy}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select Academy" />
              </SelectTrigger>
              <SelectContent>
                {academies.map(academy => (
                  <SelectItem key={academy.id || academy._id} value={academy.id || academy._id}>
                    {academy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={v => setUserType(v as "students" | "coaches")} value={userType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="students">Students</SelectItem>
                <SelectItem value="coaches">Coaches</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Name</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Total Marked</TableHead>
                  <TableHead>Last 10 Present Dates</TableHead>
                  <TableHead>Academy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>Loading...</TableCell>
                  </TableRow>
                ) : attendanceSheetRows.length > 0 ? (
                  attendanceSheetRows.map(row => (
                    <TableRow key={row.id}>
                      <TableCell>{row.userName}</TableCell>
                      <TableCell>
                        <Badge variant={row.present >= Math.ceil(row.total * 0.75) ? "success" : "destructive"}>
                          {row.present}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.absent > 0 ? "destructive" : "secondary"}>
                          {row.absent}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.late > 0 ? "secondary" : "default"}>
                          {row.late}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.total}</TableCell>
                      <TableCell>
                        {row.last10Present.length > 0
                          ? row.last10Present.join(", ")
                          : <span className="text-gray-400">No present records</span>
                        }
                      </TableCell>
                      <TableCell>{row.academy}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7}>No attendance records found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

