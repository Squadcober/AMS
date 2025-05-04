"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Sidebar } from "@/components/Sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/components/ui/use-toast"

interface GalleryItem {
  _id: string
  mediaUrl: string // changed from imageUrl
  mediaType: 'image' | 'video' // new field
  playerId: string
  academyId: string
  type: string
  createdAt: string
}

export default function Gallery() {
  const { user, isLoading: authLoading } = useAuth();
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<GalleryItem | null>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        if (!user?.username || !user?.academyId) return;

        const response = await fetch(
          `/api/db/ams-gallery?playerId=${user.username}&academyId=${user.academyId}`,
          { credentials: 'include' }
        );

        if (!response.ok) throw new Error('Failed to fetch gallery');

        const result = await response.json();
        if (result.success) {
          setGallery(result.data);
        }
      } catch (error) {
        console.error('Error fetching gallery:', error);
        toast({
          title: "Error",
          description: "Failed to load gallery",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchGallery();
    }
  }, [user, authLoading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Error",
          description: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          variant: "destructive",
        });
        return;
      }

      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Error",
          description: "Please select an image or video file",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    try {
      if (!selectedFile || !user?.username || !user?.academyId) return;

      const formData = new FormData();
      formData.append('media', selectedFile);
      formData.append('data', JSON.stringify({
        playerId: user.username,
        academyId: user.academyId,
        mediaType: selectedFile.type.startsWith('image/') ? 'image' : 'video'
      }));

      const response = await fetch('/api/db/ams-gallery', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload media');
      }

      const result = await response.json();
      if (result.success) {
        setGallery(prev => [result.data, ...prev]);
        setIsDialogOpen(false);
        setSelectedFile(null);
        toast({
          title: "Success",
          description: "Media uploaded successfully",
        });
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload media",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    try {
      if (!user?.username || !user?.academyId) return;

      const response = await fetch(
        `/api/db/ams-gallery?id=${item._id}&playerId=${user.username}&academyId=${user.academyId}`,
        { 
          method: 'DELETE',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete media');
      }

      const result = await response.json();
      if (result.success) {
        setGallery(prev => prev.filter(i => i._id !== item._id));
        setSelectedMedia(null);
        toast({
          title: "Success",
          description: "Media deleted successfully",
        });
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete media",
        variant: "destructive",
      });
    }
  };

  const generateVideoThumbnail = (videoUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.currentTime = 0.1; // Set to 0.1 seconds to get the first frame
      video.addEventListener('loadeddata', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      });
    });
  };

  const VideoThumbnail = ({ src, type }: { src: string, type: string }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [thumbnail, setThumbnail] = useState<string>('');
  
    useEffect(() => {
      if (videoRef.current) {
        generateVideoThumbnail(src).then(setThumbnail);
      }
    }, [src]);
  
    return thumbnail ? (
      <img
        src={thumbnail}
        alt="Video thumbnail"
        className="w-full h-48 object-cover"
      />
    ) : (
      <video
        ref={videoRef}
        className="w-full h-48 object-cover"
        preload="metadata"
      >
        <source src={src} type={type} />
      </video>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p>Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gallery</h1>
          <Button onClick={() => setIsDialogOpen(true)}>Upload Image</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gallery.map((item) => (
            <Card 
              key={item._id} 
              className="overflow-hidden cursor-pointer"
              onClick={() => setSelectedMedia(item)}
            >
              <CardContent className="p-0">
                {item.mediaType === 'image' ? (
                  <img
                    src={item.mediaUrl}
                    alt="Gallery media"
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <VideoThumbnail src={item.mediaUrl} type={item.type} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Media</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="media">Select Image or Video</Label>
                <Input
                  id="media"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                />
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected file: {selectedFile.name}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleUpload} disabled={!selectedFile}>
                Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle>Media Viewer</DialogTitle>
              {selectedMedia && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(selectedMedia)}
                >
                  Delete
                </Button>
              )}
            </DialogHeader>
            <div className="relative flex-1 overflow-hidden">
              {selectedMedia?.mediaType === 'image' ? (
                <img
                  src={selectedMedia.mediaUrl}
                  alt="Gallery media"
                  className="max-w-full max-h-[calc(90vh-8rem)] object-contain mx-auto"
                />
              ) : (
                <video
                  className="max-w-full max-h-[calc(90vh-8rem)] mx-auto"
                  controls
                  autoPlay
                >
                  <source src={selectedMedia?.mediaUrl} type={selectedMedia?.type} />
                </video>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

