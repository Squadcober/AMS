import { useState } from "react"
import { Droppable, Draggable } from "react-beautiful-dnd"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import DraggableComponent from "@/components/DraggableComponent"

interface Position {
  id: string
  name: string
}

interface Player {
  id: number
  name: string
  position: string
}

interface FootballFieldProps {
  positions: Position[]
  selectedGamePlan: any
  players: Player[]
  handlePositionClick: (position: Position) => void
  handleRemovePlayer: (positionId: string) => void
}

export default function FootballField({
  positions,
  selectedGamePlan,
  players,
  handlePositionClick,
  handleRemovePlayer,
}: FootballFieldProps) {
  return (
    <div className="relative w-full aspect-[0.647] bg-green-800 rounded-md overflow-hidden">
      {/* Outer border - white lines */}
      <div className="absolute inset-2 border-2 border-white/70" />

      {/* Center line */}
      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/70" />

      {/* Center circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[15%] rounded-full border-2 border-white/70" />

      {/* Penalty areas */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[15%] border-2 border-b-0 border-white/70" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[15%] border-2 border-t-0 border-white/70" />

      {/* Goal areas */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[30%] h-[6%] border-2 border-b-0 border-white/70" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-[6%] border-2 border-t-0 border-white/70" />

      {/* Penalty spots */}
      <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/70" />
      <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/70" />

      {/* Corner arcs */}
      <div className="absolute bottom-2 left-2 w-4 h-4 border-2 border-l-0 border-b-0 rounded-tr-full border-white/70" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-2 border-r-0 border-b-0 rounded-tl-full border-white/70" />
      <div className="absolute top-2 left-2 w-4 h-4 border-2 border-l-0 border-t-0 rounded-br-full border-white/70" />
      <div className="absolute top-2 right-2 w-4 h-4 border-2 border-r-0 border-t-0 rounded-bl-full border-white/70" />

      {/* Player positions */}
      {positions.map((position) => (
        <Droppable key={position.id} droppableId={`positions-${position.id}`}>
          {(provided) => (
            <DraggableComponent>
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="absolute w-12 h-12 bg-white/30 hover:bg-white/40 transition-colors rounded-full flex items-center justify-center border-2 border-white/50 cursor-pointer group"
                style={getPositionStyle(position.id)}
                onClick={() => handlePositionClick(position)}
              >
                {selectedGamePlan.positions[position.id] ? (
                  <Draggable draggableId={selectedGamePlan.positions[position.id] as string} index={0}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="text-white text-xs text-center w-full relative"
                      >
                        {
                          players.find((p) => p.id.toString() === selectedGamePlan.positions[position.id])?.name
                        }
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemovePlayer(position.id)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ) : (
                  <div className="text-white text-xs text-center">{position.name}</div>
                )}
                {provided.placeholder}
              </div>
            </DraggableComponent>
          )}
        </Droppable>
      ))}
    </div>
  )
}

function getPositionStyle(positionId: string): React.CSSProperties {
  const positions: { [key: string]: { top: string; left: string } } = {
    gk: { top: "90%", left: "50%" },
    lb: { top: "75%", left: "20%" },
    cb1: { top: "75%", left: "40%" },
    cb2: { top: "75%", left: "60%" },
    rb: { top: "75%", left: "80%" },
    lm: { top: "45%", left: "20%" },
    cm1: { top: "45%", left: "40%" },
    cm2: { top: "45%", left: "60%" },
    rm: { top: "45%", left: "80%" },
    st1: { top: "15%", left: "35%" },
    st2: { top: "15%", left: "65%" },
  }

  return {
    top: positions[positionId].top,
    left: positions[positionId].left,
    transform: "translate(-50%, -50%)",
  }
}
