// ...existing imports...

import { DialogContent, DialogHeader } from "@/components/ui/dialog"
import { DialogTitle } from "@radix-ui/react-dialog"
import Image from "next/image"

interface CoachInfo {
  username: string
  name: string
  email: string
  about: string
  academyId: string
  age: number
  averageRating: string
  license: string
  photoUrl: string
  ratings: Array<{
    rating: number
    date: string
    studentId: string
  }>
}

export default function BatchesPage() {
  // ...existing state declarations...

  // Helper to get coach info by username
  const getCoachInfo = (coachId: string) => {
    try {
      const users = JSON.parse(localStorage.getItem('ams-users') || '[]')
      const coachData = JSON.parse(localStorage.getItem('ams-coach-data') || '[]')
      const userInfo = users.find((u: any) => u.username === coachId)
      const coachSpecificInfo = coachData.find((c: any) => c.username === coachId)
      if (!userInfo && !coachSpecificInfo) return null
      return {
        ...userInfo,
        ...coachSpecificInfo,
        name: coachSpecificInfo?.name || userInfo?.name || 'Unknown Coach',
        email: coachSpecificInfo?.email || userInfo?.email || '',
        about: coachSpecificInfo?.about || userInfo?.about || 'No information available',
        license: coachSpecificInfo?.license || userInfo?.license || 'Not specified',
        photoUrl: coachSpecificInfo?.photoUrl || userInfo?.photoUrl || '/placeholder.svg',
        averageRating: coachSpecificInfo?.averageRating || '0',
        ratings: coachSpecificInfo?.ratings || []
      }
    } catch {
      return null
    }
  }

  // Dialog to show coach info
  const CoachDialog = ({ coachId }: { coachId: string }) => {
    const coachInfo = getCoachInfo(coachId)

    if (!coachInfo) {
      return (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coach Information</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p>Could not load coach information</p>
          </div>
        </DialogContent>
      )
    }

    return (
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Coach Information</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 relative rounded-full overflow-hidden">
              <Image
                src={coachInfo.photoUrl}
                alt={coachInfo.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{coachInfo.name}</h3>
              <p className="text-sm text-gray-500">{coachInfo.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium">License</label>
              <p className="text-sm">{coachInfo.license}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Rating</label>
              <p className="text-sm">{coachInfo.averageRating}/5</p>
            </div>
            <div>
              <label className="text-sm font-medium">About</label>
              <p className="text-sm whitespace-pre-wrap">{coachInfo.about}</p>
            </div>
            {coachInfo.ratings && coachInfo.ratings.length > 0 && (
              <div>
                <label className="text-sm font-medium">Recent Ratings</label>
                <div className="mt-2 space-y-2">
                  {coachInfo.ratings.slice(-2).map((rating, index) => (
                    <div key={index} className="bg-gray-100 p-2 rounded-md">
                      <p className="text-sm">Rating: {rating.rating}/5</p>
                      <p className="text-xs text-gray-500">
                        {new Date(rating.date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    )
  }

  // In your batch details rendering (where you show coach info), replace the single coach display with:
  // Example: inside your batch details card/component

  {/* Render all coaches for the batch */}
  {batch.coachIds && Array.isArray(batch.coachIds) && batch.coachIds.length > 0 ? (
    <div>
      <div className="font-semibold mb-2">Coaches:</div>
      <div className="flex flex-wrap gap-4">
        {batch.coachIds.map((coachId: string) => {
          const coachInfo = getCoachInfo(coachId);
          return (
            <div key={coachId} className="flex items-center gap-2">
              <div className="w-10 h-10 relative rounded-full overflow-hidden">
                <Image
                  src={coachInfo?.photoUrl || "/placeholder.svg"}
                  alt={coachInfo?.name || "Coach"}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <div className="font-medium">{coachInfo?.name || coachId}</div>
                <div className="text-xs text-gray-500">{coachInfo?.email}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  ) : (
    // Fallback for single coachId (legacy batches)
    batch.coachId && (
      <div>
        <div className="font-semibold mb-2">Coach:</div>
        {(() => {
          const coachInfo = getCoachInfo(batch.coachId);
          return (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 relative rounded-full overflow-hidden">
                <Image
                  src={coachInfo?.photoUrl || "/placeholder.svg"}
                  alt={coachInfo?.name || "Coach"}
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <div className="font-medium">{coachInfo?.name || batch.coachId}</div>
                <div className="text-xs text-gray-500">{coachInfo?.email}</div>
              </div>
            </div>
          );
        })()}
      </div>
    )
  )}
}
