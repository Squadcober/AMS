"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Radar } from "react-chartjs-2"
import { usePlayers } from "@/contexts/PlayerContext"
import { useAuth } from "@/contexts/AuthContext"
import { useBatches } from "@/contexts/BatchContext"
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from "chart.js"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function CoachProfile() {
  const { id } = useParams()
  const { players } = usePlayers()
  const { user } = useAuth()
  const { batches } = useBatches()
  const [profileData, setProfileData] = useState<any>(null)
  const [isCoachProfile, setIsCoachProfile] = useState(false)
  const [rating, setRating] = useState<number>(0)
  const [ratings, setRatings] = useState<number[]>([])

  useEffect(() => {
    if (id) {
      // Find player by id (number or string)
      const player = players.find((p: any) => p.id?.toString() === id.toString());
      if (player) {
        setProfileData(player)
        setIsCoachProfile(false)
      } else {
        const batch = batches.find((batch) => batch.coachId === id)
        if (batch) {
          setProfileData({ ...batch, name: batch.coachName })
          setIsCoachProfile(true)
          const storedRatings = JSON.parse(localStorage.getItem(`coach-ratings-${id}`) || "[]")
          setRatings(storedRatings)
        }
      }
    }
  }, [id, players, batches])

  const handleRatingChange = (value: number) => {
    setRating(value)
  }

  const handleRatingSubmit = () => {
    const newRatings = [...ratings, rating]
    setRatings(newRatings)
    localStorage.setItem(`coach-ratings-${id}`, JSON.stringify(newRatings))
  }

  const averageRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "N/A"

  if (!profileData) {
    return <div>Loading...</div>
  }

  const radarData = {
    labels: ["Shooting", "Pace", "Positioning", "Passing", "Ball Control", "Crossing"],
    datasets: [
      {
        label: "Player Attributes",
        data: [
          profileData.attributes?.shooting || 0,
          profileData.attributes?.pace || 0,
          profileData.attributes?.positioning || 0,
          profileData.attributes?.passing || 0,
          profileData.attributes?.ballControl || 0,
          profileData.attributes?.crossing || 0,
        ],
        backgroundColor: "rgba(147, 51, 234, 0.2)",
        borderColor: "rgb(147, 51, 234)",
        borderWidth: 1,
        fill: true,
      },
    ],
  }

  const radarOptions = {
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        min: 0,
        ticks: {
          stepSize: 1,
          display: false,
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        pointLabels: {
          color: "rgb(255, 255, 255)",
          font: {
            size: 12,
          },
        },
        angleLines: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
    maintainAspectRatio: false,
  }

  const topAttributes = [
    { name: "SHOOTING", value: profileData.attributes?.shooting || 0 },
    { name: "PACE", value: profileData.attributes?.pace || 0 },
    { name: "POSITIONING", value: profileData.attributes?.positioning || 0 },
    { name: "PASSING", value: profileData.attributes?.passing || 0 },
    { name: "BALL CONTROL", value: profileData.attributes?.ballControl || 0 },
    { name: "CROSSING", value: profileData.attributes?.crossing || 0 },
  ]

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">{profileData.name}</h1>
          <p className="text-gray-400">
            Age: {profileData.age} | {profileData.position}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={profileData.attributes?.overall >= 80 ? "success" : "secondary"}>
            OVR {profileData.attributes?.overall || "N/A"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-square relative overflow-hidden rounded-lg w-64 h-64">
              <img
                src={profileData.photoUrl || "/placeholder.svg"}
                alt={profileData.name}
                className="object-cover w-full h-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Attributes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {topAttributes.map((attr) => (
                <div key={attr.name} className="text-center">
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-400 flex items-center justify-center mx-auto">
                    <span className="text-2xl font-bold">{attr.value}</span>
                  </div>
                  <span className="text-sm mt-2 block">{attr.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Attributes Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <Radar data={radarData} options={radarOptions} />
            </div>
          </CardContent>
        </Card>

        {isCoachProfile && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Rate Coach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Slider
                  value={[rating]}
                  min={0}
                  max={5}
                  step={0.1}
                  onValueChange={([newValue]) => handleRatingChange(newValue)}
                />
                <span>{rating.toFixed(1)}</span>
                <Button onClick={handleRatingSubmit}>Submit Rating</Button>
              </div>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold">Average Rating: {averageRating}</h3>
                </div>
            </CardContent>
          </Card>
        )}

        {!isCoachProfile && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Performance History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profileData.performanceHistory.map((entry: any, index: number) => (
                  <div key={index} className="border-b border-gray-700 pb-4">
                    <p className="font-semibold">{new Date(entry.date).toLocaleDateString()}</p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {Object.entries(entry).map(([key, value]) => {
                        if (key !== "date") {
                          return (
                            <div key={key} className="space-y-1">
                              <p className="text-sm text-gray-400 capitalize">{key}</p>
                              <Progress value={Number(value) * 10} className="h-2" />
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
