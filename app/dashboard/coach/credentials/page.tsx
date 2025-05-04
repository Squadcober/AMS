"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import Sidebar from "@/components/Sidebar"
import { Download } from "lucide-react"

interface Credential {
  _id: string
  title: string
  issuer: string
  date: string
  document?: string
  userId: string
  academyId: string
  createdAt: string
}

export default function Credentials() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [newCredential, setNewCredential] = useState({
    title: "",
    issuer: "",
    date: "",
    document: ""
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    let isSubscribed = true;

    const fetchCredentials = async () => {
      try {
        console.log('Current user data:', user);

        if (!user?.username || !user?.academyId) {
          console.error('User data is missing:', { username: user?.username, academyId: user?.academyId });
          return;
        }

        // Get user's ID first
        const userResponse = await fetch(`/api/db/ams-users?username=${encodeURIComponent(user.username)}`);
        const userData = await userResponse.json();
        console.log('User API response:', userData);

        if (!isSubscribed) return;
        if (!userData.success || !userData.data?.[0]?.id) {
          console.error('Invalid user data structure:', userData);
          throw new Error('Invalid user data structure');
        }

        const userId = userData.data[0].id; // This will be the user_* format ID
        console.log('Using userId for credentials:', userId);

        // Then fetch credentials with the user_* format ID
        const response = await fetch(`/api/db/ams-credentials?userId=${userId}&academyId=${user.academyId}`);
        const result = await response.json();

        if (!isSubscribed) return;
        if (result.success) {
          console.log('Successfully fetched credentials:', result.data);
          setCredentials(result.data);
        } else {
          console.error('Failed to fetch credentials:', result.error);
          throw new Error(result.error || 'Failed to fetch credentials');
        }
      } catch (error) {
        if (!isSubscribed) return;
        console.error('Error in fetchCredentials:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load credentials",
          variant: "destructive"
        });
      }
    };

    fetchCredentials();

    return () => {
      isSubscribed = false;
    };
  }, [user?.username, user?.academyId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = () => {
        setSelectedFile(file)
        setNewCredential(prev => ({
          ...prev,
          document: reader.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddCredential = async () => {
    if (!user?.username || !user?.academyId) {
      console.error('Missing user data:', { username: user?.username, academyId: user?.academyId });
      toast({
        title: "Error",
        description: "User data missing",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get user ID from ams-users collection
      const userResponse = await fetch(`/api/db/ams-users?username=${encodeURIComponent(user.username)}`);
      const userData = await userResponse.json();
      console.log('User data from ams-users:', userData);

      if (!userData.success || !userData.data?.[0]?.id) {
        console.error('Invalid user data:', userData);
        throw new Error('Failed to fetch user data');
      }

      const userId = userData.data[0].id; // Use the id field instead of _id
      console.log('Using userId:', userId);

      // Ensure all required fields are present
      if (!newCredential.title || !newCredential.issuer || !newCredential.date) {
        console.error('Missing credential fields:', newCredential);
        throw new Error('Missing required fields: title, issuer, or date');
      }

      const credentialData = {
        ...newCredential,
        userId, // Use the _id from ams-users
        academyId: user.academyId,
        createdAt: new Date().toISOString()
      };
      
      console.log('Sending credential data:', credentialData);

      // Add credential
      const response = await fetch('/api/db/ams-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Credential creation failed:', errorData);
        throw new Error(errorData.error || 'Failed to add credential');
      }

      const result = await response.json();
      console.log('Credential creation response:', result);

      if (result.success) {
        setCredentials(prev => [...prev, result.data]);
        setNewCredential({ title: "", issuer: "", date: "", document: "" });
        setSelectedFile(null);
        toast({ 
          title: "Success", 
          description: "Credential added successfully" 
        });
      } else {
        throw new Error(result.error || 'Failed to add credential');
      }
    } catch (error) {
      console.error('Error adding credential:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add credential",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCredential = async (credentialId: string) => {
    try {
      if (!user?.username || !user?.academyId) return;

      const response = await fetch(`/api/db/ams-credentials/${credentialId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete credential');
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      // Reload credentials using the function
      setCredentials(prev => prev.filter(cred => cred._id !== credentialId));

      toast({
        title: "Success",
        description: "Credential deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete credential",
        variant: "destructive"
      });
    }
  }

  const handleDownload = (documentData: string, fileName: string) => {
    try {
      // Create a link element
      const link = document.createElement('a')
      
      // If the document is a base64 string
      if (documentData.startsWith('data:')) {
        link.href = documentData
      } else {
        // If it's a URL, use it directly
        link.href = documentData
      }
      
      // Set the file name
      link.download = fileName || 'document'
      
      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading file:', error)
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive"
      })
    }
  }

  const getFileExtension = (documentData: string) => {
    if (documentData.startsWith('data:')) {
      const mimeType = documentData.split(';')[0].split(':')[1];
      return mimeType.split('/')[1];
    }
    return 'unknown';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-6">
          {/* Make header sticky with background */}
          <div className="flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20 py-4">
            <h1 className="text-3xl font-bold">My Credentials</h1>
            <Dialog>
              <DialogTrigger asChild>
                <Button>Add Credential</Button>
              </DialogTrigger>
              {/* Make dialog content scrollable */}
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Credential</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newCredential.title}
                      onChange={(e) => setNewCredential({ ...newCredential, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issuer">Issuer</Label>
                    <Input
                      id="issuer"
                      value={newCredential.issuer}
                      onChange={(e) => setNewCredential({ ...newCredential, issuer: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newCredential.date}
                      onChange={(e) => setNewCredential({ ...newCredential, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document">Document</Label>
                    <Input
                      id="document"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                  </div>
                  <Button onClick={handleAddCredential}>Add Credential</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Make credentials grid scrollable */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
            {credentials.map((credential) => (
              <Card key={credential._id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{credential.title}</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteCredential(credential._id)}
                    >
                      Delete
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <Badge>{credential.issuer}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Issued: {new Date(credential.date).toLocaleDateString()}
                    </p>
                    {credential.document && (
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownload(
                            credential.document!, 
                            `${credential.title}-${credential.issuer}.${getFileExtension(credential.document!)}`
                          )}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download Document
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

