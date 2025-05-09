"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import Image from "next/image"
import { useAuth } from "@/contexts/AuthContext"
import { CustomTooltip } from "@/components/custom-tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileUp, Calendar } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/Sidebar" // Import the Sidebar component
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"

interface Rating {
  studentId: string
  studentName?: string
  studentPhoto?: string
  rating: number
  date: string
  comment?: string
}

export default function CoachProfilePage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [coachData, setCoachData] = useState({
    name: "",
    age: 0,
    license: "",
    ratings: [] as Rating[],
    about: "",
    photoUrl: "/placeholder.svg",
    sessionsCount: 0
  })
  const [ratings, setRatings] = useState<Rating[]>([])
  const [userId, setUserId] = useState<string | undefined>(undefined)

  const processRatings = (ratings: any[]) => {
    return ratings.map(rating => {
      const studentName = rating.studentInfo?.name || 
                         rating.studentName || 
                         'Anonymous Student'

      const studentPhoto = rating.studentInfo?.photoUrl || 
                         rating.studentPhoto || 
                         undefined

      return {
        ...rating,
        studentName,
        studentPhoto,
        rating: rating.rating || 0,
        date: rating.date || new Date().toISOString(),
        studentId: rating.studentId,
        academyId: rating.academyId || user?.academyId,
        comment: rating.comment
      }
    })
  }

  const fetchUserData = async (username: string) => {
    try {
      const response = await fetch(`/api/db/coach-profile/ams-users?username=${encodeURIComponent(username)}`)
      const { success, data } = await response.json()
      console.log('User data fetch response:', { success, data })

      if (success && data?.id) {
        setUserId(data.id)
        return data.id
      }
      throw new Error('Failed to fetch user ID')
    } catch (error) {
      console.error('Error fetching user ID:', error)
      return null
    }
  }

  useEffect(() => {
    const loadCoachData = async () => {
      try {
        setIsLoading(true)
        console.log('Loading coach data for user:', user)

        if (!user?.username || !user?.academyId) {
          console.warn('Missing user data:', { username: user?.username, academyId: user?.academyId })
          throw new Error("User data is incomplete")
        }

        const id = await fetchUserData(user.username)
        if (!id) {
          throw new Error('Could not fetch user ID')
        }

        const response = await fetch(`/api/db/coach-profile/${id}`)
        const { success, data } = await response.json()
        console.log('Coach API Response:', { success, data })

        if (success && data) {
          const processedRatings = processRatings(data.ratings || [])
          setCoachData({
            name: data.name || user.name || "",
            age: data.age || 0,
            license: data.license || "",
            ratings: processedRatings,
            about: data.about || "",
            photoUrl: data.photoUrl || "/placeholder.svg",
            sessionsCount: data.sessionsCount || 0
          })
          
          if (data.ratings?.length > 0) {
            setRatings(processedRatings)
          }
        }
      } catch (error) {
        console.error('Error loading coach data:', error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load coach data",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.username && user?.academyId) {
      loadCoachData()
    } else {
      console.warn('User not ready:', user)
      setIsLoading(false)
    }
  }, [user?.username, user?.academyId])

  useEffect(() => {
    const loadRatings = async () => {
      try {
        if (!userId) {
          console.warn('Cannot load ratings - no user ID')
          return
        }

        const response = await fetch(`/api/db/coach-ratings?coachId=${userId}`)
        const { success, data } = await response.json()
        console.log('Ratings API Response:', { success, data })

        if (success) {
          console.log('Setting ratings:', data)
          setRatings(processRatings(data))
        }
      } catch (error) {
        console.error('Error loading ratings:', error)
      }
    }

    loadRatings()
  }, [userId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCoachData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoachData((prev) => ({ ...prev, photoUrl: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    try {
      if (!userId || !user?.academyId) {
        throw new Error('Missing required user data')
      }

      const response = await fetch(`/api/db/coach-profile/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...coachData,
          academyId: user.academyId
        })
      })

      if (!response.ok) {
        throw new Error("Failed to save coach data")
      }

      toast({
        title: "Success",
        description: "Profile updated successfully"
      })
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving coach data:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes",
        variant: "destructive"
      })
    }
  }

  const averageRating = useMemo(() => {
    if (!ratings.length) return "N/A"
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
    return (sum / ratings.length).toFixed(1)
  }, [ratings])

  console.log('Rendering coach profile with:', {
    coachData,
    ratings,
    isLoading,
    user: {
      id: userId,
      academyId: user?.academyId,
      name: user?.name
    }
  })

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar /> {/* Add the Sidebar component here */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex justify-between items-start">
          <div>
            <CustomTooltip content="Your average rating from students">
              <div>
                <h1 className="text-4xl font-bold">Rating</h1>
                <div className="text-7xl font-extrabold mt-2">{averageRating}</div>
                <p className="text-sm text-gray-400 mt-1">Based on {ratings.length} ratings</p>
              </div>
            </CustomTooltip>
          </div>

          <div className="text-right">
            <CustomTooltip content="Your personal information">
              <div className="flex justify-end items-center space-x-4">
                <div>
                  {isEditing ? (
                    <>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={coachData.name}
                        onChange={handleInputChange}
                        className="mb-2"
                      />
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        name="age"
                        type="number"
                        value={coachData.age}
                        onChange={handleInputChange}
                        className="mb-2"
                      />
                      <Label htmlFor="license">License</Label>
                      <Input
                        id="license"
                        name="license"
                        value={coachData.license}
                        onChange={handleInputChange}
                        className="mb-2"
                      />
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold">{coachData.name.toUpperCase()}</h2>
                      <p className="text-sm mt-1">Age: {coachData.age}</p>
                      <p className="text-sm">{coachData.license}</p>
                    </>
                  )}
                </div>
                <div className="relative w-32 h-32">
                  {isEditing ? (
                    <label className="cursor-pointer w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-full overflow-hidden">
                      <div className="text-center">
                        <FileUp className="mx-auto h-6 w-6 text-gray-400" />
                        <span className="mt-1 text-xs font-medium">Upload Photo</span>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                    </label>
                  ) : (
                    <Image
                      src={coachData.photoUrl || "/placeholder.svg"}
                      alt={coachData.name}
                      width={128}
                      height={128}
                      className="rounded-full object-cover"
                    />
                  )}
                </div>
              </div>
            </CustomTooltip>
          </div>
        </div>

        <CustomTooltip content="Your professional background and achievements">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <textarea
                  name="about"
                  value={coachData.about}
                  onChange={handleInputChange}
                  className="w-full h-32 bg-gray-700 text-white rounded-md p-2 mt-2"
                />
              ) : (
                <p className="text-sm mt-2 leading-relaxed">{coachData.about}</p>
              )}
            </CardContent>
          </Card>
        </CustomTooltip>

        <CustomTooltip content="Recent feedback from players">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>Recent Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ratings.slice(-4).map((rating, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {rating.studentPhoto ? (
                          <Image
                            src={rating.studentPhoto}
                            alt={rating.studentName || 'Student photo'}
                            width={32}
                            height={32}
                            className="rounded-full mr-2"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-600 rounded-full mr-2" />
                        )}
                        <span className="text-sm font-medium">
                          {rating.studentName}
                        </span>
                      </div>
                      <span className="text-lg font-bold">{rating.rating}/5</span>
                    </div>
                    <p className="text-sm text-gray-300">
                      {new Date(rating.date).toLocaleDateString()}
                    </p>
                    {rating.comment && <p className="mt-2 text-sm">{rating.comment}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CustomTooltip>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Training Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{coachData.sessionsCount}</p>
                <p className="text-sm text-muted-foreground">Total Sessions Conducted</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <Separator className="my-4" />
            <p className="text-sm text-muted-foreground">
              Completed training sessions across all batches
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          {isEditing ? (
            <Button onClick={handleSave}>Save Changes</Button>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </div>
      </div>
    </div>
  )
}

