"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import Sidebar from "@/components/Sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export default function SettingsPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [formData, setFormData] = useState({
    phone: "",
    address: "",
    bio: "",
    photoUrl: "",
    experience: "",
    specializations: [] as string[],
    socialLinks: {
      twitter: "",
      linkedin: "",
      website: ""
    },
    certificates: [] as { name: string; issueDate: string; issuingAuthority: string }[]
  })

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/db/ams-user-info/${user.id}`);
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setFormData(prev => ({
              ...prev,
              ...result.data
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        toast({
          title: "Error",
          description: "Failed to load user information",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User ID is missing",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/db/ams-user-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          ...formData,
          updatedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Success",
          description: "Settings saved successfully",
        });
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 space-y-8 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <Button onClick={handleSave}>Save changes</Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="social">Social Links</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="experience">Experience</Label>
                    <Textarea
                      id="experience"
                      value={formData.experience}
                      onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Social Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input
                      id="twitter"
                      value={formData.socialLinks.twitter}
                      onChange={(e) => setFormData({
                        ...formData,
                        socialLinks: { ...formData.socialLinks, twitter: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={formData.socialLinks.linkedin}
                      onChange={(e) => setFormData({
                        ...formData,
                        socialLinks: { ...formData.socialLinks, linkedin: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.socialLinks.website}
                      onChange={(e) => setFormData({
                        ...formData,
                        socialLinks: { ...formData.socialLinks, website: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Certificates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.certificates.map((cert, index) => (
                  <div key={index} className="grid gap-4">
                    <Input
                      placeholder="Certificate Name"
                      value={cert.name}
                      onChange={(e) => {
                        const newCerts = [...formData.certificates];
                        newCerts[index] = { ...cert, name: e.target.value };
                        setFormData({ ...formData, certificates: newCerts });
                      }}
                    />
                    <div className="flex gap-4">
                      <Input
                        type="date"
                        value={cert.issueDate}
                        onChange={(e) => {
                          const newCerts = [...formData.certificates];
                          newCerts[index] = { ...cert, issueDate: e.target.value };
                          setFormData({ ...formData, certificates: newCerts });
                        }}
                      />
                      <Input
                        placeholder="Issuing Authority"
                        value={cert.issuingAuthority}
                        onChange={(e) => {
                          const newCerts = [...formData.certificates];
                          newCerts[index] = { ...cert, issuingAuthority: e.target.value };
                          setFormData({ ...formData, certificates: newCerts });
                        }}
                      />
                      <Button
                        variant="destructive"
                        onClick={() => {
                          const newCerts = formData.certificates.filter((_, i) => i !== index);
                          setFormData({ ...formData, certificates: newCerts });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      certificates: [
                        ...formData.certificates,
                        { name: "", issueDate: "", issuingAuthority: "" }
                      ]
                    });
                  }}
                >
                  Add Certificate
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
