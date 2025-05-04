"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Radar, Line } from "react-chartjs-2"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePlayers } from "@/contexts/PlayerContext"
import { useBatches } from "@/contexts/BatchContext"
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale } from "chart.js"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Sidebar from "@/components/Sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/components/ui/use-toast"

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale)

const PLAYER_COLORS = [
  "rgba(255,99,132,0.5)",   // Red
  "rgba(54,162,235,0.5)",   // Blue
  "rgba(255,206,86,0.5)",   // Yellow
  "rgba(75,192,192,0.5)",   // Teal
  "rgba(153,102,255,0.5)",  // Purple
  "rgba(255,159,64,0.5)",   // Orange
  "rgba(199,199,199,0.5)",  // Grey
  "rgba(255,99,255,0.5)",   // Pink
  "rgba(99,255,132,0.5)",   // Green
  "rgba(99,132,255,0.5)",   // Light Blue
  "rgba(255,222,99,0.5)",   // Light Yellow
];
const PLAYER_BORDER_COLORS = [
  "rgb(255,99,132)",
  "rgb(54,162,235)",
  "rgb(255,206,86)",
  "rgb(75,192,192)",
  "rgb(153,102,255)",
  "rgb(255,159,64)",
  "rgb(199,199,199)",
  "rgb(255,99,255)",
  "rgb(99,255,132)",
  "rgb(99,132,255)",
  "rgb(255,222,99)",
];

