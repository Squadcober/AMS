"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import Sidebar from "@/components/Sidebar"

interface Coach {
  id: string
  name: string
  academyId: string
}

interface Player {
  id: string
  name: string
  position: string
  academyId: string
}

interface Batch {
  id: string
  name: string
  coachId: string | string[]
  coachName?: string
  coachNames?: string[]
  players: string[]
  academyId: string
  schedule?: {
    days: string[]
    time: string
  }
  status?: 'active' | 'inactive'
}

export default function BatchesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [batches, setBatches] = useState<Batch[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedAcademy, setSelectedAcademy] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [academies, setAcademies] = useState<{ id: string, name: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch academies
        const academyRes = await fetch('/api/db/ams-academy')
        const academyData = await academyRes.json()
        const academyList = academyData.success ? academyData.data : []
        const formattedAcademies = academyList.map((academy: any) => ({
          id: academy.id || academy._id,
          name: academy.academyName || academy.name || `Academy ${academy.id || academy._id}`
        }))
        setAcademies(formattedAcademies)
        if (selectedAcademy === "all" && formattedAcademies.length > 0) {
          setSelectedAcademy(formattedAcademies[0].id)
        }

        // Fetch batches for selected academy (or all if "all")
        let batchList: any[] = []
        if (selectedAcademy !== "all") {
          const batchRes = await fetch(`/api/db/ams-batches?academyId=${selectedAcademy}`)
          const batchData = await batchRes.json()
          batchList = batchData.success ? batchData.data : []
        } else {
          // Fetch all academies' batches and merge
          const batchResults = await Promise.all(
            formattedAcademies.map(a =>
              fetch(`/api/db/ams-batches?academyId=${a.id}`)
                .then(res => res.ok ? res.json() : { success: false, data: [] })
                .catch(() => ({ success: false, data: [] }))
            )
          )
          batchList = batchResults
            .filter(r => r.success && Array.isArray(r.data))
            .flatMap(r => r.data)
        }
        setBatches(batchList.map((batch: any) => ({
          ...batch,
          id: batch.id || batch._id,
        })))

        // Fetch users for coaches and players
        const usersRes = await fetch('/api/db/ams-users')
        const usersData = await usersRes.json()
        const users = usersData.success ? usersData.data : []
        setCoaches(users.filter((u: any) => u.role === 'coach').map((u: any) => ({
          id: u.id || u._id,
          name: u.name || u.username || "Coach",
          academyId: u.academyId
        })))
        setPlayers(users.filter((u: any) => u.role === 'student' || u.role === 'player').map((u: any) => ({
          id: u.id || u._id,
          name: u.name || u.username || "Player",
          position: u.position || "",
          academyId: u.academyId
        })))
      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line
  }, [selectedAcademy])

  // Update filteredBatches to properly filter based on academy
  const filteredBatches = batches.filter(batch => {
    const matchesAcademy = selectedAcademy === "all" || batch.academyId === selectedAcademy;
    const matchesSearch = batch.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && matchesAcademy;
  });

  const getCoachNames = (batch: Batch): string => {
    if (batch.coachNames && Array.isArray(batch.coachNames)) {
      return batch.coachNames.join(", ")
    }
    if (Array.isArray(batch.coachId)) {
      return batch.coachId
        .map(id => coaches.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join(", ")
    }
    const coach = coaches.find(c => c.id === batch.coachId)
    return coach?.name || "Unassigned"
  }

  const getPlayerNames = (playerIds: string[]): string => {
    return playerIds
      .map(id => players.find(p => p.id === id)?.name)
      .filter(Boolean)
      .join(", ")
  }

  const getAcademyName = (academyId: string): string => {
    return academies.find(a => a.id === academyId)?.name || academyId
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col space-y-6 overflow-auto p-8">
        <h1 className="text-3xl font-bold">Batches Overview</h1>

        <div className="flex gap-4">
          <Input
            placeholder="Search batches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select 
            onValueChange={(value) => {
              setSelectedAcademy(value);
            }} 
            value={selectedAcademy}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select Academy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Academies</SelectItem>
              {academies.map(academy => (
                <SelectItem key={academy.id} value={academy.id}>
                  {academy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Name</TableHead>
                    <TableHead>Academy</TableHead>
                    <TableHead>Coach(es)</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6}>Loading...</TableCell>
                    </TableRow>
                  ) : filteredBatches.length > 0 ? (
                    filteredBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell>{batch.name}</TableCell>
                        <TableCell>{getAcademyName(batch.academyId)}</TableCell>
                        <TableCell>{getCoachNames(batch)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {batch.players.length} players
                          </span>
                          <div className="text-xs text-muted-foreground mt-1">
                            {getPlayerNames(batch.players)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {batch.schedule ? (
                            <div>
                              <div>{batch.schedule.days?.join(", ")}</div>
                              <div className="text-sm text-muted-foreground">
                                {batch.schedule.time}
                              </div>
                            </div>
                          ) : (
                            "No schedule set"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={batch.status === 'active' ? 'default' : 'secondary'}>
                            {batch.status || 'active'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6}>No batches found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
