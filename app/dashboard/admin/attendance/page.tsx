"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, CalendarIcon, Search } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import Sidebar from "@/components/Sidebar"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

interface AttendanceRecord {
  id?: string
  userId: string
  date: string
  status: "present" | "absent" | "late"
  markedBy: string
  academyId: string
  type: "students" | "coaches"
  markedAt?: string
}

export default function AttendancePage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [date, setDate] = useState<Date>(new Date())
  const [view, setView] = useState<"daily" | "monthly">("daily")
  const [userType, setUserType] = useState<"students" | "coaches">("students")
  const [users, setUsers] = useState<any[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [visibleCount, setVisibleCount] = useState(20)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.academyId) return;

        // Fetch users
        let response;
        if (userType === "students") {
          response = await fetch(`/api/db/ams-player-data?academyId=${user.academyId}`);
          if (!response.ok) throw new Error('Failed to fetch students');
          const result = await response.json();
          
          // Ensure we're using the data property from the response
          if (result.success && Array.isArray(result.data)) {
            const formattedStudents = result.data.map((student: any) => ({
              id: student.id || student._id?.toString(),
              name: student.name || student.username || 'Unknown Student',
              email: student.email,
              academyId: student.academyId
            }));
            setUsers(formattedStudents);
          } else {
            console.error('Invalid student data format:', result);
            setUsers([]);
          }
        } else {
          // Handle coaches fetch
          response = await fetch(`/api/db/ams-users?academyId=${user.academyId}&role=coach`);
          if (!response.ok) throw new Error('Failed to fetch coaches');
          const coachData = await response.json();
          setUsers(Array.isArray(coachData) ? coachData : []);
        }

        // Fetch attendance for current date
        const dateStr = date.toISOString().split('T')[0];
        const attendanceResponse = await fetch(
          `/api/db/ams-attendance?academyId=${user.academyId}&date=${dateStr}&type=${userType}`
        );
        
        if (attendanceResponse.ok) {
          const attendanceData = await attendanceResponse.json();
          setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch data",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [user?.academyId, userType, date]);

  const getAttendanceStats = (userId: string) => {
    if (view === "daily") {
      const dateStr = date.toISOString().split("T")[0];
      const record = attendance.find(r => r.userId === userId && r.date === dateStr);
      const isPresent = record?.status === "present";
      return {
        total: 1,
        present: isPresent ? 1 : 0,
        percentage: isPresent ? 100 : 0,
      };
    } else {
      // Monthly view
      const currentMonth = date.getMonth();
      const currentYear = date.getFullYear();
      const userRecords = attendance.filter(record => {
        const recordDate = new Date(record.date);
        return record.userId === userId && 
               recordDate.getMonth() === currentMonth &&
               recordDate.getFullYear() === currentYear;
      });
      
      const total = userRecords.length;
      const present = userRecords.filter(record => record.status === "present").length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      
      return { total, present, percentage };
    }
  };

  const handleMarkAttendance = async (userId: string, status: "present" | "absent" | "late") => {
    try {
      if (!user?.academyId) throw new Error("Academy ID not found");
      
      const dateStr = date.toISOString().split("T")[0];
      
      const attendanceData = {
        academyId: user.academyId,
        userId,
        date: dateStr,
        status,
        type: userType,
        markedBy: user.id,
        markedAt: new Date().toISOString()
      };

      console.log('Sending attendance data:', attendanceData);

      const response = await fetch("/api/db/ams-attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(attendanceData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(errorText || "Failed to mark attendance");
      }

      const result = await response.json();
      console.log('Attendance saved successfully:', result);

      // Refresh attendance data
      const refreshResponse = await fetch(
        `/api/db/ams-attendance?academyId=${user.academyId}&date=${dateStr}&type=${userType}`
      );
      
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json();
        setAttendance(Array.isArray(refreshedData) ? refreshedData : []);
      }

      toast({
        title: "Success",
        description: `Attendance marked as ${status}`,
      });

    } catch (error) {
      console.error("Error marking attendance:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark attendance",
        variant: "destructive",
      });
    }
  };

  const getUserAttendanceStatus = (userId: string) => {
    const dateStr = date.toISOString().split("T")[0];
    const record = attendance.find(r => 
      r.userId === userId && 
      r.date === dateStr && 
      r.type === userType
    );
    return record?.status || "Not marked";
  };

  const exportAttendance = () => {
    // Get attendance stats for all users
    const exportData = users
      .filter(user => user.academyId === user?.academyId)
      .map(user => {
        const stats = getAttendanceStats(user.id);
        return {
          id: user.id,
          name: user.name,
          attendance: `${stats.present}/${stats.total}`
        };
      });

    // Create CSV content
    const csvContent = [
      ['Student ID', 'Student Name', 'Attendance (Present/Total)'].join(','),
      ...exportData.map(row => [
        row.id,
        row.name,
        row.attendance
      ].join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${date.toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getFilteredUsers = () => {
    // Ensure users is an array before filtering
    return Array.isArray(users)
      ? users.filter(user => 
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : [];
  };

  const handleViewMore = () => {
    setVisibleCount(prev => prev + 20);
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Attendance Management</h2>
            <p className="text-muted-foreground">
              Mark and monitor attendance for students and coaches
            </p>
          </div>
          <Button onClick={exportAttendance} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-4">
            <Tabs value={view} onValueChange={(v) => setView(v as "daily" | "monthly")}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={userType} onValueChange={(v) => setUserType(v as "students" | "coaches")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="students">Students</SelectItem>
                <SelectItem value="coaches">Coaches</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${userType}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Sheet</CardTitle>
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
                    {getFilteredUsers().map((user) => {
                      const currentStatus = getUserAttendanceStatus(user.id)
                      return (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                currentStatus === "present"
                                  ? "success"
                                  : currentStatus === "late"
                                  ? "outline"
                                  : currentStatus === "absent"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {currentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant={currentStatus === "present" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleMarkAttendance(user.id, "present")}
                              >
                                Present
                              </Button>
                              <Button
                                variant={currentStatus === "late" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleMarkAttendance(user.id, "late")}
                              >
                                Late
                              </Button>
                              <Button
                                variant={currentStatus === "absent" ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleMarkAttendance(user.id, "absent")}
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

                {visibleCount < (Array.isArray(users) ? users.filter(user => 
                  user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
                ).length : 0) && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={handleViewMore}
                  >
                    View More ({Array.isArray(users) ? users.filter(user => 
                      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
                    ).length - visibleCount : 0} remaining)
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getFilteredUsers().map((user) => {
                    const stats = getAttendanceStats(user.id)
                    return (
                      <div key={user.id} className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">{user.name}</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Total Days:</div>
                          <div>{stats.total}</div>
                          <div>Present:</div>
                          <div>{stats.present}</div>
                          <div>Attendance:</div>
                          <div>
                            <Badge variant={stats.percentage >= 75 ? "success" : "destructive"}>
                              {stats.percentage}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {visibleCount < (Array.isArray(users) ? users.filter(user => 
                  user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
                ).length : 0) && (
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={handleViewMore}
                  >
                    View More Statistics ({Array.isArray(users) ? users.filter(user => 
                      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
                    ).length - visibleCount : 0} remaining)
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

