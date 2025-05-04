"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"
import { Sidebar } from "@/components/Sidebar" // Import the Sidebar component

interface Consultation {
  id: string
  userId: string
  userName: string
  userRole: string
  subject: string
  message: string
  category: string
  priority: "low" | "medium" | "high"
  status: "open" | "in-progress" | "resolved"
  createdAt: string
  responses: {
    id: string
    userId: string
    userName: string
    message: string
    createdAt: string
  }[]
}

export default function ConsultationsPage() {
  const { user } = useAuth()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [newResponse, setNewResponse] = useState("")
  const [filter, setFilter] = useState<"all" | "open" | "in-progress" | "resolved">("all")

  useEffect(() => {
    const stored = localStorage.getItem("consultations")
    if (stored) {
      setConsultations(JSON.parse(stored))
    }
  }, [])

  const handleStatusChange = (consultationId: string, status: Consultation["status"]) => {
    setConsultations((prev) => {
      const updated = prev.map((c) =>
        c.id === consultationId
          ? {
              ...c,
              status,
            }
          : c,
      )
      localStorage.setItem("consultations", JSON.stringify(updated))
      return updated
    })
  }

  const handleAddResponse = (consultationId: string) => {
    if (!newResponse.trim()) return

    setConsultations((prev) => {
      const updated = prev.map((c) =>
        c.id === consultationId
          ? {
              ...c,
              responses: [
                ...c.responses,
                {
                  id: Date.now().toString(),
                  userId: user?.id || "",
                  userName: user?.name || "Admin",
                  message: newResponse,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : c,
      )
      localStorage.setItem("consultations", JSON.stringify(updated))
      return updated
    })
    setNewResponse("")
  }

  const filteredConsultations = consultations.filter((c) => filter === "all" || c.status === filter)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar /> {/* Add the Sidebar component here */}
      <div className="flex-1 flex flex-col space-y-6 overflow-auto p-4">
        <h1 className="text-3xl font-bold text-white">Consultations</h1>
        <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <div className="grid gap-6">
          {filteredConsultations.map((consultation) => (
            <Card key={consultation.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{consultation.subject}</CardTitle>
                    <div className="text-sm text-gray-400 mt-1">
                      By {consultation.userName} ({consultation.userRole}) on{" "}
                      {new Date(consultation.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={consultation.priority === "high" ? "destructive" : "secondary"}>
                      {consultation.priority}
                    </Badge>
                    <Select
                      value={consultation.status}
                      onValueChange={(value) => handleStatusChange(consultation.id, value as any)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-gray-300">{consultation.message}</p>
                    <div className="text-sm text-gray-400 mt-2">Category: {consultation.category}</div>
                  </div>

                  {consultation.responses.length > 0 && (
                    <div className="space-y-4 mt-4">
                      <h3 className="font-semibold">Responses</h3>
                      {consultation.responses.map((response) => (
                        <div key={response.id} className="p-4 bg-gray-800 rounded-lg">
                          <div className="flex justify-between items-start">
                            <p className="text-gray-300">{response.message}</p>
                            <div className="text-sm text-gray-400">{new Date(response.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="text-sm text-gray-400 mt-2">By {response.userName}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Textarea
                      placeholder="Type your response..."
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                    />
                    <Button onClick={() => handleAddResponse(consultation.id)}>Reply</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

