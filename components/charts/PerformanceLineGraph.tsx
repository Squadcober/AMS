"use client"

import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface PerformanceData {
  date: string
  value: number
  attribute: string
}

interface PerformanceLineGraphProps {
  data: PerformanceData[]
  title?: string
}

export function PerformanceLineGraph({ data, title = "Performance Over Time" }: PerformanceLineGraphProps) {
  const uniqueAttributes = [...new Set(data.map(item => item.attribute))]
  const labels = [...new Set(data.map(item => item.date))].sort()

  const datasets = uniqueAttributes.map(attribute => ({
    label: attribute,
    data: labels.map(date => {
      const matchingData = data.find(item => item.date === date && item.attribute === attribute)
      return matchingData ? matchingData.value : null
    }),
    borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
    tension: 0.4,
  }))

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
      },
    },
  }

  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-lg shadow">
      <Line options={chartOptions} data={{ labels, datasets }} />
    </div>
  )
}
