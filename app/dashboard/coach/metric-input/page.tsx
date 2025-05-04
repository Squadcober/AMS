"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePlayers } from "@/contexts/PlayerContext"
import { CustomTooltip } from "@/components/custom-tooltip"
import Sidebar from "@/components/Sidebar"
import { Slider } from "@/components/ui/slider"
import { useAuth } from "@/contexts/AuthContext" // Add this import
import { useSearchParams } from 'next/navigation'

export default function MetricInput() {
  const { toast } = useToast()
  const { players, updatePlayerAttributes } = usePlayers()
  const { user } = useAuth() // Add this line
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [editedData, setEditedData] = useState({
    attributes: {
      pace: "",
      shooting: "",
      passing: "",
      positioning: "",
      stamina: "",
      ballControl: "",
      crossing: "",
      trainingPoints: "",
      matchPoints: "",
    },
    matchStats: {
      goalsScored: "",
      assists: "",
      cleanSheets: "",
    },
    trainingStats: {
      sessionsAttended: "",
      averagePerformance: "",
    },
    playingStyle: "",
    coachNotes: "",
  })

  const mainAttributes = [
    { key: "shooting", label: "Shooting" },
    { key: "pace", label: "Pace" },
    { key: "positioning", label: "Positioning" },
    { key: "passing", label: "Passing" },
    { key: "ballControl", label: "Ball Control" },
    { key: "crossing", label: "Crossing" },
  ]

  const otherAttributes = [
    { key: "trainingPoints", label: "Training Points" },
    { key: "matchPoints", label: "Match Points" },
  ]

  const handleAttributeChange = (key: string, value: number) => {
    setEditedData((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value },
    }))
  }

  const handleMatchStatsChange = (stat: string, value: number) => {
    setEditedData((prev) => ({
      ...prev,
      matchStats: { ...prev.matchStats, [stat]: value },
    }))
  }

  const handleTrainingStatsChange = (stat: string, value: number) => {
    setEditedData((prev) => ({
      ...prev,
      trainingStats: { ...prev.trainingStats, [stat]: Math.min(value, 10) },
    }))
  }

  const [playerSearchQuery, setPlayerSearchQuery] = useState("")
  const [selectedSessionId, setSelectedSessionId] = useState<string>("")
  const [selectedMatchId, setSelectedMatchId] = useState<string>("")
  const [availableSessions, setAvailableSessions] = useState<any[]>([])
  const [availableMatches, setAvailableMatches] = useState<any[]>([])
  const searchParams = useSearchParams()
  const [filteredPlayersList, setFilteredPlayersList] = useState<any[]>([])

  const isSessionFinished = (session: any) => {
    const now = new Date();
    const sessionDate = new Date(session.date);
    const [endHour, endMinute] = session.endTime.split(':').map(Number);
    
    const sessionEnd = new Date(sessionDate);
    sessionEnd.setHours(endHour, endMinute, 0);

    return now > sessionEnd;
  };

  useEffect(() => {
    if (selectedPlayerId && user?.academyId) {
      // Load sessions where this player is assigned
      const allSessions = JSON.parse(localStorage.getItem('ams-sessions') || '[]');
      const playerSessions = allSessions.filter((session: any) => {
        // Check if player is assigned and session belongs to academy
        const isAssigned = session.assignedPlayers.includes(selectedPlayerId);
        const isCorrectAcademy = session.academyId === user.academyId;
        
        // Check if session has ended based on date and time
        const isFinished = isSessionFinished(session);
        
        return isAssigned && isCorrectAcademy && isFinished;
      }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAvailableSessions(playerSessions);

      // Similar logic for matches
      const allMatches = JSON.parse(localStorage.getItem('ams-matches') || '[]');
      const playerMatches = allMatches.filter((match: any) => {
        const isAssigned = match.players.includes(selectedPlayerId);
        const isCorrectAcademy = match.academyId === user.academyId;
        const isFinished = isSessionFinished(match); // Using same logic for matches

        return isAssigned && isCorrectAcademy && isFinished;
      }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAvailableMatches(playerMatches);
    }
  }, [selectedPlayerId, user?.academyId])

  useEffect(() => {
    // Filter players based on search query and academy
    const filtered = players.filter(player => 
      player.academyId === user?.academyId &&
      (player.name.toLowerCase().includes(playerSearchQuery.toLowerCase()) ||
       player.id.toString().toLowerCase().includes(playerSearchQuery.toLowerCase()))
    );
    setFilteredPlayersList(filtered);
  }, [players, playerSearchQuery, user?.academyId]);

  const handleSaveMetrics = () => {
    try {
      if (!selectedPlayerId) {
        toast({
          title: "Error",
          description: "Please select a player",
          variant: "destructive",
        });
        return;
      }

      const allPlayerData = JSON.parse(localStorage.getItem('ams-player-data') || '[]');
      const playerIndex = allPlayerData.findIndex((p: any) => 
        p.id.toString() === selectedPlayerId.toString()
      );

      if (playerIndex === -1) {
        toast({
          title: "Error",
          description: "Player not found",
          variant: "destructive",
        });
        return;
      }

      // Create base performance entry
      const baseEntry = {
        date: new Date().toISOString(),
        type: selectedSessionId ? 'session' : selectedMatchId ? 'match' : 'general',
      }

      // Create performance entry based on type
      let performanceEntry
      if (selectedSessionId) {
        // Session metrics
        const sessionAttrs = {
          shooting: Number(editedData.attributes.shooting) || 0,
          pace: Number(editedData.attributes.pace) || 0,
          positioning: Number(editedData.attributes.positioning) || 0,
          passing: Number(editedData.attributes.passing) || 0,
          ballControl: Number(editedData.attributes.ballControl) || 0,
          crossing: Number(editedData.attributes.crossing) || 0,
        }
        
        performanceEntry = {
          ...baseEntry,
          sessionId: selectedSessionId,
          attributes: sessionAttrs,
          overall: Math.round(Object.values(sessionAttrs).reduce((sum, val) => sum + val, 0) / 6)
        }
      } else if (selectedMatchId) {
        // Match metrics
        performanceEntry = {
          ...baseEntry,
          matchId: selectedMatchId,
          matchStats: {
            goalsScored: Number(editedData.matchStats.goalsScored) || 0,
            assists: Number(editedData.matchStats.assists) || 0,
            matchPoints: Number(editedData.attributes.matchPoints) || 0
          }
        }
      }

      // Update player's performance history
      if (!allPlayerData[playerIndex].performanceHistory) {
        allPlayerData[playerIndex].performanceHistory = []
      }
      
      if (performanceEntry) {
        allPlayerData[playerIndex].performanceHistory.push(performanceEntry)
      }

      // Update base attributes and other data
      allPlayerData[playerIndex] = {
        ...allPlayerData[playerIndex],
        attributes: {
          ...allPlayerData[playerIndex].attributes,
          ...editedData.attributes,
        },
        playingStyle: editedData.playingStyle,
        coachNotes: editedData.coachNotes,
      }

      // Save back to localStorage
      localStorage.setItem('ams-player-data', JSON.stringify(allPlayerData))

      toast({
        title: "Success",
        description: "Player data updated successfully",
        variant: "default",
      })

      // Update sessions if needed
      if (selectedSessionId) {
        const allSessions = JSON.parse(localStorage.getItem('ams-sessions') || '[]')
        const sessionIndex = allSessions.findIndex((s: any) => s.id.toString() === selectedSessionId)
        if (sessionIndex !== -1) {
          if (!allSessions[sessionIndex].playerMetrics) {
            allSessions[sessionIndex].playerMetrics = {}
          }
          allSessions[sessionIndex].playerMetrics[selectedPlayerId] = {
            ...editedData.attributes,
            sessionRating: performanceEntry.overall
          }
          localStorage.setItem('ams-sessions', JSON.stringify(allSessions))
        }
      }

    } catch (error) {
      console.error('Error saving metrics:', error);
      toast({
        title: "Error",
        description: "Failed to save metrics. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMetricChange = (metric: keyof typeof editedData.attributes, value: string) => {
    // Convert to number and clamp between 0 and 10
    const numericValue = Math.min(Math.max(Number(value) || 0, 0), 10);
    
    setEditedData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [metric]: numericValue.toString()
      }
    }));
  };

  const selectedPlayerData = useMemo(() => {
    return players.find((p) => 
      p.id.toString() === selectedPlayerId || 
      p.id.toString() === selectedPlayerId.toString()
    );
  }, [players, selectedPlayerId, refreshKey]);

  useEffect(() => {
    if (selectedPlayerData) {
      setEditedData({
        attributes: {
          pace: selectedPlayerData.attributes?.pace?.toString() || "",
          shooting: selectedPlayerData.attributes?.shooting?.toString() || "",
          passing: selectedPlayerData.attributes?.passing?.toString() || "",
          positioning: selectedPlayerData.attributes?.positioning?.toString() || "",
          ballControl: selectedPlayerData.attributes?.ballControl?.toString() || "",
          crossing: selectedPlayerData.attributes?.crossing?.toString() || "",
          trainingPoints: selectedPlayerData.attributes?.trainingPoints?.toString() || "",
          matchPoints: selectedPlayerData.attributes?.matchpoints?.toString() || "",
        },
        matchStats: {
          goalsScored: selectedPlayerData.matchStats?.goalsScored?.toString() || "",
          assists: selectedPlayerData.matchStats?.assists?.toString() || "",
          cleanSheets: selectedPlayerData.matchStats?.cleanSheets?.toString() || "",
        },
        trainingStats: {
          sessionsAttended: selectedPlayerData.trainingStats?.sessionsAttended?.toString() || "",
          averagePerformance: selectedPlayerData.trainingStats?.averagePerformance?.toString() || "",
        },
        playingStyle: selectedPlayerData.playingStyle || "",
        coachNotes: selectedPlayerData.coachNotes || "",
      });
    }
  }, [selectedPlayerData, refreshKey]);

  if (!players || players.length === 0) {
    return <div>No players available. Please add players first.</div>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 p-6 overflow-auto">
        <div className="space-y-6">
          <CustomTooltip content="Update player metrics and provide feedback">
            <h1 className="text-3xl font-bold text-white">Metric Input</h1>
          </CustomTooltip>

          <Card>
            <CardHeader>
              <CardTitle>Enter Player Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Updated Player search and selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Player</Label>
                  <Select 
                    value={selectedPlayerId || "default"} 
                    onValueChange={(value) => {
                      if (value !== "default") {
                        setSelectedPlayerId(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a player" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search players..."
                          value={playerSearchQuery}
                          onChange={(e) => setPlayerSearchQuery(e.target.value)}
                          className="mb-2"
                        />
                      </div>
                      <SelectItem value="default" disabled>
                        Select a player
                      </SelectItem>
                      {filteredPlayersList.length > 0 ? (
                        filteredPlayersList.map((player) => (
                          <SelectItem key={player.id} value={player.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                                <img
                                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/player-photos/${player.id}`}
                                  alt={player.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "/default-avatar.png";
                                  }}
                                />
                              </div>
                              <div>
                                <div className="font-medium">{player.name}</div>
                                <div className="text-sm text-gray-500">{player.position}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-results" disabled>
                          {playerSearchQuery ? "No players found" : "Type to search players"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedPlayerId && (
                <>
                  {/* Update the Session/Match selection section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Session</Label>
                      <Select 
                        value={selectedSessionId || "default"} 
                        onValueChange={(value) => {
                          if (value !== "default") {
                            setSelectedSessionId(value);
                            setSelectedMatchId("");
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            availableSessions.length === 0 
                              ? "No finished sessions available" 
                              : "Select a session"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default" disabled>
                            Select a session
                          </SelectItem>
                          {availableSessions.length > 0 ? (
                            availableSessions.map((session) => (
                              <SelectItem key={session.id} value={session.id.toString()}>
                                {session.name} ({new Date(session.date).toLocaleDateString()} {session.endTime})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-sessions" disabled>
                              No finished sessions available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Select Match</Label>
                      <Select 
                        value={selectedMatchId || "default"} 
                        onValueChange={(value) => {
                          if (value !== "default") {
                            setSelectedMatchId(value);
                            setSelectedSessionId("");
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            availableMatches.length === 0 
                              ? "No finished matches available" 
                              : "Select a match"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default" disabled>
                            Select a match
                          </SelectItem>
                          {availableMatches.length > 0 ? (
                            availableMatches.map((match) => (
                              <SelectItem key={match.id} value={match.id.toString()}>
                                {match.name} ({new Date(match.date).toLocaleDateString()})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-matches" disabled>
                              No finished matches available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Main 6 attributes with sliders */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Main Attributes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        {mainAttributes.map(({ key, label }) => (
                          <div key={key} className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label htmlFor={key}>{label}</Label>
                              <span className="text-sm text-muted-foreground">
                                {editedData.attributes[key as keyof typeof editedData.attributes] || '0'}/10
                              </span>
                            </div>
                            <Slider
                              id={key}
                              min={0}
                              max={10}
                              step={0.1}
                              value={[Number(editedData.attributes[key as keyof typeof editedData.attributes]) || 0]}
                              onValueChange={([value]) => handleAttributeChange(key, value)}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Other attributes with number inputs */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Other Attributes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {otherAttributes.map(({ key, label }) => (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={key}>
                              {label} (Current: {selectedPlayerData.attributes[key as keyof typeof selectedPlayerData.attributes] || 0}/10)
                            </Label>
                            <Input
                              id={key}
                              type="number"
                              min="0"
                              max="10"
                              value={editedData.attributes[key as keyof typeof editedData.attributes] || ""}
                              onChange={(e) => handleAttributeChange(key, Number(e.target.value))}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Match Stats</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {(["goalsScored", "assists", "cleanSheets"] as const).map((stat) => (
                        <div key={stat} className="space-y-2">
                          <Label htmlFor={stat}>{stat.charAt(0).toUpperCase() + stat.slice(1)}</Label>
                          <Input
                            id={stat}
                            type="number"
                            min="0"
                            value={editedData.matchStats[stat]}
                            onChange={(e) => handleMatchStatsChange(stat, Number(e.target.value))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Training Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {(["sessionsAttended", "averagePerformance"] as const).map((stat) => (
                        <div key={stat} className="space-y-2">
                          <Label htmlFor={stat}>{stat.charAt(0).toUpperCase() + stat.slice(1)}</Label>
                          <Input
                            id={stat}
                            type="number"
                            min="0"
                            max="10"
                            step={stat === "averagePerformance" ? "0.1" : "1"}
                            value={editedData.trainingStats[stat]}
                            onChange={(e) => handleTrainingStatsChange(stat, Number(e.target.value))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="playingStyle">Playing Style</Label>
                    <Textarea
                      id="playingStyle"
                      value={editedData.playingStyle}
                      onChange={(e) => setEditedData((prev) => ({ ...prev, playingStyle: e.target.value }))}
                      placeholder="Describe the player's playing style..."
                    />
                  </div>
                  <CustomTooltip content="Add detailed observations and feedback for the player">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="notes">Coach's Notes</Label>
                      <Textarea
                        id="notes"
                        value={editedData.coachNotes}
                        onChange={(e) => setEditedData((prev) => ({ ...prev, coachNotes: e.target.value }))}
                        placeholder="Add your notes about the player's performance..."
                        className="min-h-[100px]"
                      />
                    </div>
                  </CustomTooltip>
                  <CustomTooltip content="Save all changes to the player's metrics">
                    <Button onClick={handleSaveMetrics} disabled={!selectedPlayerId}>
                      Save Metrics
                    </Button>
                  </CustomTooltip>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

