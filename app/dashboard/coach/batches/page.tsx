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
  return (sum / 6).toFixed(1); // Average of all attributes
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
  const [selectedBatch, setSelectedBatch] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isPlayerDetailsOpen, setIsPlayerDetailsOpen] = useState(false)
  const [selectedPlayerDetails, setSelectedPlayerDetails] = useState<any>(null)
  const [newBatchName, setNewBatchName] = useState("")
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [players, setPlayers] = useState<any[]>([])

  useEffect(() => {
    const fetchBatches = async () => {
      if (!user?.academyId || !user?.id) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/db/ams-batches?academyId=${user.academyId}`);
        if (!response.ok) throw new Error("Failed to fetch batches");

        const result = await response.json();
        if (result.success) {
          // Only show batches where the coach is the main coach or in coachIds array
          const filtered = result.data.filter(
            (batch: any) =>
              batch.coachId === user.id ||
              (Array.isArray(batch.coachIds) && batch.coachIds.includes(user.id))
          );
          setLocalBatches(filtered);
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
  }, [user?.academyId, user?.id]);

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

  const handleDeleteBatch = async (batchId: string) => {
    try {
      if (!window.confirm("Are you sure you want to delete this batch?")) {
        return;
      }

      const response = await fetch(`/api/db/ams-batches/${batchId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete batch");

      setLocalBatches((prev) => prev.filter((batch) => batch._id !== batchId));
      toast({
        title: "Success",
        description: "Batch deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting batch:", error);
      toast({
        title: "Error",
        description: "Failed to delete batch",
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
          [batchId]: [...(prev[batchId] || []), ...players.filter(p => selectedPlayers.includes(p._id))]
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
    if (!user?.academyId || !user?.id) {
      toast({
        title: "Error",
        description: "Missing required information",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/db/batch-operations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBatchName,
          coachId: user.id,
          coachName: user.name || "",
          academyId: user.academyId,
          players: selectedPlayers,
          createdAt: new Date(),
        })
      });

      if (!response.ok) throw new Error('Failed to create batch');
      
      const result = await response.json();
      if (result.success) {
        setLocalBatches(prev => [...prev, result.data]);
        setNewBatchName("");
        setSelectedPlayers([]);
        setIsCreateDialogOpen(false);
        toast({
          title: "Success",
          description: "Batch created successfully"
        });
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      toast({
        title: "Error",
        description: "Failed to create batch",
        variant: "destructive"
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
        overallRating: calculateOverallRating(result.data.attributes),
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
                        {batchPlayers[selectedBatch._id]?.map((player: any) => (
                          <TableRow key={player._id}>
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
                                onClick={() => handleViewPlayerDetails(player._id)}
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
                <Label>Players</Label>
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  {players.map((player) => (
                    <div key={player._id} className="flex items-center space-x-2 py-2">
                      <Checkbox
                        checked={selectedPlayers.includes(player._id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPlayers(prev => [...prev, player._id]);
                          } else {
                            setSelectedPlayers(prev => prev.filter(id => id !== player._id));
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
      </div>
    </div>
  );
}
