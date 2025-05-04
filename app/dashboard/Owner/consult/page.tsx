"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Sidebar } from "@/components/Sidebar" // Import the Sidebar component

const consultingCategories = [
  "Grassroots",
  "Revenue Generation",
  "Accreditation",
  "Expansion",
  "Events",
  "Branding & Marketing",
  "Coach Education",
  "Exchange Program",
  "Others",
]

export default function ConsultPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showError, setShowError] = useState(false)

  const handleCategorySelect = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories((prev) => prev.filter((c) => c !== category))
      setShowError(false)
    } else if (selectedCategories.length < 3) {
      setSelectedCategories((prev) => [...prev, category])
      setShowError(false)
    } else {
      setShowError(true)
    }
  }

  const handleApply = () => {
    // Here you would typically handle the consultation application
    console.log("Selected categories:", selectedCategories)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar /> {/* Add the Sidebar component here */}
      <div className="flex-1 flex flex-col space-y-6 overflow-auto p-4">
        <h1 className="text-3xl font-bold text-white">Consult</h1>
        <Card className="max-w-4xl mx-auto bg-black border-cyan-400/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-cyan-400">SELECT CONSULTING CATEGORIES (Up to 3)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {showError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  You can only select up to 3 categories. Please deselect a category before adding a new one.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((index) => (
                <Select
                  key={index}
                  value={selectedCategories[index - 1] || ""}
                  onValueChange={(value) => handleCategorySelect(value)}
                >
                  <SelectTrigger className="w-full bg-gray-900 border-gray-700">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultingCategories.map((category) => (
                      <SelectItem key={category} value={category} disabled={selectedCategories.includes(category)}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>

            <div className="space-y-2">
              {consultingCategories.map((category) => (
                <div
                  key={category}
                  className={`p-3 bg-gray-800 cursor-pointer transition-colors ${
                    selectedCategories.includes(category) ? "border-l-4 border-cyan-400" : "border-l-4 border-transparent"
                  }`}
                  onClick={() => handleCategorySelect(category)}
                >
                  <div className="flex items-center justify-between">
                    <span>{category}</span>
                    {selectedCategories.includes(category) && <Badge className="bg-cyan-400 text-black">Selected</Badge>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-8">
              <div className="flex items-center gap-2">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-28wkTrtmVPAMpJ9SZ0HVFcIb2xbrdy.png"
                  alt="SEVN Logo"
                  className="h-8"
                />
                <span className="text-gray-400">Powered by SEVN</span>
              </div>
              <Button
                onClick={handleApply}
                disabled={selectedCategories.length === 0}
                className="bg-cyan-400 text-black hover:bg-cyan-500"
              >
                APPLY
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

