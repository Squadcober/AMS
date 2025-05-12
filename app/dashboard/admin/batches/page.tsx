"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Radar, Line } from "react-chartjs-2"
import { Chart as ChartJS, RadialLinearScale, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js';

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale
);

const calculateOverallRating = (attributes: any) => {
  if (!attributes) return 0;
  
  const values = [
    attributes.shooting || 0,
    attributes.pace || 0,
    attributes.positioning || 0,
    attributes.passing || 0,
    attributes.ballControl || 0,
    attributes.crossing || 0
  ];
  
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Number((sum / 6).toFixed(1)); // Average of all attributes
};

const calculateAveragePerformance = (player: any) => {
  if (!player?.performanceHistory?.length) return 0;
  
  const recentPerformances = player.performanceHistory
    .slice(-5) // Get last 5 performances
    .map((p: any) => p.sessionRating || p.matchRating || 0);
  
  const sum = recentPerformances.reduce((acc: number, val: number) => acc + val, 0);
  return (sum / recentPerformances.length).toFixed(1);
};

export default function BatchesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [localBatches, setLocalBatches] = useState<any[]>([])
  const [batchPlayers, setBatchPlayers] = useState<{ [batchId: string]: any[] }>({})
  const [batchCoaches, setBatchCoaches] = useState<{ [batchId: string]: any[] }>({})
  const [selectedBatch, setSelectedBatch] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isPlayerDetailsOpen, setIsPlayerDetailsOpen] = useState(false)
  const [selectedPlayerDetails, setSelectedPlayerDetails] = useState<any>(null)
  const [newBatchName, setNewBatchName] = useState("")
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([])
  const [isCoachDetailsOpen, setIsCoachDetailsOpen] = useState(false)
  const [selectedCoachDetails, setSelectedCoachDetails] = useState<any>(null)

  useEffect(() => {
    const fetchBatches = async () => {
      if (!user?.academyId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/db/ams-batches?academyId=${user.academyId}`);
        if (!response.ok) throw new Error("Failed to fetch batches");

        const result = await response.json();
        if (result.success) {
          setLocalBatches(result.data);
        }
      } catch (error) {
        console.error("Error fetching batches:", error);
        toast({
          title: "Error",
          description: "Failed to load batches",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatches();
  }, [user?.academyId]);

  useEffect(() => {
    const fetchBatchPlayers = async (batchId: string) => {
      try {
        const response = await fetch(`/api/db/ams-batches/${batchId}/players`);
        if (!response.ok) throw new Error("Failed to fetch batch players");

        const result = await response.json();
        if (result.success) {
          setBatchPlayers((prev) => ({
            ...prev,
            [batchId]: result.data,
          }));
        }
      } catch (error) {
        console.error("Error fetching batch players:", error);
      }
    };

    if (selectedBatch?._id) {
      fetchBatchPlayers(selectedBatch._id);
    }
  }, [selectedBatch]);

  useEffect(() => {
    const fetchBatchCoaches = async (batchId: string) => {
      try {
        const batch = localBatches.find(b => b._id === batchId);
        if (!batch?.coachIds?.length) {
          console.log("No coach IDs found for batch:", batchId);
          setBatchCoaches(prev => ({ ...prev, [batchId]: [] }));
          return;
        }

        console.log("Fetching coaches for batch:", batchId, "Coach IDs:", batch.coachIds);

        // Fetch coach details for each coachId
        const coachPromises = batch.coachIds.map(async (coachId: string) => {
          try {
            // First try to get user details if ID starts with user_
            if (coachId.startsWith('user_')) {
              const userResponse = await fetch(`/api/db/ams-users/${coachId}`);
              const userData = await userResponse.json();
              
              if (userData.success) {
                // Also fetch coach profile data
                const coachResponse = await fetch(`/api/db/coach-profile/${coachId}`);
                const coachData = await coachResponse.json();
                
                return {
                  id: coachId,
                  name: userData.data?.name || userData.data?.username || "Unknown Coach",
                  email: userData.data?.email,
                  photoUrl: userData.data?.photoUrl,
                  ...coachData.data // Merge coach profile data
                };
              }
            }

            // Fallback to coaches collection
            const response = await fetch(`/api/db/ams-coaches/${coachId}`);
            if (!response.ok) {
              console.log(`Failed to fetch coach with ID: ${coachId}`);
              return null;
            }

            const result = await response.json();
            return result.success ? result.data : null;

          } catch (error) {
            console.error(`Error fetching coach ${coachId}:`, error);
            return null;
          }
        });

        const coachResults = await Promise.all(coachPromises);
        const validCoaches = coachResults.filter(Boolean);

        console.log("Found coaches:", validCoaches);

        setBatchCoaches(prev => ({
          ...prev,
          [batchId]: validCoaches
        }));

      } catch (error) {
        console.error("Error fetching batch coaches:", error);
        setBatchCoaches(prev => ({ ...prev, [batchId]: [] }));
      }
    };

    if (selectedBatch?._id) {
      fetchBatchCoaches(selectedBatch._id);
    }
  }, [selectedBatch, localBatches]);

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!user?.academyId) return;

      try {
        const response = await fetch(`/api/db/ams-player-data?academyId=${user.academyId}`);
        if (!response.ok) throw new Error("Failed to fetch players");

        const result = await response.json();
        if (result.success) {
          setPlayers(result.data);
        }
      } catch (error) {
        console.error("Error fetching players:", error);
        toast({
          title: "Error",
          description: "Failed to load players",
          variant: "destructive",
        });
      }
    };

    fetchPlayers();
  }, [user?.academyId]);

  useEffect(() => {
    const fetchCoaches = async () => {
      if (!user?.academyId) return;

      try {
        const response = await fetch(`/api/db/ams-users?academyId=${user.academyId}&role=coach`);
        if (!response.ok) throw new Error("Failed to fetch coaches");

        const result = await response.json();
        if (result.success) {
          setCoaches(result.data || []); // Ensure we're accessing the data property
        } else {
          throw new Error(result.error || "Failed to fetch coaches");
        }
      } catch (error) {
        console.error("Error fetching coaches:", error);
        toast({
          title: "Error",
          description: "Failed to load coaches",
          variant: "destructive",
        });
      }
    };

    fetchCoaches();
  }, [user?.academyId]);

  const handleDeleteBatch = async (batchId: string) => {
    try {
      if (!window.confirm("Are you sure you want to permanently delete this batch? This action cannot be undone.")) {
        console.log("Deletion cancelled by user");
        return;
      }

      console.log("Starting deletion for batch:", batchId);
      
      const response = await fetch(`/api/db/ams-batches/${batchId}`, {
        method: "DELETE"
      });

      console.log("Server response:", response.status);

      // Try to parse response as JSON
      let result;
      try {
        result = await response.json();
        console.log("Server response data:", result);
      } catch (e) {
        console.log("No JSON response received");
      }

      if (!response.ok) {
        throw new Error(
          result?.error || 
          `Failed to delete batch (Status: ${response.status})`
        );
      }

      // Remove from local state
      console.log("Removing batch from local state");
      setLocalBatches((prev) => {
        const filtered = prev.filter((batch) => batch._id !== batchId);
        console.log("Batches remaining:", filtered.length);
        return filtered;
      });

      // Clear selected batch if it was deleted
      if (selectedBatch?._id === batchId) {
        console.log("Clearing selected batch");
        setSelectedBatch(null);
      }

      toast({
        title: "Success",
        description: "Batch deleted successfully",
      });
    } catch (error) {
      console.error("Error during batch deletion:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete batch",
        variant: "destructive",
      });
    }
  };

  const handleAddPlayers = async (batchId: string) => {
    try {
      const response = await fetch(`/api/db/ams-batches/${batchId}/players`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: selectedPlayers })
      });

      if (!response.ok) throw new Error("Failed to add players to batch");

      const result = await response.json();
      if (result.success) {
        setBatchPlayers(prev => ({
          ...prev,
          [batchId]: [...(prev[batchId] || []), ...players.filter(p => selectedPlayers.includes(p.id))]
        }));
        setSelectedPlayers([]);
        toast({
          title: "Success",
          description: "Players added successfully",
        });
      }
    } catch (error) {
      console.error("Error adding players:", error);
      toast({
        title: "Error",
        description: "Failed to add players",
        variant: "destructive",
      });
    }
  };

  const handleCreateBatch = async () => {
    try {
      if (!user?.academyId || !user?.id) {
        toast({
          title: "Error",
          description: "Missing required information",
          variant: "destructive",
        });
        return;
      }

      // Map selected coach IDs to coach user data
      const selectedCoachData = coaches
        .filter(coach => selectedCoaches.includes(coach._id))
        .map(coach => ({
          id: coach.id || coach.userId, // Use the user_ ID
          name: coach.name,
        }));

      const batchData = {
        name: newBatchName.trim(),
        coachIds: selectedCoachData.map(c => c.id), // Use only the user IDs
        coachNames: selectedCoachData.map(c => c.name), // Store names separately
        players: selectedPlayers,
        academyId: user.academyId,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      console.log("Creating batch with data:", batchData);

      const response = await fetch('/api/db/ams-batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create batch');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create batch');
      }

      // Update local state with the new batch
      setLocalBatches(prev => [...prev, result.data]);

      // Reset form
      setNewBatchName("");
      setSelectedPlayers([]);
      setSelectedCoaches([]);
      setIsCreateDialogOpen(false);

      toast({
        title: "Success",
        description: "Batch created successfully",
        variant: "default",
      });

    } catch (error) {
      console.error('Error creating batch:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create batch",
        variant: "destructive",
      });
    }
  };

  const handleViewPlayerDetails = async (playerId: string) => {
    try {
      const response = await fetch(`/api/db/batch-player-details/${playerId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch player details: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to load player details");
      }

      // Format the data for display and calculate ratings
      const playerData = {
        ...result.data,
        attributes: {
          shooting: result.data.attributes?.shooting || 0,
          pace: result.data.attributes?.pace || 0,
          positioning: result.data.attributes?.positioning || 0,
          passing: result.data.attributes?.passing || 0,
          ballControl: result.data.attributes?.ballControl || 0,
          crossing: result.data.attributes?.crossing || 0
        },
        overallRating: calculateOverallRating(result.data.attributes)*10,
        averagePerformance: calculateAveragePerformance(result.data)
      };

      setSelectedPlayerDetails(playerData);
      setIsPlayerDetailsOpen(true);
    } catch (error) {
      console.error("Error fetching player details:", error);
      toast({
        title: "Error",
        description: "Failed to load player details",
        variant: "destructive",
      });
    }
  };

  const handleViewCoachDetails = async (coachId: string) => {
    try {
      const userResponse = await fetch(`/api/db/ams-users/${coachId}`);
      const userData = await userResponse.json();
      
      const coachResponse = await fetch(`/api/db/coach-profile/${coachId}`);
      const coachData = await coachResponse.json();
      
      // Calculate average rating
      let averageRating = 0;
      const ratings = coachData.data?.ratings || [];
      if (ratings.length > 0) {
        averageRating = ratings.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / ratings.length;
      }

      // Get only the 3 most recent ratings, sorted by date in descending order
      const recentRatings = [...ratings]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);

      // Combine the data with calculated fields
      const combinedData = {
        ...userData.data,
        ...coachData.data,
        averageRating: averageRating.toFixed(1),
        ratingsCount: ratings.length,
        recentReviews: recentRatings,
        sessionsCount: coachData.data?.sessionsCount || 0
      };

      setSelectedCoachDetails(combinedData);
      setIsCoachDetailsOpen(true);
    } catch (error) {
      console.error("Error fetching coach details:", error);
      toast({
        title: "Error",
        description: "Failed to load coach details",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Loading Batches...</h2>
              <p className="text-muted-foreground">Please wait while we fetch your batches</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Batches</h1>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Create New Batch
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {localBatches.map((batch) => (
                    <div
                      key={batch._id}
                      onClick={() => setSelectedBatch(batch)}
                      className={cn(
                        "p-4 border rounded-lg hover:bg-accent cursor-pointer",
                        selectedBatch?._id === batch._id ? "bg-accent" : ""
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">{batch.name}</h3>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBatch(batch._id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Coach: {batch.coachName}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedBatch ? `${selectedBatch.name} Details` : "Select a Batch"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedBatch ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Coaches</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchCoaches[selectedBatch._id]?.map((coach: any) => (
                          <TableRow key={coach.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={coach.photoUrl} />
                                  <AvatarFallback>{coach.name?.[0]}</AvatarFallback>
                                </Avatar>
                                {coach.name}
                              </div>
                            </TableCell>
                            <TableCell>{coach.email}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewCoachDetails(coach.id)}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Separator className="my-4" />
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Players</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchPlayers[selectedBatch.id]?.map((player: any) => (
                          <TableRow key={player.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={player.photoUrl} />
                                  <AvatarFallback>{player.name[0]}</AvatarFallback>
                                </Avatar>
                                {player.name}
                              </div>
                            </TableCell>
                            <TableCell>{player.position}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewPlayerDetails(player.id)}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Select a batch to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Batch Name</Label>
                <Input
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="Enter batch name"
                />
              </div>

              <div>
                <Label>Assign Coaches</Label>
                <ScrollArea className="h-[150px] border rounded-md p-4">
                  {coaches.map((coach) => (
                    <div key={coach._id} className="flex items-center space-x-2 py-2">
                      <Checkbox
                        checked={selectedCoaches.includes(coach._id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCoaches(prev => [...prev, coach._id]);
                          } else {
                            setSelectedCoaches(prev => prev.filter(id => id !== coach._id));
                          }
                        }}
                      />
                      <div className="flex flex-col">
                        <span>{coach.name || coach.email}</span>
                        <span className="text-sm text-muted-foreground">{coach.email}</span>
                      </div>
                    </div>
                  ))}
                  {coaches.length === 0 && (
                    <div className="text-center text-muted-foreground py-2">
                      No coaches available
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div>
                <Label>Players</Label>
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center space-x-2 py-2">
                      <Checkbox
                        checked={selectedPlayers.includes(player.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPlayers(prev => [...prev, player.id]);
                          } else {
                            setSelectedPlayers(prev => prev.filter(id => id !== player.id));
                          }
                        }}
                      />
                      <span>{player.name}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateBatch}>Create Batch</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isPlayerDetailsOpen} onOpenChange={setIsPlayerDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Player Details</DialogTitle>
            </DialogHeader>
            {selectedPlayerDetails && (
              <div className="space-y-6 p-4">
                <div className="flex items-center gap-4 border-b pb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={selectedPlayerDetails.photoUrl} />
                    <AvatarFallback>{selectedPlayerDetails.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedPlayerDetails.name}</h2>
                    <p className="text-muted-foreground text-lg">{selectedPlayerDetails.position}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Performance Ratings</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                        <span className="text-muted-foreground">Overall Rating</span>
                        <span className="text-2xl font-bold">{selectedPlayerDetails.overallRating}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg">
                        <span className="text-muted-foreground">Average Performance</span>
                        <span className="text-2xl font-bold">{selectedPlayerDetails.averagePerformance}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Attributes</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(selectedPlayerDetails.attributes).map(([key, value]) => (
                        <div key={key} className="bg-secondary/50 p-3 rounded-lg">
                          <div className="text-sm text-muted-foreground capitalize">{key}</div>
                          <div className="text-2xl font-semibold">{Number(value).toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isCoachDetailsOpen} onOpenChange={setIsCoachDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Coach Details</DialogTitle>
            </DialogHeader>
            {selectedCoachDetails && (
              <div className="space-y-6 p-4">
                <div className="flex items-center gap-4 border-b pb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={selectedCoachDetails.photoUrl} />
                    <AvatarFallback>{selectedCoachDetails.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{selectedCoachDetails.name}</h2>
                    <p className="text-muted-foreground text-lg">Coach</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="text-3xl font-bold">{selectedCoachDetails.averageRating}</div>
                      <div className="text-muted-foreground">
                        Based on {selectedCoachDetails.ratingsCount} ratings
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Personal Info</h3>
                    <div className="space-y-4">
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-sm text-muted-foreground">Age</div>
                        <div className="text-lg font-semibold">{selectedCoachDetails.age || 'N/A'}</div>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-sm text-muted-foreground">License/Certification</div>
                        <div className="text-lg font-semibold">{selectedCoachDetails.license || 'N/A'}</div>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-sm text-muted-foreground">About</div>
                        <div className="text-lg">{selectedCoachDetails.about || 'No information available'}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-4">Recent Reviews</h3>
                    <div className="space-y-4">
                      {selectedCoachDetails.recentReviews?.map((review: any, index: number) => (
                        <div key={index} className="p-3 bg-secondary/50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-semibold">
                              {review.studentName || 'Anonymous Student'}
                            </div>
                            <div className="text-lg font-bold">{review.rating}/5</div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(review.date).toLocaleDateString()}
                          </div>
                          {review.comment && (
                            <div className="mt-2 text-sm">{review.comment}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Training Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold mb-2">{selectedCoachDetails.sessionsCount}</div>
                      <p className="text-muted-foreground">
                        Completed training sessions across all batches
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
