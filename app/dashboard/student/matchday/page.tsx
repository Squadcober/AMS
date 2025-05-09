"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CustomTooltip } from "@/components/custom-tooltip"
import { usePlayers } from "@/contexts/PlayerContext"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import Sidebar from "@/components/Sidebar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"

interface Match {
  _id: string
  id: string
  date: string
  opponent: string
  venue: string
  status: string
  academyId: string
  name: string
  startTime: string
  endTime: string
  team1Score?: number
  team2Score?: number
  playerStats?: Record<string, { playerName: string; goals?: number; assists?: number }>
}

export default function MatchDay() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [viewDetailsMatchId, setViewDetailsMatchId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("")

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        if (!user?.academyId) {
          throw new Error('Academy ID not found');
        }

        const response = await fetch(`/api/db/ams-match-day?academyId=${user.academyId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch matches');
        }

        const result = await response.json();
        console.log('Raw matches data:', result); // Debug log

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch matches');
        }

        // Process and format the matches data
        const formattedMatches = (result.data || []).map((match: any) => {
          const matchDate = new Date(match.date);
          const status = calculateMatchStatus(matchDate, match.status);

          return {
            ...match,
            id: match._id,
            date: matchDate.toISOString(),
            opponent: match.opponent || 'TBD',
            venue: match.venue || 'TBD',
            status: status,
            name: match.name || `Match vs ${match.opponent || 'TBD'}`,
            startTime: match.startTime || '00:00',
            endTime: match.endTime || '00:00',
            team1Score: match.team1Score || 0,
            team2Score: match.team2Score || 0,
          };
        });

        console.log('Formatted matches:', formattedMatches);
        setMatches(formattedMatches);
        setError("");
      } catch (error) {
        console.error('Error fetching matches:', error);
        setError(error instanceof Error ? error.message : 'Failed to load matches');
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.academyId) {
      fetchMatches();
    }
  }, [user?.academyId]);

  const calculateMatchStatus = (matchDate: Date, currentStatus?: string) => {
    const now = new Date();
    if (currentStatus) return currentStatus;

    if (matchDate < now) {
      return "Finished";
    } else if (
      matchDate.getDate() === now.getDate() &&
      matchDate.getMonth() === now.getMonth() &&
      matchDate.getFullYear() === now.getFullYear()
    ) {
      return "On-going";
    }
    return "Upcoming";
  };

  const renderMatchTable = () => {
    const filteredMatches = matches.filter(match => {
      return searchTerm
        ? match.opponent.toLowerCase().includes(searchTerm.toLowerCase()) ||
          match.venue.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
    });

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Match</TableHead>
            <TableHead>Venue</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMatches.map((match) => (
            <TableRow key={match.id}>
              <TableCell>{format(new Date(match.date), "PP")}</TableCell>
              <TableCell>{`${match.startTime} - ${match.endTime}`}</TableCell>
              <TableCell>{match.name}</TableCell>
              <TableCell>{match.venue}</TableCell>
              <TableCell>
                <Badge variant={
                  match.status === "Upcoming" ? "default" :
                  match.status === "On-going" ? "success" :
                  "secondary"
                }>
                  {match.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  onClick={() => setViewDetailsMatchId(match.id)}
                  className="text-xs"
                >
                  View Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderMatchDetails = (match: Match) => {
    if (!match) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Date" value={format(new Date(match.date), "PPP")} />
          <InfoField label="Time" value={`${match.startTime} - ${match.endTime}`} />
          <InfoField label="Venue" value={match.venue} />
          <InfoField label="Status" value={match.status} />
        </div>

        <div className="mt-6 bg-secondary/10 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-center">Match Details</h3>
          <div className="flex justify-center items-center space-x-8">
            <div className="text-center">
              <p className="text-lg font-medium">Home Team</p>
              <p className="text-4xl font-bold">{match.team1Score || 0}</p>
            </div>
            <div className="text-2xl font-bold">vs</div>
            <div className="text-center">
              <p className="text-lg font-medium">{match.opponent}</p>
              <p className="text-4xl font-bold">{match.team2Score || 0}</p>
            </div>
          </div>
        </div>

        {match.playerStats && (
          <div className="mt-6">
            <h3 className="text-xl font-bold mb-4">Player Statistics</h3>
            <div className="space-y-2">
              {Object.entries(match.playerStats).map(([playerId, stats]) => (
                <div key={playerId} className="flex justify-between items-center p-3 bg-secondary/10 rounded-lg">
                  <div>
                    <span className="font-medium">{stats.playerName}</span>
                    <div className="text-sm text-muted-foreground">
                      Goals: {stats.goals || 0} | Assists: {stats.assists || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const InfoField = ({ label, value }: { label: string, value: string }) => (
    <div>
      <Label>{label}</Label>
      <p className="text-lg">{value}</p>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col space-y-6 overflow-auto">
        <div className="space-y-6 p-4">
          <h1 className="text-3xl font-bold text-white">Match Day</h1>

          <Input
            placeholder="Search matches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />

          {loading ? (
            <p>Loading matches...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <div>{renderMatchTable()}</div>
          )}

          {viewDetailsMatchId && renderMatchDetails(matches.find(m => m.id === viewDetailsMatchId)!)}

          <Dialog>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Match Details</DialogTitle>
              </DialogHeader>
              {viewDetailsMatchId && renderMatchDetails(matches.find(m => m.id === viewDetailsMatchId)!)}
              <DialogFooter>
                <Button variant="default" onClick={() => setViewDetailsMatchId(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

