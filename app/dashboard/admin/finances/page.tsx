"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CustomTooltip } from "@/components/custom-tooltip"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Sidebar } from "@/components/Sidebar" // Import the Sidebar component
import { useAuth } from "@/contexts/AuthContext" // Add this import
import { Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface FinancialRecord {
  id: string
  description: string
  amount: number
  type: "income" | "expense"
  date: string
  academyId: string // Add this field
}

export default function FinancesPage() {
  const { user } = useAuth() // Add this
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [newRecord, setNewRecord] = useState<Omit<FinancialRecord, "id" | "academyId">>({
    description: "",
    amount: 0,
    type: "expense",
    date: new Date().toISOString().split("T")[0],
  })
  const [visibleRecords, setVisibleRecords] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Add this state for dialog control
  const [currency, setCurrency] = useState<string>("INR"); // Current currency
  const [conversionRates, setConversionRates] = useState<{ [key: string]: number }>({}); // Conversion rates
  const [visibleTransactions, setVisibleTransactions] = useState(10); // Add state to control visible transactions

  const currencyOptions = [
    { label: "INR (₹)", value: "INR" },
    { label: "USD ($)", value: "USD" },
    { label: "EUR (€)", value: "EUR" },
    { label: "GBP (£)", value: "GBP" },
  ]; // Define available currencies

  const fetchConversionRates = async () => {
    try {
      const response = await fetch("https://api.exchangerate-api.com/v4/latest/INR"); // Base currency is INR
      if (!response.ok) throw new Error("Failed to fetch conversion rates");
      const data = await response.json();
      setConversionRates(data.rates);
    } catch (error) {
      console.error("Error fetching conversion rates:", error);
      toast({
        title: "Error",
        description: "Failed to fetch currency conversion rates",
        variant: "destructive",
      });
    }
  };

  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) return amount;
    const fromRate = conversionRates[fromCurrency] || 1;
    const toRate = conversionRates[toCurrency] || 1;
    return (amount / fromRate) * toRate;
  };

  const formatCurrency = (amount: number) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    });
    return formatter.format(amount);
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/db/ams-finance?academyId=${user?.academyId}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (formData: any) => {
    try {
      const response = await fetch('/api/db/ams-finance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          academyId: user?.academyId,
          date: formData.date // Use the input date instead of the current date
        }),
      });

      if (!response.ok) throw new Error('Failed to add transaction');

      toast({
        title: "Success",
        description: "Transaction added successfully",
      });

      // Refresh transactions
      fetchTransactions();
      // Close dialog or reset form
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      if (!recordId) {
        throw new Error('Transaction ID is undefined');
      }

      const response = await fetch(`/api/db/ams-finance/${recordId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete transaction');
      }

      // Remove transaction from state
      setTransactions(prev => prev.filter(t => t._id !== recordId));

      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });

    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  const handleViewMore = () => {
    setVisibleTransactions((prev) => prev + 10); // Increase the visible transactions count by 10
  };

  useEffect(() => {
    if (user?.academyId) {
      fetchTransactions();
    }
  }, [user?.academyId]);

  useEffect(() => {
    fetchConversionRates();
  }, []);

  const calculateTotals = () => {
    const totalIncome = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);

    const totalExpense = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    const convertedIncome = convertCurrency(totalIncome, "INR", currency); // Convert total income
    const convertedExpense = convertCurrency(totalExpense, "INR", currency); // Convert total expense

    return {
      totalIncome: convertedIncome,
      totalExpense: convertedExpense,
      balance: convertedIncome - convertedExpense, // Calculate balance after conversion
    };
  };

  const { totalIncome, totalExpense, balance } = calculateTotals();

  const getChartData = () => {
    const sortedRecords = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const labels = sortedRecords.map((record) => record.date)
    const incomeData = sortedRecords.map((record) => (record.type === "income" ? record.amount : 0))
    const expenseData = sortedRecords.map((record) => (record.type === "expense" ? record.amount : 0))

    return {
      labels,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
        {
          label: "Expense",
          data: expenseData,
          borderColor: "rgb(255, 99, 132)",
          tension: 0.1,
        },
      ],
    }
  }

  const getFilteredRecords = () => {
    return transactions
      .filter(record => 
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, visibleRecords)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar /> {/* Add the Sidebar component here */}
      <div className="flex-1 flex flex-col space-y-6 overflow-auto p-4">
        <div className="flex justify-between items-center">
          <CustomTooltip content="View and manage academy finances">
            <h1 className="text-3xl font-bold text-white">Finances</h1>
          </CustomTooltip>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              Academy ID: {user?.academyId}
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border rounded-md p-2 bg-white text-black"
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <CustomTooltip content="Total income from all sources">
            <Card>
              <CardHeader>
                <CardTitle>Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
              </CardContent>
            </Card>
          </CustomTooltip>
          <CustomTooltip content="Total expenses across all categories">
            <Card>
              <CardHeader>
                <CardTitle>Total Expense</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalExpense)}</p>
              </CardContent>
            </Card>
          </CustomTooltip>
          <CustomTooltip content="Current balance (Income - Expenses)">
            <Card>
              <CardHeader>
                <CardTitle>Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatCurrency(balance)}
                </p>
              </CardContent>
            </Card>
          </CustomTooltip>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line data={getChartData()} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </CardContent>
        </Card>

        <CustomTooltip content="Detailed breakdown of financial transactions">
          <Card>
            <CardHeader>
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <CardTitle>Financial Transactions</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Add Transaction</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Transaction</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="description" className="text-right">
                            Description
                          </Label>
                          <Input
                            id="description"
                            value={newRecord.description}
                            onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="amount" className="text-right">
                            Amount
                          </Label>
                          <Input
                            id="amount"
                            type="number"
                            value={newRecord.amount}
                            onChange={(e) => setNewRecord({ ...newRecord, amount: Number.parseFloat(e.target.value) })}
                            className="col-span-3"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="type" className="text-right">
                            Type
                          </Label>
                          <select
                            id="type"
                            value={newRecord.type}
                            onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value as "income" | "expense" })}
                            className="col-span-3"
                          >
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="date" className="text-right">
                            Date
                          </Label>
                          <Input
                            id="date"
                            type="date"
                            value={newRecord.date}
                            onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                            className="col-span-3"
                          />
                        </div>
                      </div>
                      <Button onClick={() => handleAddTransaction(newRecord)}>Add Transaction</Button>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions by description or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, visibleTransactions).map((record) => (
                    <TableRow key={record._id}>
                      <TableCell>{record.description}</TableCell>
                      <TableCell>
                        {formatCurrency(
                          convertCurrency(record.amount, "INR", currency) // Convert amount to selected currency
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{record.type}</TableCell>
                      <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRecord(record._id)} // Pass the correct ID
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {visibleTransactions < transactions.length && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={handleViewMore}
                >
                  View More ({transactions.length - visibleTransactions} remaining)
                </Button>
              )}
            </CardContent>
          </Card>
        </CustomTooltip>
      </div>
    </div>
  )
}

