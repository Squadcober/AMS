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
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import Sidebar from "@/components/Sidebar"
import { TimePicker } from "@/components/ui/timepicker"
import { useAuth } from "@/contexts/AuthContext"

interface Match {
  id: string
  date: Date
  opponent: string
  venue: string
  players: string[]
  playerRatings: { [playerId: string]: number }
  tournamentName?: string
  duration?: number
  format?: string
  squadSize?: number
  gameplan?: string
  injuries?: string[]
  comments?: string
  team1: string
  team2: string
  team1Score?: number
  team2Score?: number
  winner?: string
  loser?: string
  gameStatus?: 'Not Started' | 'In Progress' | 'Completed'
  startTime: string
  endTime: string
  extraTime?: number
  status?: 'Not Started' | 'On-going' | 'Completed' | 'Finished'
  playerStats?: { [playerId: string]: PlayerMatchStats }
  academyId: string
}

interface PlayerMatchStats {
  matchPoints: {
    current: number;
    edited?: number;
  };
  goals?: number;
  assists?: number;
  cleanSheets?: number;
}

const LOCAL_STORAGE_KEY = "match-day-matches"

const getFormattedValue = (value: any): string => {
  if (typeof value === 'number') {
    return value.toFixed(1);
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num) ? num.toFixed(1) : '0.0';
  }
  return '0.0';
};

const ensureNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const isMatchFinished = (matchDate: Date) => {
  const now = new Date();
  const matchDateTime = new Date(matchDate);
  return matchDateTime < now;
};

const getPlayerCurrentStats = (playerId: string) => {
  try {
    const playerData = JSON.parse(localStorage.getItem('ams-player-data') || '[]');
    const player = playerData.find((p: any) => p.id.toString() === playerId);
    return {
      matchPoints: player?.attributes?.matchPoints || 0,
      goals: player?.attributes?.goals || 0,
      assists: player?.attributes?.assists || 0,
      cleanSheets: player?.attributes?.cleanSheets || 0
    };
  } catch (error) {
    console.error('Error getting player stats:', error);
    return { matchPoints: 0, goals: 0, assists: 0, cleanSheets: 0 };
  }
};

const calculateMatchStatus = (match: any) => {
  const now = new Date();
  const matchDate = new Date(match.date);
  
  if (!match.startTime || !match.endTime) {
    return match.status || 'Not Started';
  }

  const [startHour, startMinute] = match.startTime.split(':').map(Number);
  const [endHour, endMinute] = match.endTime.split(':').map(Number);
  
  const matchStart = new Date(matchDate);
  matchStart.setHours(startHour, startMinute, 0);
  
  const matchEnd = new Date(matchDate);
  matchEnd.setHours(endHour, endMinute, 0);

  if (now < matchStart) {
    return "Upcoming";
  } else if (now >= matchStart && now <= matchEnd) {
    return "On-going";
  } else {
    return "Finished";
  }
};

const debugMatch = (match: any) => {
  console.log('Match object:', {
    id: match.id,
    _id: match._id,
    date: match.date,
    status: match.status,
    team1: match.team1,
    team2: match.team2,
    startTime: match.startTime,
    endTime: match.endTime
  });
};

const debugPlayerData = (players: any[]) => {
  console.log('Available players:', players.map(p => ({
    id: p.id || p._id,
    name: p.name,
    academyId: p.academyId
  })));
};

const dialogStyles = {
  maxWidth: '95vw',
  width: '1600px',
};

