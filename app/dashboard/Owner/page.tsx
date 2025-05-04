"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User2, Users2, PlayCircle, DollarSign, TrendingUp } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Sidebar from "@/components/Sidebar"
import { LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    students: 0,
    coaches: 0,
    ongoingSessions: 0,
    monthlyRevenue: 0,
    recentTransactions: [],
    balanceHistory: [] as { name: string; balance: number; }[]
  });

  useEffect(() => {
    // Get students and coaches count
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const studentCount = users.filter((user: any) => user.role === 'student').length;
    const coachCount = users.filter((user: any) => user.role === 'coach').length;

    // Get ongoing sessions count
    const sessions = JSON.parse(localStorage.getItem('ams-sessions') || '[]');
    const now = new Date();
    const ongoingCount = sessions.filter((session: any) => {
      const sessionDate = new Date(session.date);
      const sessionStart = new Date(`${session.date}T${session.startTime}`);
      const sessionEnd = new Date(`${session.date}T${session.endTime}`);
      return sessionDate.toDateString() === now.toDateString() && 
             now >= sessionStart && 
             now <= sessionEnd;
    }).length;

    // Get transactions and calculate metrics
    const transactions = JSON.parse(localStorage.getItem('ams-finance') || '[]');
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Calculate monthly revenue (February - January)
    const januaryTransactions = transactions.filter((t: any) => {
      const date = new Date(t.date);
      return date.getMonth() === 0 && date.getFullYear() === currentYear; // January is month 0
    });

    const februaryTransactions = transactions.filter((t: any) => {
      const date = new Date(t.date);
      return date.getMonth() === 1 && date.getFullYear() === currentYear; // February is month 1
    });

    const januaryBalance = januaryTransactions.reduce((sum: number, transaction: any) => 
      sum + (transaction.type === 'income' ? Number(transaction.amount) : -Number(transaction.amount)), 0);

    const februaryBalance = februaryTransactions.reduce((sum: number, transaction: any) => 
      sum + (transaction.type === 'income' ? Number(transaction.amount) : -Number(transaction.amount)), 0);

    // Get recent transactions (last 3) from finance page
    const recentTransactions = transactions
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    // Calculate balance history for chart
    const balanceHistory: { name: string; balance: number; }[] = [];
    let runningBalance = 0;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Group transactions by month
    const monthlyTransactions: any[][] = new Array(12).fill(null).map(() => []);
    transactions.forEach((t: any) => {
      const date = new Date(t.date);
      if (date.getFullYear() === currentYear) {
        monthlyTransactions[date.getMonth()].push(t);
      }
    });

    // Calculate running balance for each month
    monthlyTransactions.forEach((monthTxs, month) => {
      const monthlyBalance = monthTxs.reduce((sum: number, t: any) => 
        sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
      runningBalance += monthlyBalance;
      
      if (month <= currentMonth) {
        balanceHistory.push({
          name: monthNames[month],
          balance: runningBalance
        });
      }
    });

    setStats({
      students: studentCount,
      coaches: coachCount,
      ongoingSessions: ongoingCount,
      monthlyRevenue: februaryBalance - januaryBalance, // Revenue is the difference
      recentTransactions,
      balanceHistory
    });
  }, []);

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
              <div className="text-2xl font-bold">{stats.students}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coaches</CardTitle>
              <Users2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.coaches}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ongoing Sessions</CardTitle>
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ongoingSessions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.monthlyRevenue.toLocaleString()}</div>
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
              {stats.recentTransactions.map((transaction: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</p>
                  </div>
                  <div className={`font-bold ${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {transaction.type === 'income' ? '+' : '-'}₹{Number(transaction.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Balance History Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Balance History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.balanceHistory}
                  margin={{
                    top: 10,
                    right: 30,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Balance']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ... rest of your existing dashboard components ... */}
      </div>
    </div>
  )
}