export default function BatchPerformancePage() {
  const { user } = useAuth()
  const [localBatches, setLocalBatches] = useState<any[]>([])
  const [batchStudents, setBatchStudents] = useState<any[]>([])
  const [selectedBatch, setSelectedBatch] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [batchPlayers, setBatchPlayers] = useState<any[]>([])
  const [batchCoaches, setBatchCoaches] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedAttribute, setSelectedAttribute] = useState<string>("shooting")
  const [searchTerm, setSearchTerm] = useState<string>("")

  useEffect(() => {
    const fetchBatches = async () => {
      if (!user?.academyId || !user?.id) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/db/ams-batches?academyId=${user.academyId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch batches');
        }

        const result = await response.json();
        if (result.success) {
          // Only show batches where the coach is the main coach or in coachIds array
          const filtered = result.data.filter(
            (batch: any) =>
              batch.coachId === user.id ||
              (Array.isArray(batch.coachIds) && batch.coachIds.includes(user.id))
          );
          const formattedBatches = filtered.map((batch: any) => ({
            ...batch,
            id: batch._id || batch.id,
            _id: batch._id || batch.id,
            name: batch.name || 'Unnamed Batch'
          }));
          setLocalBatches(formattedBatches);
        }
      } catch (error) {
        console.error('Error fetching batches:', error);
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
    const fetchBatchData = async () => {
      if (!selectedBatch) return;

      try {
        console.log('Fetching data for batch:', selectedBatch);
        setIsLoading(true);

        // Fetch players and coaches
        const [playersResponse, coachesResponse] = await Promise.all([
          fetch(`/api/db/ams-batches/${selectedBatch._id}/players`),
          fetch(`/api/db/ams-batches/${selectedBatch._id}/coaches`)
        ]);

        const playersData = await playersResponse.json();
        const coachesData = await coachesResponse.json();

        console.log('Players data:', playersData);
        console.log('Coaches data:', coachesData);

        if (playersData.success) {
          const formattedPlayers = playersData.data.map((player: any) => ({
            ...player,
            id: player._id || player.id,
            name: player.name || player.username || 'Unknown Player',
            attributes: player.attributes || {}  // Ensure attributes exist
          }));
          setBatchPlayers(formattedPlayers);
          setSelectedPlayers(formattedPlayers.map((p: any) => p.id.toString()));
        }

        if (coachesData.success) {
          setBatchCoaches(coachesData.data);
        }

      } catch (error) {
        console.error('Error fetching batch data:', error);
        toast({
          title: "Error",
          description: "Failed to load batch data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatchData();
  }, [selectedBatch]);

  const handlePlayerSelection = async (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      return [...prev, playerId];
    });

    if (!players.find(p => p.id === playerId)) {
      try {
        const response = await fetch(`/api/db/ams-player-data/${playerId}`);
        if (!response.ok) throw new Error('Failed to fetch player data');

        const result = await response.json();
        if (result.success) {
          setPlayers(prev => [...prev, result.data]);
        }
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    }
  };

  const getLatestAttributeValue = (player: any, attribute: string): number => {
    if (!player) return 0;
    
    console.log('Getting attribute value for:', {
      playerName: player.name || player.username,
      attribute,
      attributes: player.attributes
    });

    // Direct access from attributes object
    if (player.attributes && typeof player.attributes[attribute] === 'number') {
      return player.attributes[attribute];
    }

    // Check performanceHistory if exists
    if (Array.isArray(player.performanceHistory) && player.performanceHistory.length > 0) {
      const latestEntry = player.performanceHistory
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .find((entry: any) => entry.attributes?.[attribute] !== undefined);

      if (latestEntry?.attributes?.[attribute] !== undefined) {
        return latestEntry.attributes[attribute];
      }
    }

    return 0;
  };

  const generateComparisonData = (selectedPlayers: string[]) => {
    // Get dates from the last month
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);

    // Create array of dates for the past month
    const dates: string[] = [];
    for (let d = new Date(lastMonth); d <= today; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    return {
      labels: dates.map(date => new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })),
      datasets: selectedPlayers.map((playerId, index) => {
        const player = batchPlayers.find(p => p.id.toString() === playerId);
        console.log('Processing player for graph:', player?.name);

        // Get initial value
        let lastValue = player?.attributes?.[selectedAttribute] || 0;

        // Map values to dates
        const data = dates.map(date => {
          // Find performance entry for this date
          const entry = player?.performanceHistory?.find((e: any) => {
            const entryDate = new Date(e.date).toISOString().split('T')[0];
            return entryDate === date && e.attributes?.[selectedAttribute] !== undefined;
          });

          if (entry?.attributes?.[selectedAttribute] !== undefined) {
            lastValue = entry.attributes[selectedAttribute];
          }

          return lastValue;
        });

        return {
          label: player?.name || `Player ${index + 1}`,
          data: data,
          fill: false,
          borderColor: PLAYER_BORDER_COLORS[index % PLAYER_BORDER_COLORS.length],
          backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length],
          tension: 0.3,
          pointRadius: 3,
          spanGaps: true
        };
      }),
    };
  };

  const radarData = {
    labels: ["Shooting", "Pace", "Positioning", "Passing", "Ball Control", "Crossing"],
    datasets: selectedPlayers.map((playerId, index) => {
      const player = batchPlayers.find((p) => p._id.toString() === playerId);
      
      console.log('Generating radar data for player:', {
        playerId,
        playerName: player?.name || player?.username,
        attributes: player?.attributes
      });

      const dataPoints = [
        getLatestAttributeValue(player, 'shooting'),
        getLatestAttributeValue(player, 'pace'),
        getLatestAttributeValue(player, 'positioning'),
        getLatestAttributeValue(player, 'passing'),
        getLatestAttributeValue(player, 'ballControl'),
        getLatestAttributeValue(player, 'crossing'),
      ];

      console.log('Generated data points:', dataPoints);

      return {
        label: player?.name || player?.username || `Player ${index + 1}`,
        data: dataPoints,
        backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length],
        borderColor: PLAYER_BORDER_COLORS[index % PLAYER_BORDER_COLORS.length],
        borderWidth: 2,
        fill: true,
      }
    }),
  };

  const radarOptions = {
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        min: 0,
        ticks: {
          stepSize: 1,
          display: false,
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        pointLabels: {
          color: "rgb(255, 255, 255)",
          font: {
            size: 12,
          },
        },
        angleLines: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "rgb(255, 255, 255)",
        },
      },
    },
    maintainAspectRatio: false,
  };

  const lineOptions = {
    responsive: true,
    scales: {
      x: {
        type: 'category' as const,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgb(255, 255, 255)",
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 10, // Show max 10 date labels
          callback: function(value: any, index: number, values: any[]) {
            // Show date in MMM DD format
            return this.getLabelForValue(value);
          }
        }
      },
      y: {
        beginAtZero: true,
        max: 10,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgb(255, 255, 255)",
          stepSize: 1
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: "rgb(255, 255, 255)"
        }
      },
      tooltip: {
        callbacks: {
          title: function(context: any[]) {
            // Format the date in the tooltip
            return new Date(context[0].label).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          },
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value?.toFixed(1) || 'No data'}`;
          }
        }
      }
    },
    elements: {
      line: { tension: 0.3 },
      point: { radius: 3, hoverRadius: 5 }
    },
    maintainAspectRatio: false
  };

  const getBatchAverageAttributes = () => {
    if (!selectedBatch || !batchPlayers || batchPlayers.length === 0) return null;

    console.log('Calculating averages for players:', batchPlayers);

    const totalAttributes = batchPlayers.reduce(
      (totals, player) => {
        return {
          shooting: totals.shooting + getLatestAttributeValue(player, 'shooting'),
          pace: totals.pace + getLatestAttributeValue(player, 'pace'),
          positioning: totals.positioning + getLatestAttributeValue(player, 'positioning'),
          passing: totals.passing + getLatestAttributeValue(player, 'passing'),
          ballControl: totals.ballControl + getLatestAttributeValue(player, 'ballControl'),
          crossing: totals.crossing + getLatestAttributeValue(player, 'crossing'),
        };
      },
      { shooting: 0, pace: 0, positioning: 0, passing: 0, ballControl: 0, crossing: 0 }
    );

    const playerCount = batchPlayers.length;

    return {
      shooting: (totalAttributes.shooting / playerCount).toFixed(1),
      pace: (totalAttributes.pace / playerCount).toFixed(1),
      positioning: (totalAttributes.positioning / playerCount).toFixed(1),
      passing: (totalAttributes.passing / playerCount).toFixed(1),
      ballControl: (totalAttributes.ballControl / playerCount).toFixed(1),
      crossing: (totalAttributes.crossing / playerCount).toFixed(1),
    };
  };

  const batchAverageAttributes = getBatchAverageAttributes()

  const filteredPlayers = useMemo(() => {
    if (!batchPlayers || batchPlayers.length === 0) {
      return [];
    }

    return batchPlayers.filter(player => {
      if (!player || !player.name) {
        return false;
      }
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [batchPlayers, searchTerm]);

  const getColorForAttribute = (attribute: string, value: number) => {
    const values = selectedPlayers.map(playerId => {
      const player = players.find(p => p.id.toString() === playerId)
      return player ? player.attributes[attribute as keyof typeof player.attributes] : 0
    })
    const max = Math.max(...values)
    const min = Math.min(...values)
    if (value === max) return "text-green-500"
    if (value === min) return "text-red-500"
    return ""
  }

  const renderAttributeComparison = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Attribute</TableHead>
          {selectedPlayers.map((playerId) => (
            <TableHead key={playerId}>
              {batchPlayers.find((p) => p._id.toString() === playerId)?.name || 
               batchPlayers.find((p) => p._id.toString() === playerId)?.username}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {["shooting", "pace", "positioning", "passing", "ballControl", "crossing"].map((attr) => (
          <TableRow key={attr}>
            <TableCell>{attr.charAt(0).toUpperCase() + attr.slice(1)}</TableCell>
            {selectedPlayers.map((playerId) => {
              const player = batchPlayers.find((p) => p._id.toString() === playerId);
              const value = getLatestAttributeValue(player, attr);
              return (
                <TableCell key={playerId} className={getColorForAttribute(attr, value)}>
                  {value.toFixed(1)}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const getBatchName = () => {
    if (!selectedBatch || !localBatches || !Array.isArray(localBatches)) return "Selected Batch";
    const batch = localBatches.find(b => b._id === selectedBatch._id || b.id === selectedBatch.id);
    return batch?.name || "Selected Batch";
  };

  return (
    <div className="flex h-screen bg-background dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Batch Performance</h1>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">Loading batches...</p>
          </div>
        ) : localBatches.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">No Batches Found</h3>
            <p className="text-muted-foreground">No batches are currently available</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Batches</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Name</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localBatches.map((batch) => (
                      <TableRow 
                        key={batch._id}
                        className={selectedBatch?._id === batch._id ? 'bg-accent' : ''}
                      >
                        <TableCell>{batch.name}</TableCell>
                        <TableCell>
                          <Button 
                            variant="default" 
                            onClick={() => setSelectedBatch(batch)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {selectedBatch && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Batch Average Attributes - {getBatchName()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {batchAverageAttributes ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(batchAverageAttributes).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key}</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No player data available for this batch</p>
                  )}
                  <Button onClick={() => setIsDialogOpen(true)} className="mt-4">
                    Compare Players
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-h-[80vh] max-w-[80vw] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Compare Players in {getBatchName()}
                ({filteredPlayers?.length || 0} players)
              </DialogTitle>
            </DialogHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <Input
                  placeholder="Search players"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedPlayers(batchPlayers.map(p => p.id.toString()))}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedPlayers([])}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="border rounded-md p-4 mb-6">
                <div className="grid grid-cols-3 gap-4 max-h-[200px] overflow-y-auto">
                  {filteredPlayers.map((player) => (
                    <div key={player.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                      <input
                        type="checkbox"
                        checked={selectedPlayers.includes(player.id.toString())}
                        onChange={() => handlePlayerSelection(player.id.toString())}
                        id={`player-${player.id}`}
                        className="mr-2"
                      />
                      <label 
                        htmlFor={`player-${player.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        {player.name} (ID: {player.id})
                      </label>
                    </div>
                  ))}
                </div>
                {filteredPlayers.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No players found in this batch
                  </div>
                )}
              </div>

              <div className="mt-6">
                <div className="w-full h-[500px]">
                  <Radar data={radarData} options={radarOptions} />
                </div>
              </div>
              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Attribute Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderAttributeComparison()}
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Graph</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex space-x-4 mb-4">
                      {["shooting", "pace", "positioning", "passing", "ballControl", "crossing"].map((attr) => (
                        <Button
                          key={attr}
                          variant={selectedAttribute === attr ? "default" : "outline"}
                          onClick={() => setSelectedAttribute(attr)}
                        >
                          {attr.charAt(0).toUpperCase() + attr.slice(1)}
                        </Button>
                      ))}
                    </div>
                    <div className="h-[400px]">
                      <Line 
                        data={generateComparisonData(selectedPlayers)} 
                        options={lineOptions} 
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
