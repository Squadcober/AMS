"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/Sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface User {
  id: string
  name: string
  role: "student" | "coach"
  email: string
  age?: number
  position?: string
  specialization?: string
  experience?: number
  academyId?: string
  userId?: string
}

export default function SearchPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [academies, setAcademies] = useState<any[]>([])
  const [selectedAcademy, setSelectedAcademy] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [playerDetails, setPlayerDetails] = useState<any>(null)
  const [coachDetails, setCoachDetails] = useState<any>(null)
  const [coachUserInfo, setCoachUserInfo] = useState<any>(null)
  const [coachCredentials, setCoachCredentials] = useState<any>(null)
  const [coachBatches, setCoachBatches] = useState<any[]>([])
  const [playerAchievements, setPlayerAchievements] = useState<any[]>([])
  const [userInfo, setUserInfo] = useState<any>(null)
  const [userCredentials, setUserCredentials] = useState<any>(null)
  const [userInfoDetails, setUserInfoDetails] = useState<any>(null)

  // Helper to get correct username and role for student/coach
  function getDisplayUsername(user: any, playerDetails: any, coachUserInfo: any) {
    if (user.role === "student") {
      return playerDetails?.username || user.username || user.name || "N/A";
    }
    if (user.role === "coach") {
      return coachUserInfo?.username || user.username || user.name || "N/A";
    }
    return user.username || user.name || "N/A";
  }

  function getDisplayRole(user: any, playerDetails: any, coachUserInfo: any) {
    // Always use user.role for the main role
    return user.role ? String(user.role).toLowerCase() : "N/A";
  }

  useEffect(() => {
    const fetchAcademies = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/db/ams-academy')
        const data = await res.json()
        const academyList = data.success ? data.data : []
        setAcademies(academyList)
        if (academyList.length > 0 && !selectedAcademy) {
          setSelectedAcademy(academyList[0].id || academyList[0]._id)
        }
      } catch {
        setAcademies([])
      } finally {
        setLoading(false)
      }
    }
    fetchAcademies()
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (!selectedAcademy) return
    setLoading(true)
    const fetchUsers = async () => {
      try {
        const res = await fetch(`/api/db/ams-users?academyId=${selectedAcademy}`)
        const data = await res.json()
        if (data.success && Array.isArray(data.data)) {
          setUsers(data.data.filter((user: User) => user.role === "student" || user.role === "coach"))
        } else {
          setUsers([])
        }
      } catch {
        setUsers([])
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [selectedAcademy])

  useEffect(() => {
    if (!selectedUser) {
      setPlayerDetails(null)
      setCoachDetails(null)
      setCoachUserInfo(null)
      setCoachCredentials(null)
      setCoachBatches([])
      setPlayerAchievements([])
      setUserInfo(null)
      setUserCredentials(null)
      setUserInfoDetails(null)
      return
    }
    if (selectedUser.role === "student") {
      const fetchPlayer = async () => {
        let player = null
        let res = await fetch(`/api/db/ams-player-data?ids=${selectedUser.id}`)
        let data = await res.json()
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          player = data.data[0]
        }
        if (!player && selectedUser.userId) {
          res = await fetch(`/api/db/ams-player-data?ids=${selectedUser.userId}`)
          data = await res.json()
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            player = data.data[0]
          }
        }
        setPlayerDetails(player)
      }
      fetchPlayer().catch(() => setPlayerDetails(null))
      fetch(`/api/db/ams-achievement?playerId=${selectedUser.id}&academyId=${selectedUser.academyId || ""}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setPlayerAchievements(data.data)
          } else {
            setPlayerAchievements([])
          }
        })
        .catch(() => setPlayerAchievements([]))
      fetch(`/api/db/ams-users?id=${selectedUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setUserInfo(data.data[0])
          } else {
            setUserInfo(null)
          }
        })
        .catch(() => setUserInfo(null))
      fetch(`/api/db/ams-credentials?userId=${selectedUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setUserCredentials(data.data[0])
          } else {
            setUserCredentials(null)
          }
        })
        .catch(() => setUserCredentials(null))
      const userId = selectedUser.userId || selectedUser.id
      if (userId && typeof userId === "string" && userId.startsWith("user_")) {
        fetch(`/api/db/ams-user-info?userId=${userId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
              setUserInfoDetails(data.data[0])
            } else {
              setUserInfoDetails(null)
            }
          })
          .catch(() => setUserInfoDetails(null))
      } else {
        setUserInfoDetails(null)
      }
      setCoachDetails(null)
      setCoachUserInfo(null)
      setCoachCredentials(null)
      setCoachBatches([])
    } else if (selectedUser.role === "coach") {
      fetch(`/api/db/ams-users?id=${selectedUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setCoachUserInfo(data.data[0])
          } else {
            setCoachUserInfo(null)
          }
        })
        .catch(() => setCoachUserInfo(null))
      fetch(`/api/db/ams-coaches?id=${selectedUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setCoachDetails(data.data[0])
          } else {
            setCoachDetails(null)
          }
        })
        .catch(() => setCoachDetails(null))
      fetch(`/api/db/ams-credentials?userId=${selectedUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setCoachCredentials(data.data[0])
          } else {
            setCoachCredentials(null)
          }
        })
        .catch(() => setCoachCredentials(null))
      fetch(`/api/db/ams-batches?coachId=${selectedUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setCoachBatches(data.data)
          } else {
            setCoachBatches([])
          }
        })
        .catch(() => setCoachBatches([]))
      fetch(`/api/db/ams-users?id=${selectedUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setUserInfo(data.data[0])
          } else {
            setUserInfo(null)
          }
        })
        .catch(() => setUserInfo(null))
      fetch(`/api/db/ams-credentials?userId=${selectedUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setUserCredentials(data.data[0])
          } else {
            setUserCredentials(null)
          }
        })
        .catch(() => setUserCredentials(null))
      const userId = selectedUser.userId || selectedUser.id
      if (userId && typeof userId === "string" && userId.startsWith("user_")) {
        fetch(`/api/db/ams-user-info?userId=${userId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
              setUserInfoDetails(data.data[0])
            } else {
              setUserInfoDetails(null)
            }
          })
          .catch(() => setUserInfoDetails(null))
      } else {
        setUserInfoDetails(null)
      }
      setPlayerDetails(null)
      setPlayerAchievements([])
    }
  }, [selectedUser])

  const filteredUsers = users.filter(
    (user) =>
      (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col space-y-6 overflow-auto p-4">
        <h1 className="text-3xl font-bold text-white">Search</h1>

        <Card>
          <CardHeader>
            <CardTitle>Search Players and Coaches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-4">
              <Select onValueChange={setSelectedAcademy} value={selectedAcademy}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select Academy" />
                </SelectTrigger>
                <SelectContent>
                  {academies.map(academy => (
                    <SelectItem key={academy.id || academy._id} value={academy.id || academy._id}>
                      {academy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>Loading...</TableCell>
                  </TableRow>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell className="capitalize">{user.role}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" onClick={() => setSelectedUser(user)}>
                              View Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent
                            style={{
                              maxWidth: "700px",
                              width: "100%",
                              maxHeight: "80vh",
                              minHeight: "400px",
                              overflow: "hidden",
                              padding: 0,
                              display: "flex",
                              flexDirection: "column"
                            }}
                          >
                            <DialogHeader>
                              <DialogTitle>{user.name}'s Details</DialogTitle>
                            </DialogHeader>
                            <div
                              style={{
                                overflowY: "auto",
                                overflowX: "auto",
                                padding: "1.5rem",
                                maxHeight: "calc(80vh - 60px)",
                                minHeight: "300px",
                                wordBreak: "break-word"
                              }}
                              className="space-y-6"
                            >
                              {/* Basic Info */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <span className="font-bold block">Name:</span>
                                  <span>{user.name}</span>
                                </div>
                                <div>
                                  <span className="font-bold block">Role:</span>
                                  <span className="capitalize">{getDisplayRole(user, playerDetails, coachUserInfo)}</span>
                                </div>
                                <div>
                                  <span className="font-bold block">Email:</span>
                                  <span>{user.email}</span>
                                </div>
                                <div>
                                  <span className="font-bold block">Username:</span>
                                  <span>{getDisplayUsername(user, playerDetails, coachUserInfo)}</span>
                                </div>
                              </div>
                              {/* Show extra details from ams-player-data for students */}
                              {user.role === "student" && playerDetails && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <span className="font-bold block">Player ID:</span>
                                    <span>{playerDetails.id}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">Username:</span>
                                    <span>{playerDetails.username}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">Position:</span>
                                    <span>{playerDetails.position}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">Primary Position:</span>
                                    <span>{playerDetails.primaryPosition}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">Age:</span>
                                    <span>{playerDetails.age}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">Phone:</span>
                                    <span>{playerDetails.phone}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">Emergency Contact:</span>
                                    <span>{playerDetails.emergencyContact}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">School:</span>
                                    <span>{playerDetails.school}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">Height:</span>
                                    <span>{playerDetails.height}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">Weight:</span>
                                    <span>{playerDetails.weight}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">Blood Group:</span>
                                    <span>{playerDetails.bloodGroup}</span>
                                  </div>
                                </div>
                              )}
                              {/* Show attributes from last performance history update if available */}
                              {user.role === "student" && playerDetails && (
                                <div>
                                  <span className="font-bold block mb-2">Latest Attributes:</span>
                                  <div className="flex flex-wrap gap-4">
                                    {(() => {
                                      let attrs = playerDetails.attributes;
                                      if (
                                        Array.isArray(playerDetails.performanceHistory) &&
                                        playerDetails.performanceHistory.length > 0
                                      ) {
                                        for (let i = playerDetails.performanceHistory.length - 1; i >= 0; i--) {
                                          const perf = playerDetails.performanceHistory[i];
                                          if (perf && perf.attributes) {
                                            attrs = perf.attributes;
                                            break;
                                          }
                                        }
                                      }
                                      return attrs
                                        ? Object.entries(attrs).map(([k, v]) => (
                                            <span key={k} className="bg-gray-100 text-gray-800 rounded px-2 py-1 text-sm">{k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                                          ))
                                        : "N/A";
                                    })()}
                                  </div>
                                </div>
                              )}
                              {/* Show total goals, assists, matchpoints, trainingpoints from sessions/performanceHistory */}
                              {user.role === "student" && playerDetails && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <span className="font-bold block">Total Goals:</span>
                                    <span>
                                      {(() => {
                                        if (Array.isArray(playerDetails.performanceHistory)) {
                                          return playerDetails.performanceHistory.reduce(
                                            (sum: number, ph: any) => sum + (ph.goals || 0), 0
                                          );
                                        }
                                        return 0;
                                      })()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">Total Assists:</span>
                                    <span>
                                      {(() => {
                                        if (Array.isArray(playerDetails.performanceHistory)) {
                                          return playerDetails.performanceHistory.reduce(
                                            (sum: number, ph: any) => sum + (ph.assists || 0), 0
                                          );
                                        }
                                        return 0;
                                      })()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">Total Match Points:</span>
                                    <span>
                                      {(() => {
                                        if (Array.isArray(playerDetails.performanceHistory)) {
                                          return playerDetails.performanceHistory.reduce(
                                            (sum: number, ph: any) => sum + (ph.matchPoints?.current || ph.matchPoints || 0), 0
                                          );
                                        }
                                        return 0;
                                      })()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-bold block">Total Training Points:</span>
                                    <span>
                                      {(() => {
                                        if (Array.isArray(playerDetails.performanceHistory)) {
                                          return playerDetails.performanceHistory.reduce(
                                            (sum: number, ph: any) => sum + (ph.trainingPoints?.current || ph.trainingPoints || 0), 0
                                          );
                                        }
                                        return 0;
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              )}
                              {/* Show achievements for students */}
                              {user.role === "student" && playerAchievements && playerAchievements.length > 0 && (
                                <>
                                  <div className="col-span-4 font-bold mt-4">Achievements:</div>
                                  {playerAchievements.map((ach, idx) => (
                                    <div key={ach._id || idx} className="col-span-4 border-b pb-2 mb-2">
                                      {Object.entries(ach).map(([k, v]) => (
                                        <div key={k} className="flex text-xs">
                                          <span className="font-semibold mr-2">{k}:</span>
                                          <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </>
                              )}
                              {/* Show user info and credentials for students */}
                              {user.role === "student" && (
                                <></>
                              )}
                              {user.role === "student" && userCredentials && (
                                <>
                                  <div className="col-span-4 font-bold mt-4">Credentials:</div>
                                  {Object.entries(userCredentials).map(([k, v]) => (
                                    <div key={k} className="flex text-xs">
                                      <span className="font-semibold mr-2">{k}:</span>
                                      <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                                    </div>
                                  ))}
                                </>
                              )}
                              {/* Show ams-user-info details if available */}
                              {userInfoDetails && (
                                <div>
                                  <div className="col-span-4 font-bold mt-4">User Info (Profile):</div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <span className="font-bold block">Bio:</span>
                                      <span>{userInfoDetails.bio || "N/A"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold block">Address:</span>
                                      <span>{userInfoDetails.address || "N/A"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold block">Phone:</span>
                                      <span>{userInfoDetails.phone || "N/A"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold block">Experience:</span>
                                      <span>{userInfoDetails.experience || "N/A"}</span>
                                    </div>
                                    <div>
                                      <span className="font-bold block">Certificates:</span>
                                      <span>
                                        {Array.isArray(userInfoDetails.certificates) && userInfoDetails.certificates.length > 0
                                          ? userInfoDetails.certificates.join(", ")
                                          : "N/A"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-bold block">Specializations:</span>
                                      <span>
                                        {Array.isArray(userInfoDetails.specializations) && userInfoDetails.specializations.length > 0
                                          ? userInfoDetails.specializations.join(", ")
                                          : "N/A"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-bold block">Social Links:</span>
                                      <span>
                                        {userInfoDetails.socialLinks
                                          ? Object.entries(userInfoDetails.socialLinks)
                                              .filter(([_, v]) => v)
                                              .map(([k, v]) => `${k}: ${v}`)
                                              .join(", ") || "N/A"
                                          : "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {/* Show extra details for coaches */}
                              {user.role === "coach" && (
                                <>
                                  {coachUserInfo && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div>
                                        <span className="font-bold block">Coach ID:</span>
                                        <span>{coachUserInfo.id}</span>
                                      </div>
                                      <div>
                                        <span className="font-bold block">Username:</span>
                                        <span>
                                          {getDisplayUsername(user, playerDetails, coachUserInfo)}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-bold block">Phone:</span>
                                        <span>{coachUserInfo.phone}</span>
                                      </div>
                                      <div>
                                        <span className="font-bold block">Emergency Contact:</span>
                                        <span>{coachUserInfo.emergencyContact}</span>
                                      </div>
                                      <div>
                                        <span className="font-bold block">Email:</span>
                                        <span>{coachUserInfo.email}</span>
                                      </div>
                                      <div>
                                        <span className="font-bold block">About:</span>
                                        <span>{coachUserInfo.about || coachUserInfo.bio || "N/A"}</span>
                                      </div>
                                      <div>
                                        <span className="font-bold block">Rating:</span>
                                        <span>
                                          {coachUserInfo.rating !== undefined
                                            ? coachUserInfo.rating
                                            : (coachUserInfo.overallRating !== undefined
                                                ? coachUserInfo.overallRating
                                                : "N/A")}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {coachDetails && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div>
                                        <span className="font-bold block">Specialization:</span>
                                        <span>{coachDetails.specialization}</span>
                                      </div>
                                      <div>
                                        <span className="font-bold block">Experience:</span>
                                        <span>{coachDetails.experience}</span>
                                      </div>
                                    </div>
                                  )}
                                  {coachCredentials && (
                                    <div>
                                      <span className="font-bold block mb-2">Credentials:</span>
                                      <div className="flex flex-wrap gap-4">
                                        {coachCredentials.certifications && coachCredentials.certifications.length > 0
                                          ? coachCredentials.certifications.map((cert: string, idx: number) => (
                                              <span key={idx} className="bg-gray-100 text-gray-800 rounded px-2 py-1 text-sm">{cert}</span>
                                            ))
                                          : "N/A"}
                                      </div>
                                    </div>
                                  )}
                                  {coachBatches && coachBatches.length > 0 && (
                                    <div>
                                      <span className="font-bold block mb-2">Batches:</span>
                                      <div className="flex flex-wrap gap-4">
                                        {coachBatches.map((batch: any, idx: number) => (
                                          <span key={batch._id || idx} className="bg-gray-100 text-gray-800 rounded px-2 py-1 text-sm">
                                            {batch.name || JSON.stringify(batch)}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4}>No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

