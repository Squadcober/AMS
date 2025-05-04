"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/Sidebar"
import { Line, Bar, Radar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import PerformanceChart from "./components/PerformanceChart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
)

const calculateOverallRating = (attributes: any): number => {
  if (!attributes) return 0;
  
  const ratings = [
    Number(attributes.shooting) || 0,
    Number(attributes.pace) || 0,
    Number(attributes.positioning) || 0,
    Number(attributes.passing) || 0,
    Number(attributes.ballControl) || 0,
    Number(attributes.crossing) || 0
  ];
  
  const sum = ratings.reduce((acc, val) => acc + val, 0);
  const average = sum / ratings.length;
  
  return isNaN(average) ? 0 : Number(average.toFixed(1));
};

// Add this helper function to safely get match points
const getMatchPoints = (matchEntry: any): number => {
  if (!matchEntry?.stats?.matchPoints) return 0;
  const points = matchEntry.stats.matchPoints;
  
  // Handle the nested 'current' structure
  if (typeof points === 'object') {
    if (points.current) {
      // Navigate through nested current objects if they exist
      let currentValue = points.current;
      while (typeof currentValue === 'object' && currentValue.current) {
        currentValue = currentValue.current;
      }
      return Number(currentValue) || 0;
    }
    return Number(points.edited) || 0;
  }
  
  return Number(points) || 0;
};