export default function MatchDay() {
  const { players, updatePlayerAttributes, setPlayers } = usePlayers()
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [gamePlans, setGamePlans] = useState<string[]>([])
  const [newMatch, setNewMatch] = useState<Omit<Match, "id" | "playerRatings">>({
    date: new Date(),
    opponent: "",
    venue: "",
    players: [],
    tournamentName: "",
    duration: 90,
    format: "11v11",
    squadSize: 18,
    gameplan: "",
    injuries: [],
    comments: "",
    team1: "",
    team2: "",
    startTime: "",
    endTime: "",
    extraTime: 0,
    academyId: user?.academyId || ""
  })
  const [isGamePlanDialogOpen, setIsGamePlanDialogOpen] = useState(false)
  const [selectedGamePlan, setSelectedGamePlan] = useState<string | null>(null)
  const [activeLog, setActiveLog] = useState<"All" | "Finished" | "On-going" | "Upcoming">("All")
  const [viewDetailsMatchId, setViewDetailsMatchId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [playerMatchPoints, setPlayerMatchPoints] = useState<{
    [playerId: string]: {
      current: number;
      edited?: number;
    }
  }>({});
  const [playerSearchQuery, setPlayerSearchQuery] = useState<string>("");

  const [playerStats, setPlayerStats] = useState<{
    [playerId: string]: PlayerMatchStats;
  }>({});

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.academyId) return;
      
      try {
        const [matchesResponse, gameplansResponse, playersResponse] = await Promise.all([
          fetch(`/api/db/ams-match-day?academyId=${user.academyId}`),
          fetch(`/api/db/ams-gameplan?academyId=${user.academyId}`),
          fetch(`/api/db/ams-player-data?academyId=${user.academyId}`)
        ]);

        const [matchesData, gameplansData, playersData] = await Promise.all([
          matchesResponse.json(),
          gameplansResponse.json(),
          playersResponse.json()
        ]);

        console.log('Fetched data:', {
          matches: matchesData,
          players: playersData,
          gameplans: gameplansData
        });

        if (matchesData.success) {
          setMatches(matchesData.data);
        }

        if (gameplansData.success) {
          setGamePlans(gameplansData.data.map((gp: any) => gp.name));
        }

        if (playersData.success && Array.isArray(playersData.data)) {
          const formattedPlayers = playersData.data.map((player: any) => ({
            ...player,
            id: player._id || player.id,
            name: player.name || player.username || 'Unknown Player',
            academyId: player.academyId || user.academyId
          }));
          
          console.log('Setting players:', formattedPlayers.length);
          debugPlayerData(formattedPlayers);
          setPlayers(formattedPlayers);
        } else {
          console.error('Invalid player data format:', playersData);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [user?.academyId]);

  useEffect(() => {
    if (viewDetailsMatchId) {
      const match = matches.find(m => m.id === viewDetailsMatchId);
      if (match) {
        const currentPoints: { [playerId: string]: { current: number } } = {};
        match.players.forEach(playerId => {
          const playerData = JSON.parse(localStorage.getItem('ams-player-data') || '[]')
            .find((p: any) => p.id === playerId);
          currentPoints[playerId] = {
            current: playerData?.attributes?.matchPoints || 0
          };
        });
        setPlayerMatchPoints(currentPoints);
      }
    }
  }, [viewDetailsMatchId, matches]);

  useEffect(() => {
    if (viewDetailsMatchId) {
      const match = matches.find(m => m.id === viewDetailsMatchId);
      if (match) {
        const initialStats: { [key: string]: PlayerMatchStats } = {};
        match.players.forEach(playerId => {
          const currentStats = getPlayerCurrentStats(playerId);
          const matchStats = match.playerStats?.[playerId];
          
          initialStats[playerId] = {
            matchPoints: {
              current: matchStats?.matchPoints || currentStats.matchPoints,
            },
            goals: matchStats?.goals || 0,
            assists: matchStats?.assists || 0,
            cleanSheets: matchStats?.cleanSheets || 0
          };
        });
        
        setPlayerStats(initialStats);
      }
    }
  }, [viewDetailsMatchId, matches]);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        if (!user?.academyId) {
          console.log("No academyId available");
          return;
        }

        setIsLoading(true);
        console.log('Fetching matches for academy:', user.academyId);

        const response = await fetch(`/api/db/ams-match-day?academyId=${user.academyId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API Response:', result);

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch matches');
        }

        const transformedMatches = result.data.map((match: any) => ({
          ...match,
          id: match._id,
          date: new Date(match.date),
          players: match.players || [],
          playerRatings: match.playerRatings || {},
          startTime: match.startTime || '',
          endTime: match.endTime || '',
          status: calculateMatchStatus({
            ...match,
            date: new Date(match.date),
            startTime: match.startTime || '',
            endTime: match.endTime || ''
          })
        }));

        console.log('Transformed matches:', transformedMatches);
        setMatches(transformedMatches);

      } catch (error) {
        console.error('Error fetching matches:', error);
        toast({
          title: "Error",
          description: "Failed to load matches",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.academyId) {
      fetchMatches();
    }
  }, [user?.academyId]);

  const handleCreateMatch = async () => {
    try {
      const match = {
        ...newMatch,
        academyId: user?.academyId,
        createdAt: new Date(),
        playerRatings: {},
        status: 'Not Started'
      };

      const response = await fetch('/api/db/ams-match-day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(match)
      });

      if (!response.ok) throw new Error('Failed to create match');
      
      const result = await response.json();
      
      if (result.success) {
        setMatches(prev => [...prev, result.data]);
        setNewMatch({
          date: new Date(),
          opponent: "",
          venue: "",
          players: [],
          tournamentName: "",
          duration: 90,
          format: "11v11",
          squadSize: 18,
          gameplan: "",
          injuries: [],
          comments: "",
          team1: "",
          team2: "",
          startTime: "",
          endTime: "",
          extraTime: 0,
          academyId: user?.academyId || ""
        });

        toast({
          title: "Success",
          description: "Match created successfully",
        });
      }
    } catch (error) {
      console.error('Error creating match:', error);
      toast({
        title: "Error",
        description: "Failed to create match",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    try {
      const response = await fetch(`/api/db/ams-match-day/${matchId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete match');

      setMatches(prev => prev.filter(match => match.id !== matchId));
      
      toast({
        title: "Success",
        description: "Match deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting match:', error);
      toast({
        title: "Error",
        description: "Failed to delete match",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRating = (matchId: string, playerId: string, rating: number) => {
    setMatches(
      matches.map((match) => {
        if (match.id === matchId) {
          return {
            ...match,
            playerRatings: {
              ...match.playerRatings,
              [playerId]: rating,
            },
          }
        }
        return match
      }),
    )

    const player = players.find((p) => p.id.toString() === playerId)
    if (player) {
      updatePlayerAttributes(player.id.toString(), {
        attributes: {
          ...player.attributes,
          matchpoints: rating,
        },
      })
    }
  }

  const handleGamePlanClick = (gamePlan: string) => {
    setSelectedGamePlan(gamePlan)
    setIsGamePlanDialogOpen(true)
  }

  const handleViewDetails = (matchId: string) => {
    console.log('Viewing details for match:', matchId);
    setViewDetailsMatchId(matchId);
    setIsDialogOpen(true);
  };

  const handleUpdateScore = async (matchId: string, updates: any) => {
    try {
      console.log('Updating match:', matchId, 'with updates:', updates);
      
      // Changed from ${matchId} to ?matchId=${matchId} to match the API route structure
      const response = await fetch(`/api/db/ams-match-day?matchId=${matchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update score');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setMatches(prev => prev.map(match => 
          match.id === matchId ? { ...match, ...updates } : match
        ));

        toast({
          title: "Success",
          description: "Score updated successfully",
        });
      }
    } catch (error) {
      console.error('Error updating score:', error);
      toast({
        title: "Error",
        description: "Failed to update score",
        variant: "destructive",
      });
    }
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    if (!startTime) return "";
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  };

  const handleStartTimeChange = (time: string) => {
    setNewMatch(prev => ({
      ...prev,
      startTime: time,
      endTime: calculateEndTime(time, prev.duration || 90)
    }));
  };

  const handleExtraTimeChange = (matchId: string, extraMinutes: number) => {
    setMatches(prevMatches => {
      return prevMatches.map(match => {
        if (match.id === matchId) {
          const newEndTime = calculateEndTime(match.startTime, (match.duration || 90) + extraMinutes);
          return {
            ...match,
            extraTime: extraMinutes,
            endTime: newEndTime
          };
        }
        return match;
      });
    });
    const allMatches = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const newAllMatches = allMatches.map((match: Match) => {
      if (match.id === matchId) {
        const newEndTime = calculateEndTime(match.startTime, (match.duration || 90) + extraMinutes);
        return {
          ...match,
          extraTime: extraMinutes,
          endTime: newEndTime
        };
      }
      return match;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newAllMatches));
  };

  const handleMatchPointsChange = (playerId: string, value: number[]) => {
    setPlayerMatchPoints(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        edited: value[0]
      }
    }));
  };

  const handleSaveMatchPoints = async (matchId: string) => {
    try {
      const updates = [];
      
      for (const [playerId, points] of Object.entries(playerMatchPoints)) {
        if (points.edited === undefined) continue;

        updates.push(
          fetch(`/api/db/ams-player-data/${playerId}/match-points`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchId,
              points: points.edited,
              previousPoints: points.current
            })
          })
        );
      }

      await Promise.all(updates);

      setPlayerMatchPoints(prev => {
        const updated: typeof prev = {};
        Object.entries(prev).forEach(([playerId, points]) => {
          updated[playerId] = {
            current: points.edited ?? points.current
          };
        });
        return updated;
      });

      toast({
        title: "Success",
        description: "Match points saved successfully",
        variant: "default",
      });

    } catch (error) {
      console.error('Error saving match points:', error);
      toast({
        title: "Error",
        description: "Failed to save match points",
        variant: "destructive",
      });
    }
  };

  const handleStatsChange = (
    playerId: string, 
    stat: keyof PlayerMatchStats, 
    value: number | { current: number; edited: number }
  ) => {
    setPlayerStats(prev => {
      const existingStats = prev[playerId] || {
        matchPoints: { current: 0 },
        goals: 0,
        assists: 0,
        cleanSheets: 0
      };

      if (stat === 'matchPoints' && typeof value === 'object') {
        return {
          ...prev,
          [playerId]: {
            ...existingStats,
            matchPoints: {
              current: value.current,
              edited: value.edited
            }
          }
        };
      }

      if (typeof value === 'number') {
        return {
          ...prev,
          [playerId]: {
            ...existingStats,
            [stat]: value
          }
        };
      }

      return prev;
    });
  };

  const handleSaveMatchStats = async (matchId: string) => {
    try {
      if (!matchId) {
        console.error('No matchId provided to handleSaveMatchStats');
        throw new Error('Match ID is required');
      }
  
      console.log('Saving stats for match:', matchId);
  
      const updatedStats = Object.entries(playerStats).reduce((acc, [playerId, stats]) => {
        acc[playerId] = {
          matchPoints: stats.matchPoints,
          goals: stats.goals || 0,
          assists: stats.assists || 0,
          cleanSheets: stats.cleanSheets || 0
        };
        return acc;
      }, {} as any);
  
      // First update the match stats
      const response = await fetch(`/api/db/ams-match-day?matchId=${matchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          playerStats: updatedStats,
          type: 'stats-update'  // Add a type to differentiate this update
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save stats');
      }
  
      const result = await response.json();
      
      if (result.success) {
        // Update local state with new stats
        setMatches(prev => prev.map(match => 
          match.id === matchId ? { ...match, playerStats: updatedStats } : match
        ));
  
        // Update individual player stats
        await Promise.all(
          Object.entries(playerStats).map(async ([playerId, stats]) => {
            const playerResponse = await fetch(`/api/db/ams-player-data/${playerId}/stats`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                matchId,
                stats
              })
            });
  
            if (!playerResponse.ok) {
              throw new Error(`Failed to update stats for player ${playerId}`);
            }
          })
        );
  
        toast({
          title: "Success",
          description: "Stats saved successfully",
        });
  
        // Refresh match data
        if (user?.academyId) {
          const matchResponse = await fetch(`/api/db/ams-match-day?academyId=${user.academyId}`);
          const matchData = await matchResponse.json();
          if (matchData.success) {
            setMatches(matchData.data);
          }
        }
      }
    } catch (error) {
      console.error('Error saving stats:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save stats",
        variant: "destructive",
      });
    }
  };

  const renderMatchTable = (status: "All" | "Finished" | "On-going" | "Upcoming") => {
    if (isLoading) {
      return <div>Loading matches...</div>;
    }

    console.log('Current matches:', matches);
    console.log('Current status filter:', status);

    const filteredMatches = matches.filter((match) => {
      if (!match) return false;
      
      debugMatch(match);
      
      if (status === "All") return true;
      
      const matchStatus = match.status || calculateMatchStatus({
        ...match,
        date: new Date(match.date),
        startTime: match.startTime || '',
        endTime: match.endTime || ''
      });
      
      console.log(`Match ${match.id} status:`, matchStatus);
      return matchStatus === status;
    });

    console.log('Filtered matches:', filteredMatches);

    if (filteredMatches.length === 0) {
      return (
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold">No Matches Found</h3>
          <p className="text-muted-foreground">
            No {status.toLowerCase()} matches available
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Match Date</TableHead>
            <TableHead>Opponent</TableHead>
            <TableHead>Venue</TableHead>
            <TableHead>Game Plan</TableHead>
            <TableHead>Actions</TableHead>
            <TableHead>Team 1</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Team 2</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>End Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMatches.map((match) => {
            console.log('Processing match:', match.id, 'with players:', match.players);
            return (
              <TableRow key={match.id}>
                <TableCell>{format(new Date(match.date), "PP")}</TableCell>
                <TableCell>{match.opponent}</TableCell>
                <TableCell>{match.venue}</TableCell>
                <TableCell>
                  <Button variant="link" onClick={() => handleGamePlanClick(match.gameplan || "")}>
                    View Game Plan
                  </Button>
                </TableCell>
                <TableCell>
                  <Button variant="default" onClick={() => handleViewDetails(match.id)}>
                    View Details
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDeleteMatch(match.id)}
                    className="ml-2"
                  >
                    Delete Match
                  </Button>
                </TableCell>
                <TableCell>{match.team1 || 'Our Team'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      className="w-16"
                      value={match.team1Score ?? ''}
                      onChange={(e) => handleUpdateScore(match.id, {
                        team1Score: parseInt(e.target.value) || 0
                      })}
                    />
                    <span className="font-bold">-</span>
                    <Input
                      type="number"
                      min="0"
                      className="w-16"
                      value={match.team2Score ?? ''}
                      onChange={(e) => handleUpdateScore(match.id, {
                        team2Score: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </TableCell>
                <TableCell>{match.team2 || match.opponent}</TableCell>
                <TableCell>
                  {(match.status === 'Completed' || match.status === 'Finished') ? (
                    match.team1Score === match.team2Score ? (
                      <Badge variant="secondary" className="bg-gray-500 text-white">
                        Match Tied
                      </Badge>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {match.winner && (
                          <Badge variant="default" className="bg-green-600 text-white hover:bg-green-700">
                            Winner: {match.winner}
                          </Badge>
                        )}
                        {match.loser && (
                          <Badge variant="default" className="bg-red-600 text-white hover:bg-red-700">
                            Loser: {match.loser}
                          </Badge>
                        )}
                      </div>
                    )
                  ) : (
                    <Badge variant="outline" className="border-gray-400 text-gray-400">
                      {match.status || 'Upcoming'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{match.startTime}</TableCell>
                <TableCell>{match.endTime}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const renderMatchDetails = () => {
    const match = matches.find(m => m.id === viewDetailsMatchId);
    if (!match) {
      console.log('Match not found:', viewDetailsMatchId);
      console.log('Available matches:', matches.map(m => ({ id: m.id })));
      return null;
    }

    console.log('Found match:', match);
    
    const matchPlayers = match.players.map(playerId => {
      const player = players.find(p => p.id.toString() === playerId);
      if (!player) return null;

      const playerMatchStats = match.playerStats?.[playerId];
      const latestMatchPoints = playerMatchStats?.matchPoints?.current || 0;

      if (!playerStats[playerId]) {
        setPlayerStats(prev => ({
          ...prev,
          [playerId]: {
            matchPoints: {
              current: latestMatchPoints,
              edited: undefined
            },
            goals: playerMatchStats?.goals || 0,
            assists: playerMatchStats?.assists || 0,
            cleanSheets: playerMatchStats?.cleanSheets || 0
          }
        }));
      }

      return {
        ...player,
        stats: playerStats[player.id.toString()] || {
          matchPoints: { 
            current: latestMatchPoints,
            edited: undefined
          },
          goals: playerMatchStats?.goals || 0,
          assists: playerMatchStats?.assists || 0,
          cleanSheets: playerMatchStats?.cleanSheets || 0
        }
      };
    }).filter(Boolean);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-4">Match Information</h3>
            <div className="space-y-2">
              <p><strong>Date:</strong> {format(new Date(match.date), "PP")}</p>
              <p><strong>Opponent:</strong> {match.opponent}</p>
              <p><strong>Venue:</strong> {match.venue}</p>
              <p><strong>Tournament:</strong> {match.tournamentName}</p>
              <p><strong>Duration:</strong> {match.duration} minutes</p>
              <p><strong>Format:</strong> {match.format}</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
            <div className="space-y-2">
              <p><strong>Squad Size:</strong> {match.squadSize}</p>
              <p><strong>Players Selected:</strong> {matchPlayers.length}</p>
              <p><strong>Injuries:</strong> {match.injuries?.join(", ") || "None"}</p>
              <p><strong>Comments:</strong> {match.comments || "None"}</p>
              <Button variant="link" onClick={() => handleGamePlanClick(match.gameplan || "")}>
                View Game Plan
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Player Statistics</h3>
            <Input
              placeholder="Search players..."
              value={playerSearchQuery}
              onChange={(e) => setPlayerSearchQuery(e.target.value)}
              className="w-[200px]"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Previous Points</TableHead>
                <TableHead>Match Points</TableHead>
                <TableHead>Goals</TableHead>
                <TableHead>Assists</TableHead>
                <TableHead>Clean Sheets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchPlayers
                .filter((player): player is NonNullable<typeof player> => 
                  player?.name?.toLowerCase().includes(playerSearchQuery.toLowerCase()) ?? false
                )
                .map(player => {
                  const stats = playerStats[player.id.toString()] || {
                    matchPoints: { current: 0 },
                    goals: 0,
                    assists: 0,
                    cleanSheets: 0
                  };

                  const latestMatchStats = match.playerStats?.[player.id.toString()];
                  const currentPoints = latestMatchStats?.matchPoints?.current || 0;

                  return (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell>{player.attributes?.position || 'N/A'}</TableCell>
                      <TableCell>{getFormattedValue(currentPoints)}</TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">
                              {stats.matchPoints.edited !== undefined ? (
                                <>
                                  <span>{getFormattedValue(ensureNumber(currentPoints))}</span>
                                  <span className="text-yellow-500 ml-2">
                                    → {getFormattedValue(stats.matchPoints.edited)}
                                  </span>
                                </>
                              ) : (
                                getFormattedValue(ensureNumber(currentPoints))
                              )}
                            </span>
                          </div>
                          <Slider
                            value={[stats.matchPoints.edited ?? ensureNumber(currentPoints)]}
                            min={0}
                            max={10}
                            step={0.1}
                            onValueChange={([value]) => handleStatsChange(player.id.toString(), 'matchPoints', {
                              current: ensureNumber(currentPoints),
                              edited: value
                            })}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min={0} 
                          value={stats.goals || 0}
                          onChange={(e) => handleStatsChange(player.id.toString(), 'goals', parseInt(e.target.value) || 0)}
                          className="w-16" 
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min={0} 
                          value={stats.assists || 0}
                          onChange={(e) => handleStatsChange(player.id.toString(), 'assists', parseInt(e.target.value) || 0)}
                          className="w-16" 
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          min={0} 
                          value={stats.cleanSheets || 0}
                          onChange={(e) => handleStatsChange(player.id.toString(), 'cleanSheets', parseInt(e.target.value) || 0)}
                          className="w-16" 
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>

          <Button 
            onClick={() => handleSaveMatchStats(match.id)}
            className="mt-4"
            disabled={Object.keys(playerStats).length === 0}
          >
            Save All Stats
          </Button>
        </div>
      </div>
    );
  };

  const renderNewMatchForm = () => (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Calendar
              mode="single"
              selected={newMatch.date}
              onSelect={(date) => date && setNewMatch({ ...newMatch, date })} 
              className="rounded-md border"
            />
          </div>
          <div>
            <Label>Venue</Label>
            <Input
              value={newMatch.venue}
              onChange={(e) => setNewMatch({ ...newMatch, venue: e.target.value })}
            />
          </div>
          <div>
            <Label>Tournament</Label>
            <Input
              value={newMatch.tournamentName}
              onChange={(e) => setNewMatch({ ...newMatch, tournamentName: e.target.value })} 
            />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              value={newMatch.duration}
              onChange={(e) => {
                const duration = Number.parseInt(e.target.value);
                setNewMatch(prev => ({
                  ...prev,
                  duration,
                  endTime: calculateEndTime(prev.startTime, duration)
                }));
              }}
            />
          </div>
          <div>
            <Label>Format</Label>
            <Select
              value={newMatch.format}
              onValueChange={(value) => setNewMatch({ ...newMatch, format: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {[
                  { value: "11v11", label: "11v11" },
                  { value: "7v7", label: "7v7" },
                  { value: "5v5", label: "5v5" }
                ].map((format) => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Squad Size</Label>
            <Input
              type="number"
              value={newMatch.squadSize}
              onChange={(e) => setNewMatch({ ...newMatch, squadSize: Number.parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label>Gameplan</Label>
            <Select
              value={newMatch.gameplan}
              onValueChange={(value) => setNewMatch({ ...newMatch, gameplan: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gameplan" />
              </SelectTrigger>
              <SelectContent>
                {gamePlans.map((gamePlan) => (
                  <SelectItem key={gamePlan} value={gamePlan} onClick={() => handleGamePlanClick(gamePlan)}>
                    {gamePlan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div>
        <Label>Players</Label>
        <div className="grid grid-cols-2 gap-2 border rounded-md p-4 max-h-[200px] overflow-y-auto">
          {players
            .filter((player) => player.academyId === user?.academyId)
            .map((player) => (
              <div key={player.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newMatch.players.includes(player.id.toString())}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setNewMatch({ ...newMatch, players: [...newMatch.players, player.id.toString()] })
                    } else {
                      setNewMatch({
                        ...newMatch,
                        players: newMatch.players.filter((id) => id !== player.id.toString()),
                      })
                    }
                  }}
                />
                <span>{player.name}</span>
              </div>
            ))}
        </div>
      </div>
      <div>
        <Label>Injuries (comma-separated)</Label>
        <Input
          value={newMatch.injuries?.join(", ") || ""}
          onChange={(e) =>
            setNewMatch({ ...newMatch, injuries: e.target.value.split(",").map((s) => s.trim()) })
          }
          placeholder="Enter injuries separated by commas"
        />
      </div>
      <div>
        <Label>Comments</Label>
        <textarea
          className="w-full p-2 border rounded-md bg-blue-900 text-white"
          value={newMatch.comments}
          onChange={(e) => setNewMatch({ ...newMatch, comments: e.target.value })}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Team 1</Label>
          <Input
            value={newMatch.team1}
            onChange={(e) => setNewMatch({ ...newMatch, team1: e.target.value })}
            placeholder="Our Team"
          />
        </div>
        <div>
          <Label>Team 2</Label>
          <Input
            value={newMatch.team2 || newMatch.opponent}
            onChange={(e) => setNewMatch({ ...newMatch, team2: e.target.value, opponent: e.target.value })}
            placeholder="Opponent Team"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Time</Label>
          <TimePicker
            id="start-time-picker"
            value={newMatch.startTime}
            onChange={handleStartTimeChange}
            className="w-full bg-blue-900 text-white"
          />
        </div>
        <div>
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            value={newMatch.duration}
            onChange={(e) => {
              const duration = Number.parseInt(e.target.value);
              setNewMatch(prev => ({
                ...prev,
                duration,
                endTime: calculateEndTime(prev.startTime, duration)
              }));
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 space-y-6 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Match Day</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Create New Match</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Create New Match</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[calc(90vh-120px)] pr-4">
                <div className="grid gap-6 py-4">
                  {renderNewMatchForm()}
                </div>
              </ScrollArea>
              <div className="flex justify-end pt-4">
                <Button onClick={handleCreateMatch}>Create Match</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex justify-between items-center">
          <ToggleGroup
            type="single"
            value={activeLog}
            onValueChange={(value) => setActiveLog(value as "All" | "Finished" | "On-going" | "Upcoming")}
            className="justify-center"
          >
            <ToggleGroupItem value="All">All</ToggleGroupItem>
            <ToggleGroupItem value="Finished">Finished</ToggleGroupItem>
            <ToggleGroupItem value="On-going">On-going</ToggleGroupItem>
            <ToggleGroupItem value="Upcoming">Upcoming</ToggleGroupItem>
          </ToggleGroup>
          <Input
            placeholder="Search player"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {activeLog === "All" && renderMatchTable("All")}
        {activeLog === "Finished" && renderMatchTable("Finished")}
        {activeLog === "On-going" && renderMatchTable("On-going")}
        {activeLog === "Upcoming" && renderMatchTable("Upcoming")}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent style={dialogStyles} className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Match Details</DialogTitle>
            </DialogHeader>
            {viewDetailsMatchId && (
              <div className="space-y-6">
                {renderMatchDetails()}
              </div>
            )}
            <DialogFooter>
              <Button variant="default" onClick={() => setIsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isGamePlanDialogOpen} onOpenChange={setIsGamePlanDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Game Plan: {selectedGamePlan}</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <p>Details for game plan: {selectedGamePlan}</p>
            </div>
            <div className="flex justify-end pt-4">
              <Button variant="default" onClick={() => setIsGamePlanDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

