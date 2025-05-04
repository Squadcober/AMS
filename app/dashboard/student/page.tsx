"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import Image from "next/image"
import { CustomTooltip } from "@/components/custom-tooltip"

// Mock data
const playerData = {
  name: "AVISHEK BANERJEE",
  age: 27,
  position: "Forward",
  overallRating: 85,
  injuryStatus: "Fit",
  topAttributes: [
    { name: "PACE", value: 7 },
    { name: "SHOOTING", value: 8 },
    { name: "PASSING", value: 7 },
    { name: "POSITIONING", value: 7 },
  ],
  attributes: {
    pace: 7,
    shooting: 8,
    passing: 7,
    dribbling: 6,
    defending: 5,
    physical: 6,
  },
}

const performanceData = [
  { month: "Apr", shooting: 6, passing: 5, stamina: 7 },
  { month: "Jul", shooting: 7, passing: 6, stamina: 7 },
  { month: "Oct", shooting: 8, passing: 7, stamina: 8 },
  { month: "Jan", shooting: 8, passing: 7, stamina: 8 },
]

const weeklyChanges = [
  { attribute: "Pace", change: 15 },
  { attribute: "Shooting", change: 12 },
  { attribute: "Heading", change: 3 },
  { attribute: "Weak foot", change: 6 },
  { attribute: "Dribbling", change: 2 },
]

const suggestedDrills = ["Speed Drills – G1T1", "Passing Drills – G2T1", "Strength Training – G3T2", "Shooting – G3T1"]

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("profile")

  return (
    <div className="container mx-auto p-4 space-y-6">
      <CustomTooltip content="Player's basic information and overall rating">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">{playerData.name}</h1>
            <p className="text-gray-400">
              Age: {playerData.age} | {playerData.position}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <CustomTooltip content="Current injury status of the player">
              <Badge variant={playerData.injuryStatus === "Fit" ? "default" : "destructive"}>
                Injury Status: {playerData.injuryStatus}
              </Badge>
            </CustomTooltip>
            <CustomTooltip content="Overall player rating based on all attributes">
              <div className="text-4xl font-bold">OVR {playerData.overallRating}</div>
            </CustomTooltip>
          </div>
        </div>
      </CustomTooltip>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 lg:grid-cols-9 gap-2">
          <CustomTooltip content="View and edit player profile information">
            <TabsTrigger value="profile">PLAYER PROFILE</TabsTrigger>
          </CustomTooltip>
          <CustomTooltip content="Access training schedules and performance">
            <TabsTrigger value="training">TRAINING</TabsTrigger>
          </CustomTooltip>
          <CustomTooltip content="View detailed performance metrics">
            <TabsTrigger value="performance">PERFORMANCE</TabsTrigger>
          </CustomTooltip>
          <CustomTooltip content="See player achievements and awards">
            <TabsTrigger value="achievements">ACHIEVEMENTS</TabsTrigger>
          </CustomTooltip>
          <CustomTooltip content="Access player photos and videos">
            <TabsTrigger value="gallery">GALLERY</TabsTrigger>
          </CustomTooltip>
          <CustomTooltip content="View scouting reports and potential">
            <TabsTrigger value="scouting">SCOUTING</TabsTrigger>
          </CustomTooltip>
          <CustomTooltip content="See upcoming matches and events">
            <TabsTrigger value="schedule">SCHEDULE</TabsTrigger>
          </CustomTooltip>
          <CustomTooltip content="Track injury status and rehabilitation progress">
            <TabsTrigger value="injury">INJURY & REHAB</TabsTrigger>
          </CustomTooltip>
          <CustomTooltip content="Manage payment information and history">
            <TabsTrigger value="payments">PAYMENTS</TabsTrigger>
          </CustomTooltip>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomTooltip content="Player's key performance indicators">
              <Card>
                <CardHeader>
                  <CardTitle>Top Attributes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {playerData.topAttributes.map((attr) => (
                      <div key={attr.name} className="text-center">
                        <div className="text-3xl font-bold">{attr.value}</div>
                        <div className="text-sm text-gray-500">{attr.name}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CustomTooltip>
            <CustomTooltip content="Detailed breakdown of player's skills">
              <Card>
                <CardHeader>
                  <CardTitle>Player Attributes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(playerData.attributes).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="capitalize">{key}</span>
                          <span>{value}</span>
                        </div>
                        <Progress value={value * 10} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CustomTooltip>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Performance Data</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="shooting" stroke="#8884d8" />
                  <Line type="monotone" dataKey="passing" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="stamina" stroke="#ffc658" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <CustomTooltip content="Recommended drills to improve player's skills">
            <Card>
              <CardHeader>
                <CardTitle>Suggested Drills</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {suggestedDrills.map((drill, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <span>{drill}</span>
                      <Button variant="outline" size="sm">
                        +
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </CustomTooltip>
          <CustomTooltip content="Recent improvements in player's attributes">
            <Card>
              <CardHeader>
                <CardTitle>This Week's Key Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weeklyChanges.map((change, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between">
                        <span>{change.attribute}</span>
                        <span className="text-green-500">+{change.change}%</span>
                      </div>
                      <Progress value={change.change} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CustomTooltip>
          <div className="flex justify-between">
            <Button>Scheduled Training</Button>
            <Button variant="outline">Nutrition Tracker</Button>
          </div>
        </TabsContent>

        {/* Placeholder content for other tabs */}
        <TabsContent value="performance">Performance content</TabsContent>
        <TabsContent value="achievements">Achievements content</TabsContent>
        <TabsContent value="gallery">Gallery content</TabsContent>
        <TabsContent value="scouting">Scouting content</TabsContent>
        <TabsContent value="schedule">Schedule content</TabsContent>
        <TabsContent value="injury">Injury & Rehab content</TabsContent>
        <TabsContent value="payments">Payments content</TabsContent>
      </Tabs>
    </div>
  )
}

