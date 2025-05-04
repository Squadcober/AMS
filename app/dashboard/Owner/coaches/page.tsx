"use client"

import { useState } from 'react'
import { useCoaches } from '@/contexts/CoachContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function CoachesPage() {
  const { user } = useAuth()
  const { coaches, addCoach, deleteCoach } = useCoaches()
  const [newCoach, setNewCoach] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    status: 'active' as const,
    userId: user?.id || ''
  })

  const handleAddCoach = () => {
    if (!newCoach.name || !newCoach.email || !newCoach.phone) {
      alert('Please fill in all required fields')
      return
    }

    addCoach(newCoach)
    setNewCoach({
      name: '',
      email: '',
      phone: '',
      specialization: '',
      status: 'active',
      userId: user?.id || ''
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Coaches</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Add New Coach</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newCoach.name}
                onChange={(e) => setNewCoach(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newCoach.email}
                onChange={(e) => setNewCoach(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newCoach.phone}
                onChange={(e) => setNewCoach(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={newCoach.specialization}
                onChange={(e) => setNewCoach(prev => ({ ...prev, specialization: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handleAddCoach}>Add Coach</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registered Coaches</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches.map((coach) => (
                <TableRow key={coach.id}>
                  <TableCell>{coach.name}</TableCell>
                  <TableCell>{coach.email}</TableCell>
                  <TableCell>{coach.phone}</TableCell>
                  <TableCell>{coach.specialization}</TableCell>
                  <TableCell>{coach.status}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteCoach(coach.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
