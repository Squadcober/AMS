"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePlayers } from "@/contexts/PlayerContext"
import { Radar } from "react-chartjs-2"
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from "chart.js"

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

interface PlayerAttributes {
  shooting: number;
  pace: number;
  positioning: number;
  passing: number;
  ballControl: number;
  crossing: number;
}

interface Props {
  batchId: string
}

export default function ComparePlayers({ batchId }: Props) {
  const { players } = usePlayers()
  const [playersToCompare, setPlayersToCompare] = useState<string[]>([])

  const batchPlayers = players.filter((player) => batchId && batchId.includes(player.id.toString()))

  const handlePlayerSelect = (playerId: string) => {
    if (playersToCompare.includes(playerId)) {
      setPlayersToCompare(playersToCompare.filter((id) => id !== playerId))
    } else if (playersToCompare.length < 11) {
      setPlayersToCompare([...playersToCompare, playerId])
    }
  }

  const generateRadarData = () => {
    const labels = ["Shooting", "Pace", "Positioning", "Passing", "Ball Control", "Crossing"]
    const datasets = playersToCompare.map((playerId, index) => {
      const player = players.find((p) => p.id.toString() === playerId)
      const color = `hsl(${(index * 360) / playersToCompare.length}, 70%, 50%)`
      return {
        label: player?.name || "",
        data: [
          player?.attributes.shooting || 0,
          player?.attributes.pace || 0,
          player?.attributes.positioning || 0,
          player?.attributes.passing || 0,
          player?.attributes.ballControl || 0,
          player?.attributes.crossing || 0,
        ],
        backgroundColor: `${color}33`,
        borderColor: color,
        borderWidth: 2,
      }
    })
    return { labels, datasets }
  }

  const radarOptions = {
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        min: 0,
        ticks: {
          stepSize: 1,
        },
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compare Players</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {batchPlayers.map((player) => (
            <div key={player.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={playersToCompare.includes(player.id.toString())}
                onChange={(e) => handlePlayerSelect(player.id.toString())}
              />
              <span>{player.name}</span>
            </div>
          ))}
        </div>
        {playersToCompare.length > 0 && (
          <div className="mt-4">
            <Radar data={generateRadarData()} options={radarOptions} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

