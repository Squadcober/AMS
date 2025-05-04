"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, isPast } from 'date-fns';
import { toast } from "@/components/ui/use-toast";

interface Session {
  _id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  coachNames: string[];
  status: string;
  assignedPlayers: string[];
  attendance: {
    [key: string]: {
      status: string;
      updatedAt?: string;
      markedAt?: string;
      markedBy?: string;
    }
  };
}

export default function Training() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        if (!user?.username || !user?.academyId) return;

        setLoading(true);
        const response = await fetch(
          `/api/db/ams-sessions?academyId=${user.academyId}`,
          { credentials: 'include' }
        );

        if (!response.ok) throw new Error('Failed to fetch sessions');

        const result = await response.json();
        if (result.success) {
          setSessions(result.data);
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to load sessions",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast({
          title: "Error",
          description: "Failed to load sessions",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user]);

  const getAttendanceStatus = (session: Session): string => {
    if (!user?.username) return "Not marked";

    // Possible IDs to check in the attendance object
    const possibleIds = [
      user._id, // MongoDB ID
      user.username, // Username
      user.userId, // User ID
      '67ee678c34baa740e23e21c4', // Player document ID
      'player_qa4d9vdz1_1743677324992' // Player ID
    ].filter(Boolean); // Remove any undefined values

    // Check if attendance exists for any of the possible IDs
    for (const id of possibleIds) {
      if (session.attendance?.[id]) {
        return session.attendance[id].status;
      }
    }

    console.log('Session:', session._id, 'Player:', user.username, 
      'Attendance keys:', Object.keys(session.attendance || {}));
    
    return "Not marked";
  };

  const getSessionStatus = (session: Session): string => {
    const sessionStart = new Date(`${session.date}T${session.startTime}`);
    const sessionEnd = new Date(`${session.date}T${session.endTime}`);
    const now = new Date();

    if (now > sessionEnd) {
      return "Finished";
    } else if (now >= sessionStart && now <= sessionEnd) {
      return "On-going";
    } else {
      return "Upcoming";
    }
  };

  const filteredSessions = sessions.filter(session => {
    const sessionStatus = getSessionStatus(session);
    return filter === "All" || filter === sessionStatus;
  });

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Training Sessions</h1>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Finished">Finished</SelectItem>
              <SelectItem value="On-going">On-going</SelectItem>
              <SelectItem value="Upcoming">Upcoming</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-[#1a1f2b] border-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#85FFC4]">
                <TableRow>
                  <TableHead className="text-black">Session Name</TableHead>
                  <TableHead className="text-black">Date</TableHead>
                  <TableHead className="text-black">Time</TableHead>
                  <TableHead className="text-black">Coach</TableHead>
                  <TableHead className="text-black">Status</TableHead>
                  <TableHead className="text-black">Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">Loading sessions...</TableCell>
                  </TableRow>
                ) : filteredSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">No sessions found.</TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((session) => (
                    <TableRow key={session._id}>
                      <TableCell className="text-white">{session.name}</TableCell>
                      <TableCell className="text-white">{format(parseISO(session.date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="text-white">{`${session.startTime} - ${session.endTime}`}</TableCell>
                      <TableCell className="text-white">{session.coachNames.join(', ')}</TableCell>
                      <TableCell className="text-white">{getSessionStatus(session)}</TableCell>
                      <TableCell className="text-white">{getAttendanceStatus(session)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