export default function Performance() {
  const { user } = useAuth()
  const [playerData, setPlayerData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [chartData, setChartData] = useState({
    training: { labels: [], data: [] },
    match: { labels: [], data: [] },
    attributes: { labels: [], data: [] }
  })
  const [attributeHistory, setAttributeHistory] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState('weekly')

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        if (!user?.username) {
          throw new Error('User not found');
        }

        const response = await fetch(`/api/db/ams-player-data/user/${encodeURIComponent(user.username)}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch player data');
        }

        const data = await response.json();
        console.log("Raw player data:", data); // Debug log
        
        if (!data) {
          throw new Error('No player data found');
        }

        // Calculate overall rating from attributes
        const attributes = data.attributes || {};
        const overallRating = calculateOverallRating(attributes);

        // Process performance history
        const performanceHistory = data.performanceHistory || [];
        
        // Training performance calculation
        const trainingEntries = performanceHistory.filter((p: any) => 
          p.type === 'training' && p.attributes && Object.keys(p.attributes).length > 0
        );

        const trainingPerformance = trainingEntries.length > 0
          ? trainingEntries.reduce((acc: number, curr: any) => {
              const attrValues = Object.values(curr.attributes).filter((v: any) => typeof v === 'number' && v > 0);
              return acc + (attrValues.reduce((sum: number, val: number) => sum + val, 0) / attrValues.length);
            }, 0) / trainingEntries.length
          : 0;

        // Match performance calculation - only count matches with valid points
        const matchEntries = performanceHistory.filter((p: any) => 
          p.type === 'match' && p.stats?.matchPoints
        );

        const validMatchPoints = matchEntries
          .map(entry => getMatchPoints(entry))
          .filter(points => points > 0);

        const matchPerformance = validMatchPoints.length > 0
          ? validMatchPoints.reduce((sum, points) => sum + points, 0) / validMatchPoints.length
          : 0;

        // Calculate match stats
        const matchStats = performanceHistory
          .filter((p: any) => p.type === 'match' && p.stats)
          .reduce((acc: any, curr: any) => ({
            goals: acc.goals + (Number(curr.stats?.goals) || 0),
            assists: acc.assists + (Number(curr.stats?.assists) || 0),
            cleanSheets: acc.cleanSheets + (Number(curr.stats?.cleanSheets) || 0)
          }), { goals: 0, assists: 0, cleanSheets: 0 });

        // Process performance history for charts
        const trainingData = performanceHistory
          .filter((p: any) => p.type === 'training' || !p.type)
          .map((entry: any) => ({
            date: new Date(entry.date).toLocaleDateString(),
            rating: entry.sessionRating || entry.rating || 0,
            attributes: entry.attributes || {}
          }))
          .filter((entry: any) => entry.rating > 0);

        const matchData = performanceHistory
          .filter((p: any) => p.type === 'match')
          .map((entry: any) => ({
            date: new Date(entry.date).toLocaleDateString(),
            points: getMatchPoints(entry)
          }))
          .filter(entry => entry.points > 0); // Only include entries with valid points

        setChartData({
          training: {
            labels: trainingData.map(d => d.date),
            data: trainingData.map(d => d.rating)
          },
          match: {
            labels: matchData.map(d => d.date),
            data: matchData.map(d => d.points)
          },
          attributes: {
            labels: ["Shooting", "Pace", "Positioning", "Passing", "Ball Control", "Crossing"],
            data: [
              data.attributes?.shooting || 0,
              data.attributes?.pace || 0,
              data.attributes?.positioning || 0,
              data.attributes?.passing || 0,
              data.attributes?.ballControl || 0,
              data.attributes?.crossing || 0
            ]
          }
        });

        // Process attribute history for the growth chart
        const processedHistory = performanceHistory
          .filter((entry: any) => entry.attributes && Object.keys(entry.attributes).length > 0)
          .map((entry: any) => ({
            date: new Date(entry.date).toLocaleDateString(),
            shooting: entry.attributes?.shooting || null,
            pace: entry.attributes?.pace || null,
            positioning: entry.attributes?.positioning || null,
            passing: entry.attributes?.passing || null,
            ballControl: entry.attributes?.ballControl || null,
            crossing: entry.attributes?.crossing || null,
          }))
          .filter((entry: any) => 
            Object.values(entry).some(val => val !== null && val !== undefined)
          );

        setAttributeHistory(processedHistory);

        setPlayerData({
          id: data.id,
          name: data.name,
          age: data.age,
          calculatedMetrics: {
            overallRating: Number(overallRating.toFixed(1))*10, // This is already out of 10
            trainingPerformance: Number(trainingPerformance.toFixed(1)),
            matchPerformance: Number(matchPerformance.toFixed(1)),
            matchStats
          }
        });

      } catch (error) {
        console.error('Error fetching player data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load player data');
      } finally {
        setLoading(false);
      }
    };

    if (user?.username) {
      fetchPlayerData();
    }
  }, [user?.username]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "rgb(255, 255, 255)" }
      },
      x: {
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "rgb(255, 255, 255)" }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  const radarOptions = {
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        ticks: {
          display: false, // Hide numerical values
          backdropColor: 'transparent', // Remove background
        },
        grid: {
          color: "rgba(255, 255, 255, 0.05)", // More subtle grid
          circular: true,
        },
        pointLabels: {
          color: "rgb(255, 255, 255)",
          font: {
            size: 14,
            weight: 'bold'
          },
          padding: 25, // More spacing around labels
        },
        angleLines: {
          color: "rgba(255, 255, 255, 0.05)", // More subtle lines
        },
      }
    },
    plugins: {
      legend: {
        display: false,
      }
    },
    maintainAspectRatio: false,
  };

  // Add chart configuration
  const attributeColors = {
    shooting: "#ef4444",     // Red
    pace: "#3b82f6",        // Blue
    positioning: "#10b981",  // Green
    passing: "#f59e0b",     // Yellow
    ballControl: "#8b5cf6",  // Purple
    crossing: "#ec4899"      // Pink
  };

  // Add this function to filter data based on time range
  const filterDataByTimeRange = (data: any[], range: string) => {
    const now = new Date()
    const dates = data.map(d => new Date(d.date))
    
    switch(range) {
      case 'daily':
        return data.filter(d => {
          const date = new Date(d.date)
          return date.toDateString() === now.toDateString()
        })
      case 'weekly':
        const oneWeekAgo = new Date(now.setDate(now.getDate() - 7))
        return data.filter(d => new Date(d.date) >= oneWeekAgo)
      case 'monthly':
        const oneMonthAgo = new Date(now.setMonth(now.getMonth() - 1))
        return data.filter(d => new Date(d.date) >= oneMonthAgo)
      case 'yearly':
        const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1))
        return data.filter(d => new Date(d.date) >= oneYearAgo)
      default:
        return data
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 p-8 overflow-auto">
        {loading ? (
          <div>Loading performance data...</div>
        ) : error ? (
          <div>Error: {error}</div>
        ) : playerData ? (
          <div className="space-y-6">
            {/* Player Info Section */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">{playerData.name}</h1>
                <p className="text-muted-foreground">
                  Age: {playerData.age || 'N/A'}
                  <br />
                  ID: {playerData.id}
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>OVR</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {playerData.calculatedMetrics.overallRating}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Training Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {playerData.calculatedMetrics.trainingPerformance}/10
                  </div>
                  <p className="text-muted-foreground">TRAINING</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Match Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {playerData.calculatedMetrics.matchPerformance}/10
                  </div>
                  <p className="text-muted-foreground">MATCH</p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Growth Chart with Time Range Selector */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Attributes Growth</CardTitle>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="pt-6">
                <PerformanceChart
                  data={filterDataByTimeRange(attributeHistory, timeRange)}
                  attributes={["shooting", "pace", "positioning", "passing", "ballControl", "crossing"]}
                  colors={Object.values(attributeColors)}
                />
              </CardContent>
            </Card>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Training Performance Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <Line
                    data={{
                      labels: chartData.training.labels,
                      datasets: [{
                        data: chartData.training.data,
                        borderColor: "rgb(147, 51, 234)",
                        tension: 0.1
                      }]
                    }}
                    options={lineOptions}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Match Performance Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <Line
                    data={{
                      labels: chartData.match.labels,
                      datasets: [{
                        data: chartData.match.data,
                        borderColor: "rgb(52, 211, 153)",
                        tension: 0.1
                      }]
                    }}
                    options={lineOptions}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Attributes Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Player Attributes Overview</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center items-center">
                <div className="w-full max-w-[500px] h-[500px]">
                  <Radar
                    data={{
                      labels: chartData.attributes.labels,
                      datasets: [{
                        data: chartData.attributes.data,
                        backgroundColor: "rgba(99, 102, 241, 0.2)", // Indigo
                        borderColor: "rgba(99, 102, 241, 0.8)",
                        borderWidth: 2,
                        fill: true,
                        pointBackgroundColor: "rgb(99, 102, 241)",
                        pointBorderColor: "#fff",
                        pointHoverBackgroundColor: "#fff",
                        pointHoverBorderColor: "rgb(99, 102, 241)",
                        pointRadius: 4,
                      }]
                    }}
                    options={radarOptions}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Match Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Total Match Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">
                      {playerData.calculatedMetrics.matchStats.goals}
                    </div>
                    <p className="text-muted-foreground">Goals</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {playerData.calculatedMetrics.matchStats.assists}
                    </div>
                    <p className="text-muted-foreground">Assists</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {playerData.calculatedMetrics.matchStats.cleanSheets}
                    </div>
                    <p className="text-muted-foreground">Clean Sheets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}

