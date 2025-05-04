'use client';

import { motion } from 'framer-motion';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './components/Card';
import { CalendarDays } from './components/icons';
import { toast } from './components/ui/use-toast';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Sidebar from "@/components/Sidebar";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function ProfilePage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    bio: '',
    phone: '',
    address: '',
    experience: '',
    qualifications: [],
    specializations: [],
    photoUrl: '',
    academyId: '',
    role: '',
    finishedSessions: 0,
    userId: ''
  });

  const fetchUserData = async () => {
    try {
      if (!user?.id) return;

      setIsLoading(true);
      const response = await fetch(`/api/db/coach-profile/${user.id}`);
      
      if (!response.ok) throw new Error('Failed to fetch profile');

      const result = await response.json();
      if (result.success) {
        setUserProfile({
          name: result.data.name || '',
          email: result.data.email || '',
          bio: result.data.bio || '',
          phone: result.data.phone || '',
          address: result.data.address || '',
          experience: result.data.experience || '',
          qualifications: result.data.qualifications || [],
          specializations: result.data.specializations || [],
          photoUrl: result.data.photoUrl || '',
          finishedSessions: result.data.finishedSessions || 0,
          academyId: result.data.academyId || '',
          role: result.data.role || '',
          userId: user.id
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!user?.id) return;

      const response = await fetch(`/api/db/coach-profile/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userProfile)
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        fetchUserData(); // Refresh data after update
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Loading Profile...</h2>
              <p className="text-muted-foreground">Please wait</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Profile</h1>
          <Button onClick={handleSaveProfile}>Save Changes</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={userProfile.photoUrl} />
                  <AvatarFallback>{userProfile.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <Input
                    placeholder="Photo URL"
                    value={userProfile.photoUrl}
                    onChange={(e) => setUserProfile(prev => ({
                      ...prev,
                      photoUrl: e.target.value
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label>Name</label>
                <Input
                  value={userProfile.name}
                  onChange={(e) => setUserProfile(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                />
              </div>

              <div className="space-y-2">
                <label>Email</label>
                <Input
                  value={userProfile.email}
                  onChange={(e) => setUserProfile(prev => ({
                    ...prev,
                    email: e.target.value
                  }))}
                />
              </div>

              <div className="space-y-2">
                <label>Phone</label>
                <Input
                  value={userProfile.phone}
                  onChange={(e) => setUserProfile(prev => ({
                    ...prev,
                    phone: e.target.value
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label>Experience</label>
                <Textarea
                  value={userProfile.experience}
                  onChange={(e) => setUserProfile(prev => ({
                    ...prev,
                    experience: e.target.value
                  }))}
                />
              </div>

              <div className="space-y-2">
                <label>Bio</label>
                <Textarea
                  value={userProfile.bio}
                  onChange={(e) => setUserProfile(prev => ({
                    ...prev,
                    bio: e.target.value
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-muted-foreground">Sessions Conducted</h3>
                  <p className="text-2xl font-bold">{userProfile.finishedSessions}</p>
                </div>
                <div className="bg-secondary p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-muted-foreground">Role</h3>
                  <p className="text-2xl font-bold">{userProfile.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

