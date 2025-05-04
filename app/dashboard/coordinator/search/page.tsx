"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import Sidebar from "@/components/Sidebar"
import { Search, Mail, Phone, Calendar, Award, Users, Star, Briefcase } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Radar, Line } from "react-chartjs-2"
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale } from "chart.js"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import PerformanceChart from "../../student/performance/components/PerformanceChart"
import { calculateAveragePerformance } from "@/utils/calculations"

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale)

interface PlayerAttributes {
  shooting: number;
  pace: number;
  positioning: number;
  passing: number;
  ballControl: number;
  crossing: number;
  stamina: number;
  overall: number;
}

const defaultAttributes: PlayerAttributes = {
  shooting: 0,
  pace: 0,
  positioning: 0,
  passing: 0,
  ballControl: 0,
  crossing: 0,
  stamina: 0,
  overall: 0
};

const formatPerformanceDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

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

const getMatchPoints = (matchEntry: any): number => {
  if (!matchEntry?.stats?.matchPoints) return 0;
  const points = matchEntry.stats.matchPoints;
  if (typeof points === 'object') {
    if (points.current) {
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

export default function SearchPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [playerData, setPlayerData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [selectedTab, setSelectedTab] = useState<"all" | "students" | "coaches">("all")
  const [filteredPlayers, setFilteredPlayers] = useState<string[]>([])
  const [visibleCount, setVisibleCount] = useState(20)
  const [batches, setBatches] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState("daily")
  const router = useRouter()

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
        display: false,
      },
    },
    maintainAspectRatio: false,
  }

  const lineOptions = {
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
    maintainAspectRatio: false,
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.academyId) return;

        // First fetch users
        const usersResponse = await fetch(`/api/db/ams-users?academyId=${user.academyId}`);
        if (!usersResponse.ok) throw new Error('Failed to fetch users');
        const usersResult = await usersResponse.json();

        let fetchedUsers = [];
        if (usersResult.success && Array.isArray(usersResult.data)) {
          // Fetch photos based on role
          const photoPromises = usersResult.data.map(async (user: any) => {
            try {
              if (user.role === 'student') {
                const playerResponse = await fetch(`/api/db/ams-player-data?ids=${user.id}`);
                const playerData = await playerResponse.json();
                return playerData.success && playerData.data[0]?.photoUrl;
              } else if (user.role === 'coach') {
                const coachResponse = await fetch(`/api/db/coach-profile/${user.id}`);
                const coachData = await coachResponse.json();
                return coachData.success && coachData.data?.photoUrl;
              }
            } catch (error) {
              console.error('Error fetching photo:', error);
              return null;
            }
          });

          const photos = await Promise.all(photoPromises);

          fetchedUsers = usersResult.data.map((user: any, index: number) => ({
            ...user,
            id: user.id?.toString() || user.id,
            name: user.name || user.username || 'Unknown User',
            photoUrl: photos[index] || '/placeholder.svg'
          }));
          
          console.log('Processed users with photos:', fetchedUsers);
          setUsers(fetchedUsers);
        }

        // Then fetch player data for all students
        const playerDataResponse = await fetch(`/api/db/ams-player-data?academyId=${user.academyId}`);
        if (!playerDataResponse.ok) throw new Error('Failed to fetch player data');
        
        const playerDataResult = await playerDataResponse.json();
        console.log('Raw player data:', playerDataResult);

        if (playerDataResult.success && Array.isArray(playerDataResult.data)) {
          const formattedPlayerData = playerDataResult.data.map((player: any) => ({
            ...player,
            id: player.id?.toString(),
            userId: player.userId || player.id,
            attributes: {
              ...defaultAttributes,
              ...(player.attributes || {}),
              overall: calculateOverall(player.attributes || {})
            },
            performanceHistory: player.performanceHistory || [],
            trainingHistory: player.trainingHistory || [],
            sessionsAttended: player.sessionsAttended || 0,
            position: player.position || 'Not specified',
            trainingPerformance: player.trainingPerformance || null,
            matchPerformance: player.matchPerformance || null,
            attributeHistory: player.attributeHistory || [],
            trainingChart: player.trainingChart || null,
            matchChart: player.matchChart || null,
            matchStats: player.matchStats || null
          }));
          console.log('Formatted player data:', formattedPlayerData);
          setPlayerData(formattedPlayerData);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.academyId]);

  const calculateOverall = (attributes: any) => {
    if (!attributes) return 0;
    
    const values = [
      attributes.shooting || 0,
      attributes.pace || 0,
      attributes.positioning || 0,
      attributes.passing || 0,
      attributes.ballControl || 0,
      attributes.crossing || 0
    ];
    
    return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
  };

  const getPlayerData = (userId: string) => {
    try {
      console.log('Getting player data for userId:', userId);
      
      const userData = users.find(u => u.id === userId);
      if (!userData) return null;

      const playerDetails = playerData.find(p => p.id === userId || p.userId === userId);
      if (!playerDetails) {
        return {
          ...userData,
          attributes: defaultAttributes,
          performanceHistory: [],
          trainingHistory: [],
          sessionsAttended: 0,
          position: 'Not specified'
        };
      }

      // Process performance history
      const performanceHistory = playerDetails.performanceHistory || [];
      
      // Calculate training performance
      const trainingEntries = performanceHistory.filter((p: any) => 
        p.type === 'training' && p.attributes && Object.keys(p.attributes).length > 0
      );

      const trainingPerformance = trainingEntries.length > 0
        ? trainingEntries.reduce((acc: number, curr: any) => {
            const attrValues = Object.values(curr.attributes).filter((v: any): v is number => typeof v === 'number' && v > 0);
            return acc + (attrValues.reduce((sum, val) => sum + val, 0) / attrValues.length);
          }, 0) / trainingEntries.length
        : 0;

      // Calculate match performance
      const matchEntries = performanceHistory.filter((p: any) => 
        p.type === 'match' && p.stats?.matchPoints
      );

      const validMatchPoints = matchEntries
        .map((entry: any) => getMatchPoints(entry))
        .filter((points: number) => points > 0);

      const matchPerformance = validMatchPoints.length > 0
        ? validMatchPoints.reduce((sum: number, points: number) => sum + points, 0) / validMatchPoints.length
        : 0;

      // Process chart data
      const trainingChart = {
        labels: trainingEntries.map((e: any) => new Date(e.date).toLocaleDateString()),
        data: trainingEntries.map((e: any) => e.sessionRating || 0)
      };

      const matchChart = {
        labels: matchEntries.map((e: any) => new Date(e.date).toLocaleDateString()),
        data: matchEntries.map((e: any) => getMatchPoints(e))
      };

      // Process attribute history
      const attributeHistory = performanceHistory
        .filter((entry: any) => entry.attributes && Object.keys(entry.attributes).length > 0)
        .map((entry: any) => ({
          date: new Date(entry.date).toLocaleDateString(),
          shooting: entry.attributes?.shooting || null,
          pace: entry.attributes?.pace || null,
          positioning: entry.attributes?.positioning || null,
          passing: entry.attributes?.passing || null,
          ballControl: entry.attributes?.ballControl || null,
          crossing: entry.attributes?.crossing || null,
        }));

      // Calculate match stats
      const matchStats = performanceHistory
        .filter((p: any) => p.type === 'match' && p.stats)
        .reduce((acc: any, curr: any) => ({
          goals: acc.goals + (Number(curr.stats?.goals) || 0),
          assists: acc.assists + (Number(curr.stats?.assists) || 0),
          cleanSheets: acc.cleanSheets + (Number(curr.stats?.cleanSheets) || 0)
        }), { goals: 0, assists: 0, cleanSheets: 0 });

      return {
        ...userData,
        ...playerDetails,
        name: userData.name || playerDetails.name,
        email: userData.email,
        photoUrl: playerDetails.photoUrl || userData.photoUrl,
        attributes: playerDetails.attributes || defaultAttributes,
        performanceHistory,
        trainingHistory: playerDetails.trainingHistory || [],
        trainingPerformance,
        matchPerformance,
        attributeHistory,
        trainingChart,
        matchChart,
        matchStats,
        sessionsAttended: playerDetails.sessionsAttended || 0,
        position: playerDetails.position || 'Not specified'
      };

    } catch (error) {
      console.error('Error in getPlayerData:', error);
      return null;
    }
  };

  const getCoachData = async (userId: string, academyId: string) => {
    try {
      // Ensure we have a user ID in the correct format
      if (!userId.startsWith('user_')) {
        console.error('Invalid user ID format:', userId);
        return null;
      }

      const [userInfoResponse, coachProfileResponse, batchesResponse, credentialsResponse] = await Promise.all([
        fetch(`/api/db/ams-user-info?userId=${userId}`),
        fetch(`/api/db/coach-profile/${userId}`),
        fetch(`/api/db/ams-batches?academyId=${academyId}&coachId=${userId}`),
        fetch(`/api/db/ams-credentials?userId=${userId}&academyId=${academyId}`)
      ]);

      const userInfo = await userInfoResponse.json();
      const coachProfile = await coachProfileResponse.json();
      const batches = await batchesResponse.json();
      const credentials = await credentialsResponse.json();

      // Log the fetched data
      console.log('Fetched coach data:', {
        userInfo: userInfo.data,
        coachProfile: coachProfile.data,
        batches: batches.data,
        credentials: credentials.data
      });

      const userData = userInfo.success ? userInfo.data : {};
      const profileData = coachProfile.success ? coachProfile.data : {};
      const batchesData = batches.success ? batches.data : [];
      const credentialsData = credentials.success ? credentials.data : [];

      return {
        id: userId,
        name: userData.name || profileData.name,
        email: userData.email,
        phone: userData.phone,
        photoUrl: userData.photoUrl || profileData.photoUrl,
        specialization: userData.specialization || profileData.specialization,
        experience: userData.experience || profileData.experience || 0,
        rating: profileData.rating || 'N/A',
        joiningDate: userData.joiningDate,
        bio: userData.bio || profileData.bio,
        achievements: userData.achievements || profileData.achievements || [],
        certifications: userData.certifications || profileData.certifications || [],
        expertise: userData.expertise || profileData.specializations || [],
        previousRoles: userData.previousRoles || [],
        batches: batchesData.map((batch: any) => ({
          id: batch._id,
          name: batch.name,
          players: batch.players || [],
          schedule: batch.schedule || 'Not set',
          totalPlayers: batch.players?.length || 0
        })),
        totalBatches: batchesData.length,
        userInfo: {
          bio: userData.bio || '',
          address: userData.address || '',
          phone: userData.phone || '',
          socialLinks: userData.socialLinks || {},
          qualifications: userData.qualifications || []
        },
        credentials: credentialsData.map((cred: any) => ({
          id: cred._id,
          title: cred.title,
          issuer: cred.issuer,
          date: cred.date,
          verificationUrl: cred.verificationUrl,
          description: cred.description
        }))
      };
    } catch (error) {
      console.error('Error fetching coach data:', error);
      return null;
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      // Validate required fields
      const requiredFields = ['username', 'password', 'email', 'name', 'role', 'academyId'];
      const missingFields = requiredFields.filter(field => !userData[field]);

      if (missingFields.length > 0) {
        toast({
          title: "Missing Required Fields",
          description: `Please fill in: ${missingFields.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Format user data
      const newUser = {
        ...userData,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        id: `user_${Math.random().toString(36).substr(2)}_${Date.now()}`,
        academyId: user?.academyId // Ensure academyId is set from current user context
      };

      const response = await fetch('/api/db/ams-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }

      const createdUser = await response.json();
      
      // Update local state
      setUsers(prev => [...prev, createdUser]);

      toast({
        title: "Success",
        description: "User created successfully",
      });

      return createdUser;

    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create user",
        variant: "destructive",
      });
      return null;
    }
  };

  const getFilteredUsers = () => {
    if (!Array.isArray(users)) {
      console.error('Users is not an array:', users);
      return [];
    }

    return users
      .filter((user: any) => {
        if (!user) return false;
        
        const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesTab = selectedTab === "all" ? true :
                          selectedTab === "students" ? user.role === "student" :
                          selectedTab === "coaches" ? user.role === "coach" : false
        
        // Exclude admin users
        const isNotAdmin = user.role !== "admin"
        
        return matchesSearch && matchesTab && isNotAdmin
      })
      .slice(0, visibleCount)
  }

  // Helper to filter attribute history by time range
  function filterDataByTimeRange(attributeHistory: any[], timeRange: string) {
    if (!Array.isArray(attributeHistory)) return [];
    const now = new Date();
    let filtered = attributeHistory;
  
    switch (timeRange) {
      case "daily":
        filtered = attributeHistory.filter((entry) => {
          const entryDate = new Date(entry.date);
          return (
            entryDate.getDate() === now.getDate() &&
            entryDate.getMonth() === now.getMonth() &&
            entryDate.getFullYear() === now.getFullYear()
          );
        });
        break;
      case "weekly":
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        filtered = attributeHistory.filter((entry) => {
          const entryDate = new Date(entry.date);
          return entryDate >= weekAgo && entryDate <= now;
        });
        break;
      case "monthly":
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        filtered = attributeHistory.filter((entry) => {
          const entryDate = new Date(entry.date);
          return entryDate >= monthAgo && entryDate <= now;
        });
        break;
      case "yearly":
        const yearAgo = new Date(now);
        yearAgo.setFullYear(now.getFullYear() - 1);
        filtered = attributeHistory.filter((entry) => {
          const entryDate = new Date(entry.date);
          return entryDate >= yearAgo && entryDate <= now;
        });
        break;
      default:
        break;
    }
    return filtered;
  }
  
  // Define colors for each attribute
  const attributeColors: { [key: string]: string } = {
    shooting: "#f59e42",
    pace: "#3b82f6",
    positioning: "#10b981",
    passing: "#f43f5e",
    ballControl: "#a21caf",
    crossing: "#fbbf24"
  };

  // Helper to calculate sessions attended from performance history
  function calculateSessionsAttended(performanceHistory: any[]): number {
    if (!Array.isArray(performanceHistory)) return 0;
    return performanceHistory.filter((entry) => entry.type === 'training').length;
  }

  const renderUserProfile = (user: any) => {
    if (user.role === "student") {
      const playerData = getPlayerData(user.id);
      console.log('Rendering player data:', playerData);

      if (!playerData) {
        return (
          <div className="p-4 text-center text-muted-foreground">
            <p>No player data found</p>
            <p className="text-sm">User ID: {user.id}</p>
            <p className="text-sm">Username: {user.username}</p>
          </div>
        );
      }

      const attributes = playerData.attributes || defaultAttributes;
      
      const radarData = {
        labels: ["Shooting", "Pace", "Positioning", "Passing", "Ball Control", "Crossing"],
        datasets: [{
          label: "Attributes",
          data: [
            Number(attributes.shooting) || 0,
            Number(attributes.pace) || 0,
            Number(attributes.positioning) || 0,
            Number(attributes.passing) || 0,
            Number(attributes.ballControl) || 0,
            Number(attributes.crossing) || 0,
          ],
          backgroundColor: "rgba(147, 51, 234, 0.2)",
          borderColor: "rgb(147, 51, 234)",
          borderWidth: 1,
          fill: true,
        }],
      };

      return (
        <>
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-white">{playerData.name}</h1>
                  <p className="text-gray-400">
                    Age: {playerData.age} | {playerData.position}
                  </p>
                  <div className="mt-4">
                    <h2 className="text-lg font-semibold mb-2">Playing Style</h2>
                    <p className="text-gray-300">{playerData.playingStyle || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-4">
                  <div className="w-32 h-32 relative overflow-hidden rounded-lg">
                    <img
                      src={playerData.photoUrl || "/placeholder.svg"}
                      alt={playerData.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <p className="text-xl text-gray-400">ID: {playerData.id}</p>
                  <Badge variant={calculateOverallRating(playerData?.attributes) >= 80 ? "default" : "secondary"}>
                    OVR {calculateOverallRating(playerData?.attributes)}%
                  </Badge>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Player Attributes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left column: Radar chart */}
                    <div className="h-[300px]">
                      <Radar data={radarData} options={radarOptions} />
                    </div>
                    
                    {/* Right column: Attributes in single column */}
                    <div className="space-y-4">
                      {[
                        { label: "Shooting", value: playerData.attributes?.shooting || 0 },
                        { label: "Pace", value: playerData.attributes?.pace || 0 },
                        { label: "Positioning", value: playerData.attributes?.positioning || 0 },
                        { label: "Passing", value: playerData.attributes?.passing || 0 },
                        { label: "Ball Control", value: playerData.attributes?.ballControl || 0 },
                        { label: "Crossing", value: playerData.attributes?.crossing || 0 },
                      ].map((attr) => (
                        <div key={attr.label} className="space-y-2">
                          <div className="flex justify-between">
                            <Label>{attr.label}</Label>
                            <span className="font-bold">{attr.value}/10</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${(attr.value / 10) * 100}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Training Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-around items-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {calculateAveragePerformance(playerData?.performanceHistory)}/10
                      </div>
                      <div className="text-sm text-gray-400">AVERAGE PERFORMANCE</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">
                        {calculateSessionsAttended(playerData?.performanceHistory) || 0}
                      </div>
                      <div className="text-sm text-gray-400">SESSIONS ATTENDED</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>OVR</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {calculateOverallRating(playerData.attributes) * 10}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Training Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {playerData.trainingPerformance?.toFixed(1) || "N/A"}/10
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
                      {playerData.matchPerformance?.toFixed(1) || "N/A"}/10
                    </div>
                    <p className="text-muted-foreground">MATCH</p>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Growth Chart */}
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
                    data={filterDataByTimeRange(playerData.attributeHistory || [], timeRange)}
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
                        labels: playerData.trainingChart?.labels || [],
                        datasets: [{
                          data: playerData.trainingChart?.data || [],
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
                        labels: playerData.matchChart?.labels || [],
                        datasets: [{
                          data: playerData.matchChart?.data || [],
                          borderColor: "rgb(52, 211, 153)",
                          tension: 0.1
                        }]
                      }}
                      options={lineOptions}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Player Attributes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <Radar data={radarData} options={radarOptions} />
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
                        {playerData.matchStats?.goals || 0}
                      </div>
                      <p className="text-muted-foreground">Goals</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {playerData.matchStats?.assists || 0}
                      </div>
                      <p className="text-muted-foreground">Assists</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {playerData.matchStats?.cleanSheets || 0}
                      </div>
                      <p className="text-muted-foreground">Clean Sheets</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      );
    }

    if (user.role === "coach") {
      return renderCoachProfile(user);
    }
  }

  const renderCoachProfile = async (user: any) => {
    const coachData = await getCoachData(user.id, user.academyId);
    if (!coachData) return null;

    return (
      <>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="credentials">Credentials</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={coachData.photoUrl} />
                <AvatarFallback>{coachData.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{coachData.name}</h2>
                <p className="text-muted-foreground">{coachData.specialization || 'Coach'}</p>
                <p className="text-sm text-muted-foreground">Joined: {new Date(coachData.joiningDate).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Bio Section */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{coachData.bio || 'No bio available'}</p>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 opacity-70" />
                  <span>{coachData.email}</span>
                </div>
                {coachData.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 opacity-70" />
                    <span>{coachData.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batches" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Batches ({coachData.totalBatches})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Name</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Schedule</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {coachData.batches?.length > 0 ? (
                        coachData.batches.map((batch: any) => (
                          <TableRow key={batch.id}>
                            <TableCell className="font-medium">{batch.name}</TableCell>
                            <TableCell>{batch.totalPlayers} students</TableCell>
                            <TableCell>{batch.schedule}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No batches assigned
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credentials" className="space-y-6">
            {/* Professional Info */}
            <Card>
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {coachData.userInfo.qualifications?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Qualifications</h3>
                    <div className="space-y-2">
                      {coachData.userInfo.qualifications.map((qual: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="mr-2">
                          {qual}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {coachData.userInfo.bio && (
                  <div>
                    <h3 className="font-semibold mb-2">Biography</h3>
                    <p className="text-sm text-muted-foreground">{coachData.userInfo.bio}</p>
                  </div>
                )}

                {coachData.userInfo.socialLinks && Object.keys(coachData.userInfo.socialLinks).length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Social Links</h3>
                    <div className="space-y-1">
                      {Object.entries(coachData.userInfo.socialLinks).map(([platform, url]) => (
                        <div key={platform} className="flex items-center space-x-2">
                          <span className="capitalize">{platform}:</span>
                          <a href={url as string} target="_blank" rel="noopener noreferrer" 
                             className="text-blue-500 hover:text-blue-600">
                            {url as string}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Credentials */}
            <Card>
              <CardHeader>
                <CardTitle>Certifications & Credentials</CardTitle>
              </CardHeader>
              <CardContent>
                {coachData.credentials?.length > 0 ? (
                  <div className="space-y-4">
                    {coachData.credentials.map((cred: any, index: number) => (
                      <div key={cred.id} className="border-b border-gray-700 last:border-0 pb-4 last:pb-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{cred.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              Issued by {cred.issuer} • {new Date(cred.date).toLocaleDateString()}
                            </p>
                            {cred.description && (
                              <p className="text-sm mt-1">{cred.description}</p>
                            )}
                          </div>
                          {cred.verificationUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={cred.verificationUrl} target="_blank" rel="noopener noreferrer">
                                Verify
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No credentials listed</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8 flex items-center justify-center">
          <div>Loading user data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Search Users</h2>
          
          <div className="flex space-x-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
          
            <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="coaches">Coaches</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredUsers().map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={user.photoUrl || '/placeholder.svg'} 
                              alt={user.name}
                              className="object-cover"
                            />
                            <AvatarFallback>{user.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.role === "student" ? "Student" : "Coach"}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
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

          {visibleCount < users.filter(u => u.role !== "admin").length && (
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => setVisibleCount(prev => prev + 20)}
            >
              Load More ({users.filter(u => u.role !== "admin").length - visibleCount} remaining)
            </Button>
          )}
        </div>

        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Profile</DialogTitle>
            </DialogHeader>
            {selectedUser && renderUserProfile(selectedUser)}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

