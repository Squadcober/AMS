import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface SliderProps {
  children: React.ReactNode[]
  activeIndex: number
}

export default function Slider({ children, activeIndex }: SliderProps) {
  const [currentIndex, setCurrentIndex] = useState(activeIndex)
  const sliderRef = useRef<HTMLDivElement>(null)

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : children.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex < children.length - 1 ? prevIndex + 1 : 0))
  }

  useEffect(() => {
    setCurrentIndex(activeIndex)
  }, [activeIndex])

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.transform = `translateX(-${currentIndex * 100}%)`
    }
  }, [currentIndex])

  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex transition-transform duration-300 ease-in-out" ref={sliderRef}>
        {children.map((child, index) => (
          <div key={index} className="w-full flex-shrink-0">
            {child}
          </div>
        ))}
      </div>
      <button
        onClick={handlePrev}
        className="absolute top-1/2 left-0 transform -translate-y-1/2 bg-white p-2 rounded-full shadow-md"
      >
        <ChevronLeft />
      </button>
      <button
        onClick={handleNext}
        className="absolute top-1/2 right-0 transform -translate-y-1/2 bg-white p-2 rounded-full shadow-md"
      >
        <ChevronRight />
      </button>
    </div>
  )
}
