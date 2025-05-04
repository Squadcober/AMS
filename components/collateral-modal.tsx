import React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { CollateralFile } from "@/types/collateral"

interface CollateralModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  acceptedTypes: string
  files: CollateralFile[]
  onFileUpload: (files: FileList) => void
  onFileDelete: (fileId: string) => void
  onFileClick: (file: CollateralFile) => void // Add this prop
}

export function CollateralModal({
  isOpen,
  onClose,
  title,
  acceptedTypes,
  files,
  onFileUpload,
  onFileDelete,
  onFileClick // Add this prop
}: CollateralModalProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFileUpload(event.target.files)
      event.target.value = "" // Reset input
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black text-white border border-gray-600 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
        </DialogHeader>

        {/* Upload Section */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-dashed border-2 border-gray-600 hover:border-gray-400"
          >
            Click to upload files or drag and drop
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept={acceptedTypes}
            multiple
          />
          <p className="text-sm text-gray-400 mt-2">Accepted formats: {acceptedTypes.split(",").join(", ")}</p>
        </div>

        {/* Files List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 border border-gray-600 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-sm truncate">{file.name}</span>
                <span className="text-xs text-gray-400">{file.dateUploaded}</span>
                <Button variant="link" onClick={() => onFileClick(file)}>
                  View
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFileDelete(file.id)}
                  className="text-white hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

