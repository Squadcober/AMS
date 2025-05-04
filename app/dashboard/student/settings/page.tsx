"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import Sidebar from "@/components/Sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/components/ui/use-toast"

interface StudentInfo {
  pid: string
  name: string
  dob: string
  primaryPosition: string
  secondaryPosition: string
  strongFoot: string
  enrollmentDate: string
  height: string
  weight: string
  hasDisability: boolean
  disabilityType: string
  status: string
  school: string
  gender: string
  age: string
  bloodGroup: string
  primaryGuardian: string
  secondaryGuardian: string
  email: string
  primaryPhone: string
  secondaryPhone: string
  address: string
  personalInformation?: {
    pid: string
    name: string
    dob: string
    gender: string
    age: string
    enrollmentDate: string
    height: string
    weight: string
    school: string
    primaryGuardian: string
    secondaryGuardian: string
    email: string
    primaryPhone: string
    secondaryPhone: string
    address: string
    bloodGroup: string
  }
}

const positions = [
  "Goalkeeper",
  "Center Back",
  "Right Back",
  "Left Back",
  "Defensive Midfielder",
  "Central Midfielder",
  "Attacking Midfielder",
  "Right Winger",
  "Left Winger",
  "Striker",
  "Forward"
]

export default function StudentSettings() {
  const { user } = useAuth()
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    pid: "",
    name: "",
    dob: "",
    primaryPosition: "",
    secondaryPosition: "",
    strongFoot: "",
    enrollmentDate: "",
    height: "",
    weight: "",
    hasDisability: false,
    disabilityType: "",
    status: "Active",
    school: "",
    gender: "",
    age: "",
    bloodGroup: "",
    primaryGuardian: "",
    secondaryGuardian: "",
    email: "",
    primaryPhone: "",
    secondaryPhone: "",
    address: ""
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [canSave, setCanSave] = useState(false)

  useEffect(() => {
    setCanSave(
      Boolean(user?.id) && 
      Boolean(user?.academyId) && 
      !isLoading && 
      !isSaving
    )
  }, [user?.id, user?.academyId, isLoading, isSaving])

  const fetchUserIdentifiers = async () => {
    try {
      if (!user?.id || !user?.academyId) {
        console.warn("User data missing:", { id: user?.id, academyId: user?.academyId })
        throw new Error("User ID or Academy ID is missing")
      }

      const playerResponse = await fetch(
        `/api/db/ams-player-data?academyId=${encodeURIComponent(user.academyId)}&userId=${encodeURIComponent(user.id)}`
      )
      const playerData = await playerResponse.json()
      console.log("Player API Response:", playerData)

      if (playerData.success && playerData.data?.[0]) {
        console.log("Found player data:", playerData.data[0])
        return {
          playerId: playerData.data[0]._id,
          userId: user.id,
          source: "player"
        }
      }

      const userResponse = await fetch(`/api/db/ams-users?userId=${user.id}`)
      const userData = await userResponse.json()
      console.log("User API Response:", userData)

      if (userData.success && userData.data) {
        return {
          playerId: userData.data._id,
          userId: user.id,
          source: "user"
        }
      }

      return {
        playerId: user.id,
        userId: user.id,
        source: "auth"
      }
    } catch (error) {
      console.error("Error in fetchUserIdentifiers:", error)
      throw error
    }
  }

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        setIsLoading(true);

        if (!user?.username || !user?.academyId) {
          throw new Error("User data is incomplete");
        }

        // Fetch student data and academy data in parallel
        const [studentResponse, academyResponse] = await Promise.all([
          fetch(
            `/api/db/ams-student-info?username=${encodeURIComponent(user.username)}&academyId=${encodeURIComponent(user.academyId)}`,
            { credentials: 'include' }
          ),
          fetch(
            `/api/db/ams-academy/${encodeURIComponent(user.academyId)}`,
            { credentials: 'include' }
          )
        ]);

        if (!studentResponse.ok || !academyResponse.ok) {
          throw new Error('Failed to fetch required data');
        }

        const [studentResult, academyResult] = await Promise.all([
          studentResponse.json(),
          academyResponse.json()
        ]);

        console.log('Student data:', studentResult);
        console.log('Academy data:', academyResult);

        if (!studentResult.success || !academyResult.success) {
          throw new Error('Failed to load required data');
        }

        const studentData = studentResult.data;
        const academyData = academyResult.data;

        setStudentInfo(prev => ({
          ...prev,
          pid: studentData._id || "",
          name: studentData.name || "",
          dob: studentData.dob || "",
          primaryPosition: studentData.primaryPosition || "",
          secondaryPosition: studentData.secondaryPosition || "",
          strongFoot: studentData.strongFoot || "",
          enrollmentDate: studentData.enrollmentDate || "",
          height: studentData.height || "",
          weight: studentData.weight || "",
          hasDisability: studentData.hasDisability || false,
          disabilityType: studentData.disabilityType || "",
          status: studentData.status || "Active",
          school: academyData.name || "Academy not found", // Set academy name from academy data
          gender: studentData.gender || "",
          age: studentData.age || "",
          bloodGroup: studentData.bloodGroup || "",
          primaryGuardian: studentData.primaryGuardian || "",
          secondaryGuardian: studentData.secondaryGuardian || "",
          email: studentData.email || "",
          primaryPhone: studentData.primaryPhone || "",
          secondaryPhone: studentData.secondaryPhone || "",
          address: studentData.address || ""
        }));

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load data",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    };

    loadStudentData();
  }, [user?.username, user?.academyId]);

  const handleSave = async () => {
    try {
      if (!user?.username || !user?.academyId) {
        toast({
          title: "Error",
          description: "Missing user information",
          variant: "destructive"
        });
        return;
      }

      setIsSaving(true);

      const payload = {
        _id: studentInfo.pid, // Required field
        username: user.username,
        academyId: user.academyId,
        ...studentInfo,
        updatedAt: new Date().toISOString()
      };

      // First try to update if ID exists
      const response = await fetch('/api/db/ams-student-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!response.ok) {
        // If update fails, try to create new record
        const postResponse = await fetch('/api/db/ams-student-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });

        if (!postResponse.ok) {
          const error = await postResponse.json();
          throw new Error(error.error || 'Failed to save changes');
        }
      }

      toast({
        title: "Success",
        description: "Changes saved successfully"
      });

      // Refresh the data after successful save
      const updatedResponse = await fetch(
        `/api/db/ams-student-info?username=${encodeURIComponent(user.username)}&academyId=${encodeURIComponent(user.academyId)}`,
        { credentials: 'include' }
      );

      if (updatedResponse.ok) {
        const result = await updatedResponse.json();
        if (result.success && result.data) {
          setStudentInfo(prev => ({
            ...prev,
            ...result.data
          }));
        }
      }

    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-8">Student Settings</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="pid" className="flex items-center gap-2">
                  PID
                  <span className="text-xs text-muted-foreground">(System-assigned)</span>
                </Label>
                <Input
                  id="pid"
                  value={studentInfo.pid}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  Name
                  <span className="text-xs text-muted-foreground">(System-assigned)</span>
                </Label>
                <Input
                  id="name"
                  value={studentInfo.name}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={studentInfo.dob}
                  onChange={(e) => setStudentInfo(prev => ({ ...prev, dob: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={studentInfo.gender}
                  onValueChange={(value) => setStudentInfo(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryPosition">Primary Position</Label>
                <Select
                  value={studentInfo.primaryPosition}
                  onValueChange={(value) => setStudentInfo(prev => ({ ...prev, primaryPosition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(position => (
                      <SelectItem key={position} value={position.toLowerCase()}>
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryPosition">Secondary Position</Label>
                <Select
                  value={studentInfo.secondaryPosition}
                  onValueChange={(value) => setStudentInfo(prev => ({ ...prev, secondaryPosition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(position => (
                      <SelectItem key={position} value={position.toLowerCase()}>
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="strongFoot">Strong Foot</Label>
                <Select
                  value={studentInfo.strongFoot}
                  onValueChange={(value) => setStudentInfo(prev => ({ ...prev, strongFoot: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select foot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={studentInfo.status}
                  onValueChange={(value) => setStudentInfo(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enrollmentDate">Enrollment Date</Label>
                <Input
                  id="enrollmentDate"
                  type="date"
                  value={studentInfo.enrollmentDate}
                  onChange={(e) => setStudentInfo(prev => ({ ...prev, enrollmentDate: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={studentInfo.height}
                  onChange={(e) => setStudentInfo(prev => ({ ...prev, height: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={studentInfo.weight}
                  onChange={(e) => setStudentInfo(prev => ({ ...prev, weight: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school" className="flex items-center gap-2">
                  Academy
                  <span className="text-xs text-muted-foreground">(System-assigned)</span>
                </Label>
                <Input
                  id="school"
                  value={studentInfo.school}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="hasDisability"
                  checked={studentInfo.hasDisability}
                  onCheckedChange={(checked) => 
                    setStudentInfo(prev => ({ ...prev, hasDisability: checked }))
                  }
                />
                <Label htmlFor="hasDisability">Has Disability</Label>
              </div>

              {studentInfo.hasDisability && (
                <div className="space-y-2">
                  <Label htmlFor="disabilityType">Disability Type</Label>
                  <Input
                    id="disabilityType"
                    value={studentInfo.disabilityType}
                    onChange={(e) => setStudentInfo(prev => ({ ...prev, disabilityType: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <Select
                  value={studentInfo.bloodGroup}
                  onValueChange={(value) => setStudentInfo(prev => ({ ...prev, bloodGroup: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="primaryGuardian">Primary Guardian Name</Label>
                <Input
                  id="primaryGuardian"
                  value={studentInfo.primaryGuardian}
                  onChange={(e) => setStudentInfo(prev => ({ ...prev, primaryGuardian: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryGuardian">Secondary Guardian Name</Label>
                <Input
                  id="secondaryGuardian"
                  value={studentInfo.secondaryGuardian}
                  onChange={(e) => setStudentInfo(prev => ({ ...prev, secondaryGuardian: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  Email
                  <span className="text-xs text-muted-foreground">(System-assigned)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={studentInfo.email}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryPhone" className="flex items-center gap-2">
                  Primary Phone
                  <span className="text-xs text-muted-foreground">(System-assigned)</span>
                </Label>
                <Input
                  id="primaryPhone"
                  type="tel"
                  value={studentInfo.primaryPhone}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryPhone">Secondary Phone</Label>
                <Input
                  id="secondaryPhone"
                  type="tel"
                  value={studentInfo.secondaryPhone}
                  onChange={(e) => setStudentInfo(prev => ({ ...prev, secondaryPhone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={studentInfo.address}
                  onChange={(e) => setStudentInfo(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleSave}
              disabled={!canSave}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
