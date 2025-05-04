"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import Sidebar from "@/components/Sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/AuthContext"

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  createdAt: string;
  academyId: string;
}

export default function UserManagement() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState<string>("all")
  const [selectedAcademy, setSelectedAcademy] = useState<string>("all")
  const [newUser, setNewUser] = useState({
    name: "",
    username: "",
    email: "",
    role: "student",
    password: "",
    academyId: ""
  })
  const { toast } = useToast()
  const [academies, setAcademies] = useState<{ id: string, name: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const usersRes = await fetch('/api/db/ams-users')
        const usersData = await usersRes.json()
        setUsers(usersData.success && Array.isArray(usersData.data) ? usersData.data : [])

        const academyRes = await fetch('/api/db/ams-academy')
        const academyData = await academyRes.json()
        const academyList = academyData.success ? academyData.data : []
        setAcademies(
          academyList.map((a: any) => ({
            id: a.id || a._id,
            name: a.name || a.academyName || (a.id || a._id)
          }))
        )
      } catch (error) {
        setUsers([])
        setAcademies([])
        toast({
          title: "Error",
          description: "Failed to load users or academies",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleAddUser = async () => {
    try {
      setLoading(true)
      // Only send required fields for API
      const newUserData: any = {
        username: newUser.username || newUser.email, // Use username if provided, else email
        password: newUser.password || "changeme123",
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        academyId: newUser.academyId,
        createdAt: new Date(),
        status: "active"
      }

      // Validate required fields before sending
      if (!newUserData.name || !newUserData.email || !newUserData.role || !newUserData.academyId || !newUserData.username) {
        toast({
          title: "Error",
          description: "Name, Username, Email, Role, and Academy are required",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      // Use the signup API route for user creation (to ensure role-specific data is created)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData)
      })
      const data = await res.json()
      if (res.ok && data.success) {
        // Refresh user list from DB after add
        const usersRes = await fetch('/api/db/ams-users')
        const usersData = await usersRes.json()
        setUsers(usersData.success && Array.isArray(usersData.data) ? usersData.data : [])
        toast({
          title: "User added successfully",
          description: `${newUser.name} has been added as ${newUser.role}`,
        })
        setNewUser({
          name: "",
          username: "",
          email: "",
          role: "student",
          password: "",
          academyId: ""
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add user",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add user",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    try {
      setLoading(true)
      const res = await fetch(`/api/db/ams-users/${userId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        const usersRes = await fetch('/api/db/ams-users')
        const usersData = await usersRes.json()
        setUsers(usersData.success && Array.isArray(usersData.data) ? usersData.data : [])
        toast({
          title: "User deleted",
          description: "User has been deleted successfully",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete user",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async (userId: string) => {
    const userToUpdate = users.find(u => u.id === userId || u._id === userId)
    if (!userToUpdate) return
    const newStatus = userToUpdate.status === "active" ? "inactive" : "active"
    try {
      setLoading(true)
      const res = await fetch(`/api/db/ams-users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()
      if (data.success) {
        setUsers(prev =>
          prev.map(u =>
            (u.id === userId || u._id === userId)
              ? { ...u, status: newStatus }
              : u
          )
        )
        toast({
          title: "User status updated",
          description: `User status has been updated successfully`,
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update user status",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === "all" || user.role === selectedRole
    const matchesAcademy = selectedAcademy === "all" || user.academyId === selectedAcademy
    return matchesSearch && matchesRole && matchesAcademy
  })

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">User Management</h1>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Add New User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input
                    placeholder="Name"
                    value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  />
                  <Input
                    placeholder="Username"
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  />
                  <Select
                    value={newUser.role}
                    onValueChange={value => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="coordinator">Coordinator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={newUser.academyId}
                    onValueChange={value => setNewUser({ ...newUser, academyId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Academy" />
                    </SelectTrigger>
                    <SelectContent>
                      {academies.map(academy => (
                        <SelectItem key={academy.id} value={academy.id}>{academy.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddUser}>Add User</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4 mb-4">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
                <Select
                  value={selectedRole}
                  onValueChange={setSelectedRole}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="coordinator">Coordinator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={selectedAcademy}
                  onValueChange={setSelectedAcademy}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Academy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Academies</SelectItem>
                    {academies.map(academy => (
                      <SelectItem key={academy.id} value={academy.id}>{academy.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Academy</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6}>Loading...</TableCell>
                      </TableRow>
                    ) : filteredUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="capitalize">{user.role}</TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "default" : "secondary"}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {academies.find(a => a.id === user.academyId)?.name || user.academyId}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusToggle(user.id)}
                            >
                              Toggle Status
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

