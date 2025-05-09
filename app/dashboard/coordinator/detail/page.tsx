"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User2, Users2, PlayCircle, DollarSign, TrendingUp } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Sidebar from "@/components/Sidebar"
import { LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/use-toast"

interface User {
  role: string;
  status: string;
}

interface Stats {
  totalStudents: number;
  totalCoaches: number;
  totalSessions: number;
  activeStudents: number;
  revenue: number;
  expenses: number;
}

const defaultStats: Stats = {
  totalStudents: 0,
  totalCoaches: 0,
  totalSessions: 0,
  activeStudents: 0,
  revenue: 0,
  expenses: 0
};

export default function AdminDetailPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>(defaultStats)
  const [sessions, setSessions] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (!user?.academyId) {
        throw new Error('Academy ID not found');
      }

      // Fetch all required data in parallel
      const [usersResponse, sessionsResponse, financeResponse] = await Promise.all([
        fetch(`/api/db/ams-users?academyId=${user.academyId}`),
        fetch(`/api/db/ams-sessions?academyId=${user.academyId}`),
        fetch(`/api/db/ams-finance?academyId=${user.academyId}`) // Fetch transactions from ams-finance
      ]);

      if (!usersResponse.ok || !sessionsResponse.ok || !financeResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const [usersResult, sessionsResult, financeResult] = await Promise.all([
        usersResponse.json(),
        sessionsResponse.json(),
        financeResponse.json()
      ]);

      console.log('Raw API responses:', {
        users: usersResult,
        sessions: sessionsResult,
        finance: financeResult
      });

      // Extract and ensure we have arrays
      const users = usersResult?.data || [];
      const sessions = sessionsResult?.data || [];
      const transactions = financeResult || []; // Transactions from ams-finance

      // Set state for sessions and transactions
      setSessions(sessions);
      setTransactions(transactions);

      // Calculate stats with null checks and proper filtering
      const now = new Date();
      const newStats = {
        totalStudents: users.filter((u: { role: string }) => u.role === 'student').length || 0,
        totalCoaches: users.filter((u: { role: string }) => u.role === 'coach').length || 0,
        totalSessions: sessions.filter((s: { date: string | number | Date; startTime: { split: (arg0: string) => { (): any; new(): any; map: { (arg0: NumberConstructor): [any, any]; new(): any } } }; endTime: { split: (arg0: string) => { (): any; new(): any; map: { (arg0: NumberConstructor): [any, any]; new(): any } } } }) => {
          const sessionDate = new Date(s.date);
          const [startHour, startMinute] = s.startTime.split(':').map(Number);
          const [endHour, endMinute] = s.endTime.split(':').map(Number);

          const sessionStart = new Date(sessionDate);
          sessionStart.setHours(startHour, startMinute, 0);

          const sessionEnd = new Date(sessionDate);
          sessionEnd.setHours(endHour, endMinute, 0);

          return now >= sessionStart && now <= sessionEnd;
        }).length || 0,
        activeStudents: users.filter((u: { role: string; status: string }) => u.role === 'student' && u.status === 'active').length || 0,
        revenue: transactions
          .filter((t: { type: string }) => t.type?.toLowerCase() === 'income')
          .reduce((sum: number, t: { amount: any }) => sum + (Number(t.amount) || 0), 0),
        expenses: transactions
          .filter((t: { type: string }) => t.type?.toLowerCase() === 'expense')
          .reduce((sum: number, t: { amount: any }) => sum + (Number(t.amount) || 0), 0)
      };

      console.log('Calculated stats:', newStats);
      setStats(newStats);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load academy details",
        variant: "destructive",
      });
      setStats(defaultStats);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyData = (transactions: any[]) => {
    if (!Array.isArray(transactions)) return [];

    const monthlyData = new Map();
    const today = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyData.set(monthKey, { name: monthKey, income: 0, expenses: 0 });
    }

    // Process transactions
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (monthlyData.has(monthKey)) {
        const data = monthlyData.get(monthKey);
        if (transaction.type?.toLowerCase() === 'income') {
          data.income += Number(transaction.amount) || 0;
        } else if (transaction.type?.toLowerCase() === 'expense') {
          data.expenses += Number(transaction.amount) || 0;
        }
      }
    });

    return Array.from(monthlyData.values());
  };

  useEffect(() => {
    if (user?.academyId) {
      fetchData();
    }
  }, [user?.academyId]);

  // Calculate recent activity
  const recentActivity = useMemo(() => {
    if (!Array.isArray(sessions)) return [];

    const allActivity = [
      ...(sessions || []).map(s => ({
        type: 'session',
        date: new Date(s.date),
        title: s.name,
        details: `${s.status} - ${new Date(s.date).toLocaleDateString()}`
      })),
      ...transactions.map(t => ({
        type: t.type,
        date: new Date(t.date),
        title: t.category,
        description: `${t.type === 'income' ? 'Received' : 'Spent'} ${t.amount} - ${t.description}`
      }))
    ];

    return allActivity
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3);
  }, [sessions, transactions]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 space-y-6 p-8 pt-6 overflow-auto">
        <div className="space-y-0.5">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your academy</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <User2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coaches</CardTitle>
              <Users2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCoaches}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ongoing Sessions</CardTitle>
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(stats.revenue || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length > 0 ? (
                transactions.slice(0, 3).map((transaction: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{transaction.description || "No description"}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Category: {transaction.category || "Uncategorized"}
                      </p>
                    </div>
                    <div className={`font-bold ${
                      transaction.type?.toLowerCase() === 'income' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {transaction.type?.toLowerCase() === 'income' ? '+' : '-'}₹{Number(transaction.amount).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent transactions available.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Balance History Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={calculateMonthlyData(transactions)}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stackId="1"
                    stroke="#4ade80"
                    fill="#4ade80"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.date.toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.details || activity.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

