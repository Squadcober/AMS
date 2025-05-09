"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sidebar } from "@/components/Sidebar"

interface UserSettings {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  photoUrl?: string
  role?: string
  academyId?: string
  bio?: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<any>({})
  const [isEditing, setIsEditing] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>("")

  const fetchSettings = async () => {
    try {
      setLoading(true);
      console.log('Fetching settings for user:', user?.id);
      const response = await fetch(`/api/db/ams-user-info?userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const result = await response.json();
      console.log('Fetched settings data:', result);
      
      if (result.success && result.data) {
        const mappedSettings = {
          name: result.data.name || user?.name || '',
          email: user?.email || '', // Keep email from user context
          phone: result.data.phone || '',
          address: result.data.address || '',
          bio: result.data.bio || '',
          photoUrl: result.data.photoUrl || user?.photoUrl || '',
          role: result.data.role || user?.role || '',
          academyId: user?.academyId || '',
          lastUpdated: result.data.lastUpdated || '',
          _id: result.data._id || ''
        };
        console.log('Mapped settings:', mappedSettings);
        setSettings(mappedSettings);
      } else {
        // Initialize with user data if no settings exist
        setSettings({
          name: user?.name || '',
          email: user?.email || '',
          phone: '',
          address: '',
          bio: '',
          photoUrl: user?.photoUrl || '',
          role: user?.role || '',
          academyId: user?.academyId || ''
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (updatedSettings: any) => {
    try {
      if (!user?.id || !user?.academyId) {
        throw new Error('Missing user ID or academy ID');
      }

      const response = await fetch('/api/db/ams-user-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          academyId: user.academyId,
          name: updatedSettings.name,
          email: user.email, // Use email from user context
          phone: updatedSettings.phone,
          address: updatedSettings.address,
          bio: updatedSettings.bio,
          photoUrl: updatedSettings.photoUrl,
          role: user.role,
          lastUpdated: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      const result = await response.json();
      if (result.success) {
        // Update local state with saved data
        setSettings(updatedSettings);
        toast({
          title: "Success",
          description: "Settings saved successfully",
        });
      } else {
        throw new Error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchSettings();
    }
  }, [user?.id]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    try {
      if (!user?.id) {
        throw new Error("User not authenticated")
      }

      const updatedSettings = {
        ...settings,
        photoUrl: photoPreview || settings.photoUrl
      };

      await handleSaveSettings(updatedSettings);
      setIsEditing(false);
      
      // Refresh settings after save
      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Loading Settings...</h2>
            <p className="text-muted-foreground">Please wait while we fetch your settings</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col space-y-6 overflow-auto p-8">
        <h1 className="text-3xl font-bold">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={photoPreview || settings.photoUrl} />
                <AvatarFallback>{settings.name?.[0]}</AvatarFallback>
              </Avatar>
              {isEditing && (
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="max-w-xs"
                />
              )}
            </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Name</label>
                  <Input
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="text-sm">Email</label>
                  <Input
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="text-sm">Phone</label>
                  <Input
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="text-sm">Address</label>
                  <Input
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Additional fields based on role */}
              {(user?.role as string) === 'player' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm">Position</label>
                    <Input
                      value={settings.position}
                      onChange={(e) => setSettings({ ...settings, position: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="text-sm">Age</label>
                    <Input
                      type="number"
                      value={settings.age}
                      onChange={(e) => setSettings({ ...settings, age: parseInt(e.target.value) })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="text-sm">Weight (kg)</label>
                    <Input
                      type="number"
                      value={settings.weight}
                      onChange={(e) => setSettings({ ...settings, weight: parseInt(e.target.value) })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="text-sm">Height (cm)</label>
                    <Input
                      type="number"
                      value={settings.height}
                      onChange={(e) => setSettings({ ...settings, height: parseInt(e.target.value) })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="text-sm">Nationality</label>
                    <Input
                      value={settings.nationality}
                      onChange={(e) => setSettings({ ...settings, nationality: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm">Bio</label>
                <textarea
                  value={settings.bio}
                  onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
                  disabled={!isEditing}
                  className="w-full p-2 border rounded-md bg-background"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
