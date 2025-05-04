"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileUp, FileText } from "lucide-react"
import { Sidebar } from "@/components/Sidebar"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'pdf';
  url: string;
  name: string;
  userId: string;
  academyId: string;
  uploadDate: string;
}

const STORAGE_KEY = 'scouting-media';

export default function ScoutingPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [resume, setResume] = useState<File | null>(null)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [showFileViewer, setShowFileViewer] = useState(false)
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null)

  // Load media items specific to the user
  useEffect(() => {
    if (user?.id && user?.academyId) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allItems = JSON.parse(stored);
        const userItems = allItems.filter((item: MediaItem) => 
          item.userId === user.id && 
          item.academyId === user.academyId
        );
        setMediaItems(userItems);
      }
    }
  }, [user?.id, user?.academyId]);

  const saveMediaToStorage = (newItem: MediaItem) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allItems = stored ? JSON.parse(stored) : [];
      
      // Filter out other items from this user to manage storage
      const otherItems = allItems.filter((item: MediaItem) => 
        item.userId !== user?.id
      );
      
      const updatedItems = [...otherItems, newItem];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
      
      // Update state with only user's items
      setMediaItems(prev => [...prev, newItem]);
    } catch (error) {
      console.error('Error saving to storage:', error);
      toast({
        title: "Error",
        description: "Failed to save media",
        variant: "destructive",
      });
    }
  };

  const handleViewFile = (url: string) => {
    setSelectedFileUrl(url);
    setShowFileViewer(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        title: "Error",
        description: "Only PDF files are allowed",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (!user?.id || !user?.academyId) {
        toast({
          title: "Error",
          description: "User information missing",
          variant: "destructive",
        });
        return;
      }

      const newItem: MediaItem = {
        id: Date.now().toString(),
        type: 'pdf',
        url: reader.result as string,
        name: file.name,
        userId: user.id,
        academyId: user.academyId,
        uploadDate: new Date().toISOString()
      };

      saveMediaToStorage(newItem);
      setResume(file);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = (itemId: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allItems = JSON.parse(stored);
        const updatedItems = allItems.filter((item: MediaItem) => item.id !== itemId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
        
        // Update state with filtered items
        setMediaItems(prev => prev.filter(item => item.id !== itemId));
        
        toast({
          title: "Success",
          description: "Media deleted successfully",
        });
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: "Error",
        description: "Failed to delete media",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col space-y-6 overflow-auto">
        <div className="container mx-auto p-4 space-y-6">
          <h1 className="text-3xl font-bold text-white">Scouting Profile</h1>

          <Alert>
            <AlertTitle>Important!</AlertTitle>
            <AlertDescription>Please upload your resume in PDF format only. Maximum file size: 5MB</AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Player Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resume ? (
                  <div className="flex items-center justify-between">
                    <span>{resume.name}</span>
                    <Button variant="destructive" onClick={() => setResume(null)}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="resume-upload"
                      className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileUp className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PDF files only (MAX. 5MB)</p>
                      </div>
                      <input id="resume-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                    </label>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mediaItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-8 w-8" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewFile(item.url)}
                      >
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Dialog open={showFileViewer} onOpenChange={setShowFileViewer}>
            <DialogContent className="max-w-4xl w-full h-[80vh]">
              <DialogHeader>
                <DialogTitle>File Viewer</DialogTitle>
              </DialogHeader>
              {selectedFileUrl && (
                <div className="w-full h-full">
                  <iframe
                    src={selectedFileUrl}
                    className="w-full h-[calc(80vh-80px)]"
                    title="File Viewer"
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}

