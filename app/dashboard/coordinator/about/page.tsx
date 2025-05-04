"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Plus, X, Save, Edit, Facebook, Instagram, Youtube, Twitter, Upload, FileImage, FileVideo, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CollateralModal } from "@/components/collateral-modal"
import type { Collateral, CollateralFile } from "@/types/collateral"
import type React from "react"
import { toast } from "@/components/ui/use-toast"
import { Sidebar } from "@/components/Sidebar" // Import the Sidebar component
import { Textarea } from "@/components/ui/textarea" // Import Textarea component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AboutData {
  _id?: string;
  academyId: string;
  name: string;
  description: string;
  mission: string;
  vision: string;
  values: string[];
  facilities: string[];
  awards: string[];
  logos?: string[];
  banners?: string[];
  contact: {
    email: string;
    phone: string;
    address: string;
    website?: string;
    socialMedia?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

interface CollateralFile {
  id: string;
  name: string;
  url: string;
  type: string;
  dateUploaded: string;
}

interface Collateral {
  name: string;
  files: CollateralFile[];
  acceptedTypes: string;
}

type SocialMedia = {
  name: string
  url: string
}

type AboutPageData = {
  logo: string | null
  color: string
  socialMedia: SocialMedia[]
  collaterals: Collateral[]
  about: string // Add about to the type
}

const STORAGE_KEY = 'aboutPageData' // Consistent storage key

const INITIAL_COLLATERALS = [
  {
    academyId: "",
    name: "Static Graphics & Images",
    checked: false,
    files: [],
    acceptedTypes: ".jpg,.jpeg,.png,.gif"
  },
  {
    academyId: "",
    name: "Videos & Motion Graphics",
    checked: false,
    files: [],
    acceptedTypes: ".mp4,.mov,.avi"
  },
  {
    academyId: "",
    name: "Stories & Interactive Content",
    checked: false,
    files: [],
    acceptedTypes: ".mp4,.jpg,.jpeg,.png"
  },
  {
    academyId: "",
    name: "Ad Creatives",
    checked: false,
    files: [],
    acceptedTypes: ".jpg,.jpeg,.png,.gif,.mp4"
  },
  {
    academyId: "",
    name: "Templates & Guides",
    checked: false,
    files: [],
    acceptedTypes: ".pdf,.doc,.docx,.ppt,.pptx"
  },
  {
    academyId: "",
    name: "Documents & PDFs",
    checked: false,
    files: [],
    acceptedTypes: ".pdf,.doc,.docx"
  }
];

const COLLATERAL_TYPES = [
  {
    name: "Images & Graphics",
    acceptedTypes: ".jpg,.jpeg,.png,.gif",
    icon: FileImage
  },
  {
    name: "Videos",
    acceptedTypes: ".mp4,.mov,.avi",
    icon: FileVideo
  },
  {
    name: "Documents",
    acceptedTypes: ".pdf,.doc,.docx,.ppt,.pptx",
    icon: FileText
  }
];

export default function AboutPage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<AboutPageData>({
    logo: null,
    color: "#000000",
    about: "", // Initialize about field
    socialMedia: [
      { name: "Facebook", url: "" },
      { name: "Instagram", url: "" },
      { name: "YouTube", url: "" },
      { name: "Twitter", url: "" },
    ],
    collaterals: [
      {
        name: "Images & Graphics",
        files: [],
        acceptedTypes: ".jpg,.jpeg,.png,.gif"
      },
      {
        name: "Videos",
        files: [],
        acceptedTypes: ".mp4,.mov,.avi"
      },
      {
        name: "Documents",
        files: [],
        acceptedTypes: ".pdf,.doc,.docx,.ppt,.pptx"
      }
    ]
  })
  const [selectedCollateral, setSelectedCollateral] = useState<number | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [teamPhotos, setTeamPhotos] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<CollateralFile | null>(null)
  const [aboutData, setAboutData] = useState<AboutData>({
    academyId: user?.academyId || '',
    name: '',
    description: '',
    mission: '',
    vision: '',
    values: [],
    facilities: [],
    awards: [],
    contact: {
      email: '',
      phone: '',
      address: ''
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load data from MongoDB instead of localStorage
  useEffect(() => {
    const fetchAboutData = async () => {
      if (!user?.academyId) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/db/ams-about?academyId=${user.academyId}`);
        if (!response.ok) throw new Error('Failed to fetch about data');
        
        const data = await response.json();
        
        if (data && Object.keys(data).length > 0) {
          // Update both aboutData and formData from MongoDB
          setAboutData(data);
          setFormData({
            logo: data.logos?.[0] || null,
            color: data.color || "#000000",
            about: data.description || "",
            socialMedia: Object.entries(data.contact?.socialMedia || {}).map(([name, url]) => ({
              name: name.charAt(0).toUpperCase() + name.slice(1),
              url: url as string
            })),
            collaterals: data.collaterals || formData.collaterals.map(col => ({
              ...col,
              academyId: user.academyId
            }))
          });
        }
      } catch (error) {
        console.error('Error loading about data:', error);
        toast({
          title: "Error",
          description: "Failed to load academy information",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAboutData();
  }, [user?.academyId]);

  useEffect(() => {
    const fetchAboutData = async () => {
      if (!user?.academyId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/db/ams-about?academyId=${user.academyId}`);
        if (!response.ok) throw new Error('Failed to fetch about data');

        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          setFormData({
            logo: data.logos?.[0] || null,
            color: data.color || "#000000",
            about: data.description || "",
            socialMedia: Object.entries(data.contact?.socialMedia || {}).map(([name, url]) => ({
              name: name.charAt(0).toUpperCase() + name.slice(1),
              url: url as string
            })),
            collaterals: data.collaterals || []
          });
        }
      } catch (error) {
        console.error('Error loading about data:', error);
        toast({
          title: "Error",
          description: "Failed to load academy information",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAboutData();
  }, [user?.academyId]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        handleFormChange(prev => ({
          ...prev,
          logo: e.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFormChange = (updater: (prev: AboutPageData) => AboutPageData) => {
    setFormData(updater)
    setHasUnsavedChanges(true)
  }

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFormChange(prev => ({
      ...prev,
      color: event.target.value
    }))
  }

  const handleSocialMediaChange = (index: number, field: "name" | "url", value: string) => {
    handleFormChange(prev => {
      const updatedSocialMedia = [...prev.socialMedia]
      updatedSocialMedia[index][field] = value
      return {
        ...prev,
        socialMedia: updatedSocialMedia
      }
    })
  }

  const addSocialMedia = () => {
    setFormData(prev => ({
      ...prev,
      socialMedia: [...prev.socialMedia, { name: "", url: "" }]
    }))
    setHasUnsavedChanges(true)
  }

  const removeSocialMedia = (index: number) => {
    const updatedSocialMedia = formData.socialMedia.filter((_, i) => i !== index)
    setFormData(prev => ({
      ...prev,
      socialMedia: updatedSocialMedia
    }))
    setHasUnsavedChanges(true)
  }

  const handleCollateralClick = (index: number) => {
    const updatedCollaterals = [...formData.collaterals]
    updatedCollaterals[index].checked = !updatedCollaterals[index].checked
    setFormData(prev => ({
      ...prev,
      collaterals: updatedCollaterals
    }))
    setSelectedCollateral(index)
    setHasUnsavedChanges(true)
  }

  const handleFileUpload = (index: number, files: FileList) => {
    const updatedCollaterals = [...formData.collaterals]
    const newFiles: CollateralFile[] = Array.from(files).map((file) => ({
      academyId: user?.academyId || '',
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
      dateUploaded: new Date().toLocaleDateString(),
    }))
    updatedCollaterals[index].files = [...updatedCollaterals[index].files, ...newFiles]
    setFormData(prev => ({
      ...prev,
      collaterals: updatedCollaterals
    }))
    setHasUnsavedChanges(true)
  }

  const handleFileDelete = (collateralIndex: number, fileId: string) => {
    const updatedCollaterals = [...formData.collaterals]
    updatedCollaterals[collateralIndex].files = updatedCollaterals[collateralIndex].files.filter(
      (file) => file.id !== fileId,
    )
    setFormData(prev => ({
      ...prev,
      collaterals: updatedCollaterals
    }))
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    try {
      const updatedData = {
        ...aboutData,
        name: aboutData.name,
        description: formData.about,
        logos: formData.logo ? [formData.logo] : [],
        color: formData.color,
        contact: {
          ...aboutData.contact,
          socialMedia: formData.socialMedia.reduce((acc, item) => ({
            ...acc,
            [item.name.toLowerCase()]: item.url
          }), {})
        },
        collaterals: formData.collaterals,
        updatedAt: new Date().toISOString()
      };

      const response = await fetch('/api/db/ams-about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) throw new Error('Failed to save about data');

      setAboutData(updatedData);
      setHasUnsavedChanges(false);
      setIsEditing(false);

      toast({
        title: "Success",
        description: "Academy information saved successfully",
      });
    } catch (error) {
      console.error('Error saving about data:', error);
      toast({
        title: "Error",
        description: "Failed to save academy information",
        variant: "destructive",
      });
    }
  };

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = async () => {
    if (!user?.academyId) return;
    
    try {
      const response = await fetch(`/api/db/ams-about?academyId=${user.academyId}`);
      if (!response.ok) throw new Error('Failed to fetch about data');
      
      const data = await response.json();
      if (data && Object.keys(data).length > 0) {
        setAboutData(data);
        setFormData({
          logo: data.logos?.[0] || null,
          color: data.color || "#000000",
          about: data.description || "",
          socialMedia: Object.entries(data.contact?.socialMedia || {}).map(([name, url]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            url: url as string
          })),
          collaterals: data.collaterals || formData.collaterals
        });
      }
    } catch (error) {
      console.error('Error reloading data:', error);
      toast({
        title: "Error",
        description: "Failed to reload academy information",
        variant: "destructive",
      });
    }
    
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  // Add deleteTeamPhoto function
  const deleteTeamPhoto = (index: number) => {
    const newPhotos = [...teamPhotos]
    newPhotos.splice(index, 1)
    setTeamPhotos(newPhotos)
  }

  // Add function to handle file click
  const handleFileClick = (file: CollateralFile) => {
    setSelectedFile(file)
  }

  // Add helper function to get icon for social media platform
  const getSocialIcon = (platformName: string) => {
    const name = platformName.toLowerCase()
    switch (name) {
      case 'facebook':
        return <Facebook className="h-5 w-5 mr-2" />
      case 'instagram':
        return <Instagram className="h-5 w-5 mr-2" />
      case 'youtube':
        return <Youtube className="h-5 w-5 mr-2" />
      case 'twitter':
      case 'x':
        return <Twitter className="h-5 w-5 mr-2" />
      default:
        return null
    }
  }

  const CollateralSection = () => {
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    return (
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Social Media Collaterals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formData.collaterals.map((collateral, index) => {
            return (
              <Card key={collateral.name} className="relative">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <span>{collateral.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        {collateral.files.length} files
                      </span>
                      {isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRefs.current[index]?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      )}
                      <input
                        type="file"
                        ref={el => fileInputRefs.current[index] = el}
                        className="hidden"
                        accept={collateral.acceptedTypes}
                        multiple
                        onChange={(e) => {
                          if (e.target.files) {
                            const newFiles = Array.from(e.target.files).map(file => ({
                              id: Math.random().toString(36).substr(2, 9),
                              name: file.name,
                              url: URL.createObjectURL(file),
                              type: file.type,
                              dateUploaded: new Date().toISOString()
                            }));
                            
                            setFormData(prev => ({
                              ...prev,
                              collaterals: prev.collaterals.map((col, i) => 
                                i === index ? {
                                  ...col,
                                  files: [...col.files, ...newFiles]
                                } : col
                              )
                            }));
                            setHasUnsavedChanges(true);
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      {collateral.files.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                          <span className="truncate flex-1">{file.name}</span>
                          {isEditing && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  collaterals: prev.collaterals.map((col, i) => 
                                    i === index ? {
                                      ...col,
                                      files: col.files.filter(f => f.id !== file.id)
                                    } : col
                                  )
                                }));
                                setHasUnsavedChanges(true);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar /> {/* Add the Sidebar component here */}
      <div className="flex-1 flex flex-col space-y-6 overflow-auto p-8">
        {/* Top bar with Edit/Save buttons */}
        <div className="flex justify-end mb-8 space-x-4">
          {!isEditing ? (
            <Button onClick={handleEdit} className="bg-cyan-500 text-black hover:bg-cyan-400">
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleCancel} 
                variant="ghost" 
                className="text-white border border-gray-600 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className="bg-green-500 text-black px-6 py-3 font-bold hover:bg-green-400 disabled:bg-gray-500 disabled:text-gray-300"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>

        {/* Rest of the component remains similar to previous implementation */}
        {/* Team Logo */}
        <div className="mb-12">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-4">Team Logo</h2>
              <div className="relative">
                <div
                  className={`w-32 h-32 border-2 border-dashed border-gray-600 flex items-center justify-center bg-black 
                    ${isEditing ? 'cursor-pointer' : ''}`}
                  onClick={isEditing ? () => fileInputRef.current?.click() : undefined}
                >
                  {formData.logo ? (
                    <>
                      <Image src={formData.logo || "/placeholder.svg"} alt="Team Logo" width={128} height={128} />
                      {isEditing && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFormChange(prev => ({
                              ...prev,
                              logo: null
                            }));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">
                      {isEditing ? 'Click to add logo' : 'No logo uploaded'}
                    </span>
                  )}
                </div>
                {isEditing && (
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleLogoUpload} 
                    accept="image/*" 
                  />
                )}
              </div>
            </div>
            <div className="text-right">
              <h3 className="mb-2">Team Color</h3>
              {isEditing ? (
                <input
                  type="color"
                  value={formData.color}
                  onChange={handleColorChange}
                  className="w-32 h-8 bg-black border border-gray-600"
                />
              ) : (
                <div 
                  className="w-32 h-8 border border-gray-600" 
                  style={{backgroundColor: formData.color}}
                />
              )}
            </div>
          </div>
        </div>

        {/* About Section - Updated */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>About Academy</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.about}
              onChange={(e) => handleFormChange(prev => ({
                ...prev,
                about: e.target.value
              }))}
              placeholder="Enter academy description..."
              className="min-h-[400px] w-full bg-gray-800 text-white resize-none"
              disabled={!isEditing}
            />
          </CardContent>
        </Card>

        {/* Social Media Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Social Media Details</h2>
          <div className="space-y-4">
            {formData.socialMedia.map((platform, index) => (
              <div key={index} className="flex items-center gap-4">
                {isEditing ? (
                  <>
                    <div className="flex items-center w-1/3">
                      {getSocialIcon(platform.name)}
                      <Input
                        value={platform.name}
                        onChange={(e) => handleSocialMediaChange(index, "name", e.target.value)}
                        placeholder="Platform name"
                        className="bg-black border-gray-600 text-white"
                      />
                    </div>
                    <Input
                      value={platform.url}
                      onChange={(e) => handleSocialMediaChange(index, "url", e.target.value)}
                      placeholder="URL"
                      className="flex-1 bg-black border-gray-600 text-white"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSocialMedia(index)}
                      className="text-white hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center w-1/3">
                      {getSocialIcon(platform.name)}
                      <span>{platform.name}</span>
                    </div>
                    <a 
                      href={platform.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex-1 text-cyan-400 hover:underline"
                    >
                      {platform.url}
                    </a>
                  </>
                )}
              </div>
            ))}
            {isEditing && (
              <Button
                onClick={addSocialMedia}
                variant="ghost"
                className="mt-2 text-white border border-gray-600 hover:bg-gray-800"
              >
                <Plus className="h-4 w-4 mr-2" /> Add More
              </Button>
            )}
          </div>
        </section>

        {/* Social Media Collaterals */}
        <CollateralSection />

        {/* Collateral Modal */}
        {selectedCollateral !== null && (
          <CollateralModal
            isOpen={true}
            onClose={() => setSelectedCollateral(null)}
            title={formData.collaterals[selectedCollateral].name}
            acceptedTypes={formData.collaterals[selectedCollateral].acceptedTypes}
            files={formData.collaterals[selectedCollateral].files}
            onFileUpload={(files) => handleFileUpload(selectedCollateral, files)}
            onFileDelete={(fileId) => handleFileDelete(selectedCollateral, fileId)}
            onFileClick={handleFileClick}
          />
        )}

        {/* File Content Modal */}
        {selectedFile && (
          <Dialog open={true} onOpenChange={() => setSelectedFile(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{selectedFile.name}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {selectedFile.type.startsWith("image/") ? (
                  <Image src={selectedFile.url} alt={selectedFile.name} width={600} height={400} />
                ) : (
                  <iframe src={selectedFile.url} className="w-full h-[400px]" />
                )}
              </div>
              <DialogFooter>
                <Button variant="default" onClick={() => setSelectedFile(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Sponsorship Button */}
        <div className="mt-12 flex justify-end">
          <Button className="bg-cyan-500 text-black px-6 py-3 font-bold hover:bg-cyan-400">
            APPLY FOR SPONSORSHIP
          </Button>
        </div>
      </div>
    </div>
  )
}