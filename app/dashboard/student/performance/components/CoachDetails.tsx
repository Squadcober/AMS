import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"

interface CoachDetailsProps {
  coach: any
  handleViewPhoto: (photoUrl: string) => void
  handleRateCoach: (coachId: string, rating: number) => void
  rating: number
}

const CoachDetails: React.FC<CoachDetailsProps> = ({ coach, handleViewPhoto, handleRateCoach, rating }) => {
  if (!coach) return null

  return (
    <div className="flex items-center space-x-4">
      <img src={coach.photoUrl} alt="Coach Photo" className="w-32 h-32 rounded-full cursor-pointer" onClick={() => handleViewPhoto(coach.photoUrl)} />
      <div>
        <h3 className="text-lg font-semibold">{coach.name}</h3>
        <div className="flex items-center">
          <Star className="w-4 h-4 fill-yellow-400" />
          <span className="ml-1">{coach.rating}/5</span>
        </div>
        <div className="flex justify-center space-x-2 mt-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`cursor-pointer ${star <= rating ? "fill-yellow-400" : "fill-gray-300"}`}
              onClick={() => handleRateCoach(coach.id, star)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default CoachDetails
