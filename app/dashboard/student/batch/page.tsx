"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Star } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export default function StudentBatches() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [assignedPlayers, setAssignedPlayers] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [coachData, setCoachData] = useState<{[key: string]: any}>({});
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [ratings, setRatings] = useState<{[key: string]: number}>({});
  const [showCoachProfile, setShowCoachProfile] = useState(false);
  const [studentsInfo, setStudentsInfo] = useState<{[key: string]: any}>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.academyId) return;

        const playerResponse = await fetch(`/api/db/ams-player-data?academyId=${user.academyId}&userId=${user.id}&username=${user.username}&email=${user.email}`);
        const playerData = await playerResponse.json();
        
        const currentPlayer = playerData.data?.[0];
        if (!currentPlayer) {
          console.error('Current player not found for user:', {
            id: user.id,
            username: user.username,
            email: user.email
          });
          return;
        }

        setCurrentPlayer(currentPlayer);

        const playerObjectId = currentPlayer._id;
        const playerId = currentPlayer.id;

        const batchesResponse = await fetch(`/api/db/ams-batches?academyId=${user.academyId}&playerId=${playerId}&playerObjectId=${playerObjectId}`);
        if (!batchesResponse.ok) throw new Error('Failed to fetch batches');
        const batchesData = await batchesResponse.json();
        
        const playerBatches = batchesData.data.filter((batch: any) => 
          batch.players?.some((pid: string) => 
            pid === playerId || 
            pid === playerObjectId ||
            pid === currentPlayer._id.toString()
          )
        );
        
        setBatches(playerBatches);

        const coachIds = new Set<string>();
        playerBatches.forEach((batch: { coachId?: string; coachIds?: string[]; userId?: string }) => {
          if (batch.coachId) coachIds.add(batch.coachId);
          if (Array.isArray(batch.coachIds)) {
            batch.coachIds.forEach(id => coachIds.add(id.toString()));
          }
          if (batch.userId) coachIds.add(batch.userId);
        });

        const coachPromises = Array.from(coachIds).map(id =>
          fetch(`/api/db/ams-coaches?id=${id}`).then(res => res.json())
        );

        const coachResponses = await Promise.all(coachPromises);
        const coachDataMap: { [key: string]: any } = {};
        
        coachResponses.forEach((response, index) => {
          const coachId = Array.from(coachIds)[index];
          if (response.data) {
            coachDataMap[coachId] = response.data;
          }
        });

        setCoachData(coachDataMap);

        const allPlayerIds = [...new Set(playerBatches.flatMap((batch: any) => batch.players || []))];
        if (allPlayerIds.length) {
          const playersResponse = await fetch(`/api/db/ams-player-data/batch?ids=${allPlayerIds.join(',')}`);
          if (playersResponse.ok) {
            const playersData = await playersResponse.json();
            setPlayers(playersData.data);
            setAssignedPlayers(playersData.data.map((p: any) => p.id));
          }
        }

      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    fetchData();
  }, [user?.academyId, user?.id, user?.username, user?.email]);

  useEffect(() => {
    const fetchStudentInfo = async (studentIds: string[]) => {
      try {
        const response = await fetch(`/api/db/ams-player-data/batch?ids=${studentIds.join(',')}`);
        if (!response.ok) return;
        
        const data = await response.json();
        const studentsMap: {[key: string]: any} = {};
        
        data.data.forEach((student: any) => {
          studentsMap[student.id] = {
            name: student.name || 'Unknown Student',
            photoUrl: student.photoUrl || '/placeholder.svg',
            position: student.position || 'Unknown Position'
          };
        });
        
        setStudentsInfo(studentsMap);
      } catch (error) {
        console.error('Error fetching student info:', error);
      }
    };

    const studentIds = new Set<string>();
    Object.values(coachData).forEach(coach => {
      coach?.ratings?.forEach((rating: any) => {
        if (rating.studentId) {
          studentIds.add(rating.studentId);
        }
      });
    });

    if (studentIds.size > 0) {
      fetchStudentInfo(Array.from(studentIds));
    }
  }, [coachData]);

  const fetchCoachDetails = async (coachId: string) => {
    try {
      const [coachResponse, userResponse, credentialsResponse] = await Promise.all([
        fetch(`/api/db/ams-coaches?id=${coachId}`),
        fetch(`/api/db/ams-users?userId=${coachId}`),
        fetch(`/api/db/ams-credentials?userId=${coachId}&academyId=${user?.academyId}`)
      ]);

      const [coachData, userData, credentialsData] = await Promise.all([
        coachResponse.json(),
        userResponse.json(),
        credentialsResponse.json()
      ]);

      const combinedData = {
        ...coachData.data,
        ...userData.data,
        credentials: credentialsData.data || [],
        id: coachId,
        name: userData.data?.name || coachData.data?.name || "Unknown Coach",
        email: userData.data?.email || coachData.data?.email || "Not available",
        photoUrl: userData.data?.photoUrl || coachData.data?.photoUrl || "/placeholder.svg",
      };

      return combinedData;
    } catch (error) {
      console.error('Error fetching coach details:', error);
      return defaultCoachData(coachId);
    }
  };

  const handleBatchClick = async (batch: any) => {
    setSelectedBatch(batch);
    if (batch.coachId) {
      const coachDetails = await fetchCoachDetails(batch.coachId);
      setSelectedCoach(coachDetails);
    }
  };

  const handleCoachClick = async (coachId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const coachDetails = await fetchCoachDetails(coachId);
    setSelectedCoach(coachDetails);
    setShowCoachProfile(true);
  };

  const getCoachData = async (batch: any) => {
    let coachId = batch.coachId;
    
    if (!coachId && Array.isArray(batch.coachIds) && batch.coachIds.length > 0) {
      coachId = batch.coachIds[0];
    }

    if (!coachId && batch.userId) {
      coachId = batch.userId;
    }

    if (!coachId) {
      return defaultCoachData();
    }

    const coachDetails = await fetchCoachDetails(coachId);
    return {
      ...coachDetails,
      id: coachId,
      name: coachDetails.name || batch.coachName || "Unknown Coach"
    };
  };

  const defaultCoachData = (coachId?: string) => ({
    id: coachId || 'unknown',
    name: "Unknown Coach",
    photoUrl: "/placeholder.svg",
    email: "Not available",
    about: "No information available",
    averageRating: "0",
    ratings: [],
    credentials: []
  });

  const getPlayerData = (playerId: string) => {
    const player = players.find(p => p.id.toString() === playerId.toString());
    return {
      name: player?.name || "Unknown Player",
      photoUrl: player?.photoUrl || "/placeholder.svg",
      position: player?.position || "No position"
    };
  };

  const getPlayersSummary = (playerIds: any[]) => {
    const stringPlayerIds = playerIds.map(id => id.toString());
    const matchingPlayers = players.filter(player => 
      stringPlayerIds.includes(player.id.toString())
    );
    
    const totalInBatch = stringPlayerIds.length;
    const matchingCount = matchingPlayers.length;
    
    if (matchingCount === 0) return "No active players";
    if (matchingCount === 1) return `${matchingPlayers[0].name} (1/${totalInBatch} active)`;
    
    return `${matchingPlayers[0].name} + ${matchingCount - 1} others (${matchingCount}/${totalInBatch} active)`;
  };

  const handleRating = async (coachId: string, rating: number) => {
    try {
      if (!user?.academyId) {
        console.error('Academy ID missing');
        return;
      }

      const studentId = currentPlayer?.id || user?.id;
      if (!studentId) {
        console.error('Student ID missing');
        return;
      }

      console.log('Submitting rating:', {
        coachId,
        studentId,
        rating,
        academyId: user.academyId
      });

      const response = await fetch('/api/db/ams-coaches/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coachId,
          studentId,
          rating,
          academyId: user.academyId,
          date: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save rating:', errorData);
        return;
      }

      const data = await response.json();

      setRatings(prev => ({
        ...prev,
        [coachId]: rating
      }));

      if (data.success && data.data) {
        setCoachData(prev => ({
          ...prev,
          [coachId]: {
            ...prev[coachId],
            ...data.data,
            ratings: data.data.ratings || []
          }
        }));

        if (selectedCoach?.id === coachId) {
          setSelectedCoach((prev: typeof selectedCoach) => ({
            ...prev,
            ...data.data,
            ratings: data.data.ratings || []
          }));
        }
      }

    } catch (error) {
      console.error('Error saving rating:', error);
    }
  };

  const StarRating = ({ coachId }: { coachId: string }) => {
    const [hover, setHover] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const currentRating = ratings[coachId] || 0;

    const handleClick = async (star: number) => {
      setIsLoading(true);
      await handleRating(coachId, star);
      setIsLoading(false);
    };

    return (
      <div className="flex items-center space-x-1 mt-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleClick(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(null)}
            className="focus:outline-none"
            disabled={isLoading}
          >
            <Star
              className={cn(
                "w-5 h-5",
                isLoading ? "text-gray-300" :
                (hover !== null ? star <= hover : star <= currentRating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-400",
                "transition-colors"
              )}
            />
          </button>
        ))}
        {currentRating > 0 && (
          <span className="text-sm text-gray-400 ml-2">
            ({currentRating}/5)
          </span>
        )}
      </div>
    );
  };

  const getStudentInfo = (rating: any) => {
    if (rating.studentInfo) {
      return rating.studentInfo;
    }
    return studentsInfo[rating.studentId] || {
      name: 'Unknown Student',
      photoUrl: '/placeholder.svg'
    };
  };

  const getCoachInfo = (coachId: string, batch?: any, idx?: number) => {
    const coach = coachData[coachId];
    if (coach && coach.name && coach.name !== "Unknown Coach") {
      return coach;
    }
    if (batch && Array.isArray(batch.coachNames) && typeof idx === "number" && batch.coachNames[idx]) {
      return {
        id: coachId,
        name: batch.coachNames[idx],
        photoUrl: "/placeholder.svg",
        email: "Not available"
      };
    }
    return {
      id: coachId,
      name: "Unknown Coach",
      photoUrl: "/placeholder.svg",
      email: "Not available"
    };
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">My Batches</h1>
        </div>

        <Table className="mt-6 cursor-pointer">
          <TableHeader>
            <TableRow>
              <TableHead>Batch Name</TableHead>
              <TableHead>Coach(es)</TableHead>
              <TableHead>Players</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => (
              <TableRow 
                key={batch.id} 
                onClick={() => setSelectedBatch(batch)}
                className="hover:bg-accent"
              >
                <TableCell>{batch.name}</TableCell>
                <TableCell>
                  {batch.coachIds && Array.isArray(batch.coachIds) && batch.coachIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {batch.coachIds.map((coachId: string, idx: number) => {
                        const coach = getCoachInfo(coachId, batch, idx);
                        return (
                          <div
                            key={coachId}
                            className="flex items-center gap-1 cursor-pointer"
                            onClick={e => {
                              e.stopPropagation();
                              handleCoachClick(coachId, e);
                            }}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={coach.photoUrl} alt={coach.name} />
                              <AvatarFallback>{coach.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs underline text-white hover:text-gray-300">{coach.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    batch.coachId && (
                      <div
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={e => {
                          e.stopPropagation();
                          handleCoachClick(batch.coachId, e);
                        }}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={getCoachInfo(batch.coachId, batch).photoUrl} alt={getCoachInfo(batch.coachId, batch).name} />
                          <AvatarFallback>{getCoachInfo(batch.coachId, batch).name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs underline text-white hover:text-gray-300">{getCoachInfo(batch.coachId, batch).name}</span>
                      </div>
                    )
                  )}
                </TableCell>
                <TableCell>
                  <span title={players
                    .filter(p => batch.players.includes(p.id.toString()))
                    .map(p => p.name)
                    .join(", ")}>
                    {getPlayersSummary(batch.players)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{selectedBatch?.name}</DialogTitle>
            </DialogHeader>
            
            {selectedBatch && (
              <ScrollArea className="h-full max-h-[calc(80vh-120px)]">
                <div className="space-y-6 p-4">
                  {selectedBatch.coachIds && Array.isArray(selectedBatch.coachIds) && selectedBatch.coachIds.length > 0 ? (
                    <div>
                      <div className="font-semibold mb-2">Coaches:</div>
                      <div className="flex flex-wrap gap-4">
                        {selectedBatch.coachIds.map((coachId: string, idx: number) => {
                          const coach = getCoachInfo(coachId, selectedBatch, idx);
                          return (
                            <div
                              key={coachId}
                              className="flex flex-col items-center gap-2 cursor-pointer"
                              onClick={e => {
                                e.stopPropagation();
                                handleCoachClick(coachId, e);
                              }}
                            >
                              <Avatar className="h-16 w-16">
                                <AvatarImage src={coach.photoUrl} alt={coach.name} />
                                <AvatarFallback>{coach.name?.[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium underline text-white hover:text-gray-300">{coach.name}</span>
                              <span className="text-xs text-gray-500">{coach.email}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    selectedBatch.coachId && (
                      <div>
                        <div className="font-semibold mb-2">Coach:</div>
                        <div
                          className="flex flex-col items-center gap-2 cursor-pointer"
                          onClick={e => {
                            e.stopPropagation();
                            handleCoachClick(selectedBatch.coachId, e);
                          }}
                        >
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={getCoachInfo(selectedBatch.coachId, selectedBatch).photoUrl} alt={getCoachInfo(selectedBatch.coachId, selectedBatch).name} />
                            <AvatarFallback>{getCoachInfo(selectedBatch.coachId, selectedBatch).name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium underline text-white hover:text-gray-300">{getCoachInfo(selectedBatch.coachId, selectedBatch).name}</span>
                          <span className="text-xs text-gray-500">{getCoachInfo(selectedBatch.coachId, selectedBatch).email}</span>
                        </div>
                      </div>
                    )
                  )}

                  <Separator className="my-4" />

                  <div className="grid grid-cols-2 gap-4">
                    {selectedBatch.players.map((playerId: string) => {
                      const playerData = getPlayerData(playerId);
                      return (
                        <div 
                          key={playerId} 
                          className="flex items-center space-x-3 p-2 rounded-lg bg-accent"
                        >
                          <Avatar>
                            <AvatarImage 
                              src={playerData.photoUrl} 
                              alt={playerData.name} 
                            />
                            <AvatarFallback>
                              {playerData.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{playerData.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {playerData.position}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showCoachProfile} onOpenChange={setShowCoachProfile}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Coach Profile</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="credentials">Credentials</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedCoach?.photoUrl} />
                    <AvatarFallback>{selectedCoach?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedCoach?.name}</h3>
                    <p className="text-gray-500">{selectedCoach?.email}</p>
                    <div className="mt-2">
                      <StarRating coachId={selectedCoach?.id} />
                    </div>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{selectedCoach?.about || 'No about information available'}</p>
                  </CardContent>
                </Card>

                {selectedCoach?.achievements && selectedCoach.achievements.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Achievements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-4 space-y-2">
                        {selectedCoach.achievements.map((achievement: string, index: number) => (
                          <li key={index}>{achievement}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {selectedCoach?.ratings && selectedCoach.ratings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Reviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedCoach.ratings.slice(-3).map((rating: any, index: number) => {
                          const studentInfo = getStudentInfo(rating);
                          return (
                            <div key={index} className="flex items-start space-x-4 p-4 bg-accent rounded-lg">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={studentInfo.photoUrl} alt={studentInfo.name} />
                                <AvatarFallback>{studentInfo.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex justify-between items-center">
                                  <p className="font-medium text-sm">{studentInfo.name}</p>
                                  <div className="flex items-center">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                                    <span className="text-sm font-medium">{rating.rating}/5</span>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(rating.date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="credentials" className="space-y-4">
                {selectedCoach?.credentials && selectedCoach.credentials.length > 0 ? (
                  selectedCoach.credentials.map((credential: any, index: number) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle>{credential.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Type:</span> {credential.type}
                          </p>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Issued Date:</span> {credential.issueDate}
                          </p>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Expiry Date:</span> {credential.expiryDate}
                          </p>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Issuing Authority:</span> {credential.issuingAuthority}
                          </p>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Credential ID:</span> {credential.credentialId}
                          </p>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Status:</span> {credential.status}
                          </p>
                          {credential.description && (
                            <div className="mt-4">
                              <span className="font-medium text-sm text-gray-500">Description:</span>
                              <p className="text-sm text-gray-500 mt-1">{credential.description}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-center text-gray-500">No credentials available</p>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
