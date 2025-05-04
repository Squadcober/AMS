"use client"

import { useState } from "react"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CustomTooltip } from "@/components/custom-tooltip"
import { AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Sidebar } from "@/components/Sidebar" // Import the Sidebar component

export default function Payments() {
  const router = useRouter()
  const { user } = useAuth()
  const [payments, setPayments] = useState([
    { id: 1, date: "2023-07-01", amount: 500, description: "Monthly Training Fee", status: "Paid" },
    { id: 2, date: "2023-08-01", amount: 500, description: "Monthly Training Fee", status: "Pending" },
    { id: 3, date: "2023-06-15", amount: 200, description: "Equipment Fee", status: "Paid" },
  ])

  const paymentMethods = [
    { id: 1, name: "Credit Card", icon: "💳", gatewayUrl: "/payment-gateway/credit-card" },
    { id: 2, name: "Bank Transfer", icon: "🏦", gatewayUrl: "/payment-gateway/bank-transfer" },
    { id: 3, name: "Digital Wallet", icon: "📱", gatewayUrl: "/payment-gateway/digital-wallet" },
  ]

  const handlePayment = (method: { id: number, name: string, icon: string, gatewayUrl: string }) => {
    // Redirect to payment gateway
    router.push(method.gatewayUrl)

    // Simulate payment completion
    setTimeout(() => {
      const newPayment = {
        id: payments.length + 1,
        date: new Date().toISOString().split("T")[0],
        amount: 500, // Example amount
        description: "Monthly Training Fee",
        status: "Paid",
      }
      setPayments([...payments, newPayment])

      // Update admin dashboard finances
      const finances = JSON.parse(localStorage.getItem("admin-finances") || "[]")
      finances.push({ ...newPayment, type: "income" })
      localStorage.setItem("admin-finances", JSON.stringify(finances))
    }, 3000) // Simulate 3 seconds delay for payment completion
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar /> {/* Add the Sidebar component here */}
      <div className="flex-1 flex flex-col space-y-6 overflow-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Payments</h1>
          <Button variant="default">Make Payment</Button>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important Notice</AlertTitle>
          <AlertDescription>
            Please read payment instructions carefully. All payments are non-refundable.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <CustomTooltip key={method.id} content={`Pay using ${method.name}`}>
                    <Button variant="outline" className="w-full justify-start" onClick={() => handlePayment(method)}>
                      <span className="mr-2 text-2xl">{method.icon}</span>
                      {method.name}
                    </Button>
                  </CustomTooltip>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.slice(0, 3).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>${payment.amount}</TableCell>
                      <TableCell>
                        <Badge variant={payment.status === "Paid" ? "default" : "destructive"}>{payment.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="link" className="mt-4">
                View All Payments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

