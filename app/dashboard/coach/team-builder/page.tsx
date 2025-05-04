"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { usePlayers } from "@/contexts/PlayerContext"
import { CustomTooltip } from "@/components/custom-tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table as TableIconLucide, X, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import ComparePlayers from "@/components/ComparePlayers"
import { useBatches } from "@/contexts/BatchContext"
import { Radar, Line } from "react-chartjs-2"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale } from "chart.js"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Slider from "@/components/Slider"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/contexts/AuthContext"
import Sidebar from "@/components/Sidebar"
import { exportToDoc, exportMultipleToDoc } from '@/lib/doc-export';
import html2canvas from 'html2canvas';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import jsPDF from 'jspdf';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale)

const PLAYER_COLORS = [
  "rgba(255,99,132,0.5)",   // Red
  "rgba(54,162,235,0.5)",   // Blue
  "rgba(255,206,86,0.5)",   // Yellow
  "rgba(75,192,192,0.5)",   // Teal
  "rgba(153,102,255,0.5)",  // Purple
  "rgba(255,159,64,0.5)",   // Orange
  "rgba(199,199,199,0.5)",  // Grey
  "rgba(255,99,255,0.5)",   // Pink
  "rgba(99,255,132,0.5)",   // Green
  "rgba(99,132,255,0.5)",   // Light Blue
  "rgba(255,222,99,0.5)",   // Light Yellow
];
const PLAYER_BORDER_COLORS = [
  "rgb(255,99,132)",
  "rgb(54,162,235)",
  "rgb(255,206,86)",
  "rgb(75,192,192)",
  "rgb(153,102,255)",
  "rgb(255,159,64)",
  "rgb(199,199,199)",
  "rgb(255,99,255)",
  "rgb(99,255,132)",
  "rgb(99,132,255)",
  "rgb(255,222,99)",
];

interface Position {
  id: string
  name: string
  shortName: string
  type?: string
}

interface PlayerAttributes {
  shooting: number
  pace: number
  positioning: number
  passing: number
  ballControl: number
  crossing: number
}

interface Player {
  id: number
  name: string
  position: string
  attributes: PlayerAttributes
}

interface GamePlan {
  id: string
  name: string
  size: string
  gk: boolean
  positions: {
    [key: string]: { playerId: string; top: string; left: string } | null
  }
  strategy: string
  coachId: string
  substitutes: {
    playerId: string;
    position: string;
  }[];
  academyId: string;
}

const positions: Position[] = [
  { id: "gk", name: "Goalkeeper", shortName: "GK" },
  { id: "lb", name: "Left Back", shortName: "LB" },
  { id: "cb1", name: "Center Back 1", shortName: "CB" },
  { id: "cb2", name: "Center Back 2", shortName: "CB" },
  { id: "rb", name: "Right Back", shortName: "RB" },
  { id: "lm", name: "Left Midfielder", shortName: "LM" },
  { id: "cm1", name: "Center Midfielder 1", shortName: "CM" },
  { id: "cm2", name: "Center Midfielder 2", shortName: "CM" },
  { id: "rm", name: "Right Midfielder", shortName: "RM" },
  { id: "st1", name: "Striker 1", shortName: "ST" },
  { id: "st2", name: "Striker 2", shortName: "ST" },
]

const LOCAL_STORAGE_KEY = "team-builder-gameplans"

// Add these position types at the top with other interfaces
const POSITION_TYPES = [
  { id: "gk", name: "Goalkeeper", shortName: "GK" },
  { id: "def", name: "Defender", shortName: "DEF" },
  { id: "mid", name: "Midfielder", shortName: "MID" },
  { id: "cam", name: "Attacking Midfielder", shortName: "CAM" },
  { id: "lw", name: "Left Winger", shortName: "LW" },
  { id: "rw", name: "Right Winger", shortName: "RW" },
  { id: "fwd", name: "Forward", shortName: "FWD" },
  { id: "any", name: "Any Position", shortName: "ANY" },
] as const;

export default function TeamBuilder() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { players, setPlayers } = usePlayers()
  const { batches, setBatches } = useBatches()
  const [gamePlans, setGamePlans] = useState<GamePlan[]>([])
  const [newGamePlanName, setNewGamePlanName] = useState("")
  const [newGamePlanSize, setNewGamePlanSize] = useState("11")
  const [newGamePlanStrategy, setNewGamePlanStrategy] = useState("")
  const [selectedGamePlan, setSelectedGamePlan] = useState<GamePlan | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null)
  const [draggedPosition, setDraggedPosition] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedAttribute, setSelectedAttribute] = useState<string>("shooting")
  const [activeTab, setActiveTab] = useState<number>(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const fieldRef = useRef<HTMLDivElement>(null); // Add this ref
  const [customPositions, setCustomPositions] = useState<Position[]>([]);
  const [showCustomizeMenu, setShowCustomizeMenu] = useState(false);
  const [selectedPositionType, setSelectedPositionType] = useState<string>("any");
  const [deletedPositions, setDeletedPositions] = useState<string[]>([]);
  const [showSubstitutesModal, setShowSubstitutesModal] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [positionPlayers, setPositionPlayers] = useState<{[key: string]: any[]}>({});
  const [substitutePlayers, setSubstitutePlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFormation, setSelectedFormation] = useState<string>("4-4-2"); // Default formation

  // Replace localStorage useEffect with MongoDB fetch
  useEffect(() => {
    const fetchGameplans = async () => {
      try {
        if (!user?.academyId || !user?.id) return;
        
        // Fetch all gameplans for the academy
        const response = await fetch(`/api/db/ams-gameplan?academyId=${user.academyId}`);
        if (!response.ok) throw new Error('Failed to fetch gameplans');
        
        const result = await response.json();
        if (result.success) {
          // Filter gameplans to only those created by the current coach
          const coachGamePlans = result.data.filter((plan: any) => plan.coachId === user.id);
          setGamePlans(coachGamePlans);
          if (coachGamePlans.length > 0) {
            setSelectedGamePlan(coachGamePlans[0]);
          } else {
            setSelectedGamePlan(null);
          }
        }
      } catch (error) {
        console.error('Error loading gameplans:', error);
        toast({
          title: "Error",
          description: "Failed to load gameplans",
          variant: "destructive",
        });
      }
    };

    fetchGameplans();
  }, [user?.academyId, user?.id]);

  useEffect(() => {
    if (gamePlans.length > 0 && !selectedGamePlan) {
      setSelectedGamePlan(gamePlans[0])
    }
  }, [gamePlans, selectedGamePlan])

  // Add useEffect to sync strategy when selected game plan changes
  useEffect(() => {
    if (selectedGamePlan) {
      setNewGamePlanStrategy(selectedGamePlan.strategy || "");
    }
  }, [selectedGamePlan]);

  // Replace createGamePlan handler
  const handleCreateGamePlan = async () => {
    if (!user?.id || !user?.academyId) {
      toast({
        title: "Error",
        description: "User information missing",
        variant: "destructive",
      });
      return;
    }

    if (!newGamePlanName) return;

    try {
      const newGamePlan = {
        name: newGamePlanName,
        size: newGamePlanSize,
        positions: positions.reduce((acc, pos) => ({ ...acc, [pos.id]: null }), {}),
        strategy: newGamePlanStrategy,
        coachId: user.id,
        academyId: user.academyId,
        substitutes: [],
        formation: selectedFormation
      };

      const response = await fetch('/api/db/ams-gameplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGamePlan)
      });

      if (!response.ok) throw new Error('Failed to create gameplan');
      
      const result = await response.json();
      
      if (result.success) {
        setGamePlans(prev => [...prev, result.data]);
        setSelectedGamePlan(result.data);
        
        setNewGamePlanName("");
        setNewGamePlanSize("11");
        setNewGamePlanStrategy("");
        setIsCreateDialogOpen(false);

        toast({
          title: "Success",
          description: "Game plan created successfully",
        });
      }
    } catch (error) {
      console.error('Error creating gameplan:', error);
      toast({
        title: "Error",
        description: "Failed to create gameplan",
        variant: "destructive",
      });
    }
  };

  // Replace saveGamePlan handler
  const handleSaveGamePlan = async () => {
    try {
      if (!selectedGamePlan || !user?.academyId) {
        toast({
          title: "Error",
          description: "No game plan selected or academy ID missing",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/db/ams-gameplan/${selectedGamePlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: selectedGamePlan.positions,
          formation: selectedFormation,
          strategy: newGamePlanStrategy,
          substitutes: selectedGamePlan.substitutes || [],
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save game plan');
      }

      const updatedGamePlan = await response.json();

      // Update the local state with the updated game plan
      setGamePlans((prevGamePlans) =>
        prevGamePlans.map((gp) =>
          gp.id === updatedGamePlan.id ? updatedGamePlan : gp
        )
      );

      setSelectedGamePlan(updatedGamePlan);

      toast({
        title: "Success",
        description: "Game plan updated successfully",
      });
    } catch (error) {
      console.error('Error saving game plan:', error);
      toast({
        title: "Error",
        description: "Failed to save game plan",
        variant: "destructive",
      });
    }
  };

  const handleSaveGamePlans = async () => {
    try {
      if (!user?.academyId || !selectedGamePlan) {
        toast({
          title: "Error",
          description: "No academy ID or game plan found to save",
          variant: "destructive",
        });
        return;
      }

      // Save the current game plan to the database
      const response = await fetch(`/api/db/ams-gameplan/${selectedGamePlan._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: selectedGamePlan.positions,
          formation: selectedFormation,
          strategy: newGamePlanStrategy,
          substitutes: selectedGamePlan.substitutes || [],
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save game plan');
      }

      // Refresh game plans after saving
      const refreshResponse = await fetch(`/api/db/ams-gameplan?academyId=${user.academyId}`);
      if (refreshResponse.ok) {
        const result = await refreshResponse.json();
        if (result.success) {
          setGamePlans(result.data);
          
          // Find and set the current game plan
          const updatedCurrentPlan = result.data.find(
            (plan: any) => plan._id === selectedGamePlan._id
          );
          if (updatedCurrentPlan) {
            setSelectedGamePlan(updatedCurrentPlan);
          }
        }
      }

      toast({
        title: "Success",
        description: "Game plan saved successfully",
      });
    } catch (error) {
      console.error('Error saving game plan:', error);
      toast({
        title: "Error",
        description: "Failed to save game plan",
        variant: "destructive",
      });
    }
  };

  // Replace deleteGamePlan handler
  const handleDeleteGamePlan = async (gameplanId: string) => {
    try {
      if (!user?.academyId) return;

      const response = await fetch(`/api/db/ams-gameplan?id=${gameplanId}&academyId=${user.academyId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete gameplan');

      setGamePlans(prev => prev.filter(gp => gp._id !== gameplanId));
      
      if (selectedGamePlan?._id === gameplanId) {
        setSelectedGamePlan(gamePlans[0] || null);
      }

      toast({
        title: "Success",
        description: "Game plan deleted successfully",
      });

    } catch (error) {
      console.error('Error deleting gameplan:', error);
      toast({
        title: "Error",
        description: "Failed to delete gameplan",
        variant: "destructive",
      });
    }
  };

  const handleExportGamePlan = () => {
    if (!selectedGamePlan) return;
    
    exportToDoc(selectedGamePlan, players);
    toast({
      title: "Game Plan Exported",
      description: "Your game plan has been exported as a DOC file",
    });
  };

  const handleExportAllGamePlans = () => {
    exportMultipleToDoc(gamePlans, players);
    toast({
      title: "Game Plans Exported",
      description: `${gamePlans.length} game plans have been exported as a DOC file`,
    });
  };

  const exportToPDF = async (
    formationRef: React.RefObject<HTMLDivElement>,
    gamePlan: GamePlan,
    players: Player[],
    batches: any[]
  ) => {
    try {
      // Create new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Page 1: Formation Map
      // Add title
      pdf.setFontSize(24);
      pdf.text(gamePlan.name, 105, 20, { align: 'center' });
      pdf.setFontSize(16);
      pdf.text('Formation', 105, 30, { align: 'center' });
      
      // Add formation image with maximum size while maintaining aspect ratio
      if (formationRef.current) {
        const canvas = await html2canvas(formationRef.current, {
          backgroundColor: null,
          scale: 2,
        });
        const formationImage = canvas.toDataURL('image/png');
        
        // Calculate dimensions to fill most of the page while maintaining aspect ratio
        const pageWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const maxWidth = 190; // Leave margins
        const maxHeight = 230; // Leave space for title and margins
        
        const imgRatio = canvas.width / canvas.height;
        let finalWidth = maxWidth;
        let finalHeight = maxWidth / imgRatio;
        
        if (finalHeight > maxHeight) {
          finalHeight = maxHeight;
          finalWidth = maxHeight * imgRatio;
        }
        
        // Center the image horizontally
        const leftMargin = (pageWidth - finalWidth) / 2;
        // Position below title with some spacing
        const topMargin = 40;
        
        pdf.addImage(formationImage, 'PNG', leftMargin, topMargin, finalWidth, finalHeight);
      }
      
      // Page 2: Details
      pdf.addPage();
      
      // Add Strategy section
      pdf.setFontSize(18);
      pdf.text('Strategy', 20, 20);
      pdf.setFontSize(12);
      const splitStrategy = pdf.splitTextToSize(gamePlan.strategy || 'No strategy defined', 170);
      pdf.text(splitStrategy, 20, 30);
  
      // Add Team Composition section
      let yPosition = 60;
  
      // Add Starting lineup
      pdf.setFontSize(16);
      pdf.text('Starting Lineup', 20, yPosition);
      yPosition += 10;
      pdf.setFontSize(12);
  
      // Draw lineup table headers
      pdf.setFont(undefined, 'bold');
      pdf.text('Position', 20, yPosition);
      pdf.text('Player', 80, yPosition);
      pdf.setFont(undefined, 'normal');
      yPosition += 8;
  
      // Add lineup entries
      Object.entries(gamePlan.positions).forEach(([positionId, data]) => {
        if (data?.playerId) {
          const player = players.find(p => p.id.toString() === data.playerId);
          const position = [...positions, ...customPositions].find(p => p.id === positionId);
          if (player && position) {
            pdf.text(position.name, 20, yPosition);
            pdf.text(player.name, 80, yPosition);
            yPosition += 6;
          }
        }
      });
  
      // Add Substitutes section
      yPosition += 10;
      pdf.setFontSize(16);
      pdf.text('Substitutes', 20, yPosition);
      yPosition += 10;
      pdf.setFontSize(12);
  
      // Draw substitutes table headers
      pdf.setFont(undefined, 'bold');
      pdf.text('Position', 20, yPosition);
      pdf.text('Player', 80, yPosition);
      pdf.setFont(undefined, 'normal');
      yPosition += 8;
  
      // Add substitute entries
      (gamePlan.substitutes || []).forEach(sub => {
        const player = players.find(p => p.id.toString() === sub.playerId);
        if (player) {
          pdf.text(sub.position, 20, yPosition);
          pdf.text(player.name, 80, yPosition);
          yPosition += 6;
        }
      });
  
      // Save the PDF
      pdf.save(`${gamePlan.name}_formation.pdf`);
  
      toast({
        title: "Export Successful",
        description: "Formation and team details have been exported as PDF",
      });
  
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export formation and team details",
        variant: "destructive",
      });
    }
  };

  const handleExportField = async () => {
    if (!fieldRef.current || !selectedGamePlan) return;
  
    try {
      // Show export options dialog
      setShowExportDialog(true);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export formation",
        variant: "destructive",
      });
    }
  };

  const isValidPosition = (player: Player, positionName: string) => {
    const playerPosition = player.position?.toLowerCase() || ""
    if (positionName === "Goalkeeper") {
      return playerPosition === "goalkeeper" || playerPosition === "gk"
    } else if (positionName.includes("Back")) {
      return playerPosition === "defender" || playerPosition === "back"
    } else if (positionName.includes("Midfielder")) {
      return playerPosition === "midfielder" || playerPosition === "mid"
    } else if (positionName.includes("Striker")) {
      return playerPosition === "forward" || playerPosition === "striker" || playerPosition === "attacker"
    }
    return false
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, positionId: string) => {
    setDraggedPosition(positionId)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetPositionId: string) => {
    e.preventDefault()
    if (!selectedGamePlan || !draggedPosition) return

    const sourcePlayer = selectedGamePlan.positions[draggedPosition]
    const targetPlayer = selectedGamePlan.positions[targetPositionId]

    // Swap players between positions
    setSelectedGamePlan({
      ...selectedGamePlan,
      positions: {
        ...selectedGamePlan.positions,
        [draggedPosition]: targetPlayer,
        [targetPositionId]: sourcePlayer,
      },
    })

    setGamePlans(
      gamePlans.map((gp) => (gp.id === selectedGamePlan.id ? { ...gp, positions: selectedGamePlan.positions } : gp)),
    )

    setDraggedPosition(null)
  }

  // Update the handlePlayerSelect function
  const handlePlayerSelect = (playerId: string) => {
    if (!selectedGamePlan || !selectedPosition) {
      toast({
        title: "Error",
        description: "No game plan or position selected",
        variant: "destructive",
      });
      return;
    }

    // Check if player is already assigned
    const isPlayerAssigned = Object.values(selectedGamePlan.positions).some(
      (pos) => pos && pos.playerId === playerId
    );

    if (isPlayerAssigned) {
      toast({
        title: "Error",
        description: "Player is already assigned to another position",
        variant: "destructive",
      });
      return;
    }

    // Get default position coordinates
    const defaultCoordinates = getDefaultPositionStyle(selectedPosition.id);

    // Create a copy of the current positions
    const updatedPositions = {
      ...selectedGamePlan.positions,
      [selectedPosition.id]: {
        playerId,
        top: defaultCoordinates.top,
        left: defaultCoordinates.left,
      },
    };

    // Create updated game plan
    const updatedGamePlan = {
      ...selectedGamePlan,
      positions: updatedPositions,
    };

    // Update both states
    setSelectedGamePlan(updatedGamePlan);
    setGamePlans(prevGamePlans =>
      prevGamePlans.map(gp =>
        gp.id === selectedGamePlan.id ? updatedGamePlan : gp
      )
    );

    // Save to localStorage immediately
    try {
      const allGamePlans = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      const otherGamePlans = allGamePlans.filter((plan: GamePlan) => 
        plan.id !== selectedGamePlan.id
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...otherGamePlans, updatedGamePlan]));
      
      toast({
        title: "Success",
        description: "Player assigned successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
    
    // Close the modal
    setIsModalOpen(false);
    setSelectedPosition(null);
  };

  const handlePlayerDragStart = (e: React.DragEvent<HTMLDivElement>, playerId: string) => {
    e.dataTransfer.setData("playerId", playerId)
  }

  const handlePositionDrop = async (e: React.DragEvent<HTMLDivElement>, positionId: string) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("playerId");
    
    if (playerId && selectedGamePlan) {
      const isPlayerAssigned = Object.values(selectedGamePlan.positions).some(
        (pos) => pos && pos.playerId === playerId
      );
      
      if (isPlayerAssigned) {
        toast({
          title: "Error",
          description: "Player is already assigned to another position",
          variant: "destructive",
        });
        return;
      }

      const defaultCoordinates = getDefaultPositionStyle(positionId);
      const updatedPositions = {
        ...selectedGamePlan.positions,
        [positionId]: {
          playerId,
          top: defaultCoordinates.top,
          left: defaultCoordinates.left,
        },
      };

      // Update local state
      const updatedGamePlan = {
        ...selectedGamePlan,
        positions: updatedPositions,
      };

      setSelectedGamePlan(updatedGamePlan);
      setGamePlans(prevGamePlans => 
        prevGamePlans.map(gp =>
          gp._id === selectedGamePlan._id ? updatedGamePlan : gp
        )
      );

      // Save to database immediately
      try {
        const response = await fetch(`/api/db/ams-gameplan/${selectedGamePlan._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positions: updatedPositions,
            updatedAt: new Date().toISOString()
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save position update');
        }

        toast({
          title: "Success",
          description: "Player position saved",
        });
      } catch (error) {
        console.error('Error saving position:', error);
        toast({
          title: "Error",
          description: "Failed to save player position",
          variant: "destructive",
        });
      }
    }
  };

  const handlePositionDragStart = (e: React.DragEvent<HTMLDivElement>, positionId: string) => {
    e.dataTransfer.setData("positionId", positionId)
  }

  const handlePositionDropOnMap = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!showCustomizeMenu || !selectedGamePlan) return;

    const positionId = e.dataTransfer.getData("positionId");
    if (!positionId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const top = ((e.clientY - rect.top) / rect.height) * 100;
    const left = ((e.clientX - rect.left) / rect.width) * 100;

    const currentPosition = selectedGamePlan.positions[positionId];

    const updatedPosition = {
      ...(typeof currentPosition === 'object' && currentPosition !== null 
        ? currentPosition 
        : { playerId: currentPosition || "" }
      ),
      top: `${top}%`,
      left: `${left}%`,
    };

    const updatedPositions = {
      ...selectedGamePlan.positions,
      [positionId]: updatedPosition,
    };

    // Update selectedGamePlan
    const updatedGamePlan = {
      ...selectedGamePlan,
      positions: updatedPositions,
    };

    setSelectedGamePlan(updatedGamePlan);

    // Update gamePlans and save immediately
    setGamePlans(prevGamePlans => {
      const newGamePlans = prevGamePlans.map(gp =>
        gp.id === selectedGamePlan.id ? updatedGamePlan : gp
      );
      
      try {
        const allGamePlans = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        const otherGamePlans = allGamePlans.filter((plan: GamePlan) => 
          plan.academyId !== updatedGamePlan.academyId || 
          plan.coachId !== updatedGamePlan.coachId
        );
        const finalGamePlans = [...otherGamePlans, ...newGamePlans];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalGamePlans));
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save changes",
          variant: "destructive",
        });
      }

      return newGamePlans;
    });
  };

  const handlePositionClick = (position: Position) => {
    if (!showCustomizeMenu) {
      setSelectedPosition(position)
      setIsModalOpen(true)
    }
  }

  const PlayerSelectionModal = () => {
    const [showAllPositions, setShowAllPositions] = useState(false)
    
    const positionPlayers = useMemo(() => {
      if (!selectedPosition) return [];
      
      return availablePlayers.filter((player) => {
        if (showAllPositions) return true;
        
        const playerPosition = player.position?.toLowerCase() || "";
        const positionName = selectedPosition.name.toLowerCase();
        
        switch (positionName) {
          case "goalkeeper":
            return ["goalkeeper", "gk"].includes(playerPosition);
          case "left back":
          case "center back 1":
          case "center back 2":
          case "right back":
            return ["defender", "back", "lb", "rb", "cb"].includes(playerPosition);
          case "left midfielder":
          case "center midfielder 1":
          case "center midfielder 2":
          case "right midfielder":
            return ["midfielder", "mid", "lm", "rm", "cm"].includes(playerPosition);
          case "striker 1":
          case "striker 2":
            return ["forward", "striker", "attacker", "st"].includes(playerPosition);
          default:
            if (selectedPosition.type) {
              return player.position.toLowerCase().includes(selectedPosition.type.toLowerCase());
            }
            return false;
        }
      });
    }, [selectedPosition, availablePlayers, showAllPositions]);

    const remainingPlayers = useMemo(() => {
      return availablePlayers.filter(player => !positionPlayers.includes(player));
    }, [availablePlayers, positionPlayers]);

    return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-4">
            <DialogTitle>Select Player for {selectedPosition?.name}</DialogTitle>
            {showAllPositions && (
              <div className="text-sm text-muted-foreground">
                Showing players from all positions
              </div>
            )}
          </DialogHeader>

          {positionPlayers.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">No Players Available</h3>
              <p className="text-muted-foreground mb-4">
                There are no players available for the {selectedPosition?.name} position
              </p>
              {!showAllPositions && (
                <Button 
                  onClick={() => setShowAllPositions(true)}
                  className="w-full"
                >
                  View Players from Other Positions ({remainingPlayers.length})
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {(showAllPositions ? availablePlayers : positionPlayers).map((player) => (
                  <div
                    key={player.id}
                    onClick={() => handlePlayerSelect(player.id.toString())}
                    className="flex items-center justify-between p-3 hover:bg-accent rounded-lg cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={player.photoUrl} alt={player.name} />
                        <AvatarFallback>{player.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium group-hover:text-primary">{player.name}</p>
                        <p className="text-sm text-muted-foreground">{player.position}</p>
                      </div>
                    </div>
                    {showAllPositions && (
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                        {player.position}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          {positionPlayers.length > 0 && !showAllPositions && remainingPlayers.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowAllPositions(true)}
                className="w-full"
              >
                Show {remainingPlayers.length} More Players from Other Positions
              </Button>
            </div>
          )}

          {showAllPositions && (
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setShowAllPositions(false)}
                className="w-full"
              >
                Show Only {selectedPosition?.name} Players
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  // Update the availablePlayers memo to exclude both assigned and substitute players
  const availablePlayers = useMemo(() => {
    if (!selectedGamePlan || !user?.academyId || !selectedGamePlan.positions) return [];
    
    // Get IDs of players assigned to positions
    const assignedPlayerIds = Object.values(selectedGamePlan.positions || {})
      .filter((pos): pos is { playerId: string; top: string; left: string } => pos !== null)
      .map(pos => pos.playerId);
    
    // Get IDs of substitute players
    const substitutePlayerIds = (selectedGamePlan.substitutes || [])
      .map(sub => sub.playerId);

    // Combine both arrays to get all used player IDs
    const usedPlayerIds = [...assignedPlayerIds, ...substitutePlayerIds];

    // Filter players by academy and exclude both assigned and substitute players
    return players.filter((player) => 
      player.academyId === user.academyId && 
      !usedPlayerIds.includes(player.id.toString())
    );
  }, [players, selectedGamePlan, user?.academyId]);

  // Update groupedPlayers memo to work with filtered players
  const groupedPlayers = useMemo(() => {
    return availablePlayers.reduce(
      (groups, player) => {
        const position = player.position || "Unassigned";
        return {
          ...groups,
          [position]: [...(groups[position] || []), player],
        };
      },
      {} as Record<string, typeof players>,
    );
  }, [availablePlayers]);

  const positionGroups = Object.entries(groupedPlayers)

  const filteredPlayers = useMemo(() => {
    return players
      .filter(player => 
        player.academyId === user?.academyId && 
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [players, searchTerm, user?.academyId]);

  const handleRemovePlayer = (positionId: string) => {
    if (!selectedGamePlan) return

    setSelectedGamePlan({
      ...selectedGamePlan,
      positions: {
        ...selectedGamePlan.positions,
        [positionId]: null,
      },
    })
    setGamePlans(
      gamePlans.map((gp) => (gp.id === selectedGamePlan.id ? { ...gp, positions: selectedGamePlan.positions } : gp)),
    )
  }

  const handlePlayerSelection = (playerId: string) => {
    setSelectedPlayers((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId)
      } else if (prev.length < 11) {
        return [...prev, playerId]
      } else {
        return prev
      }
    })
  }

  const handleDeselectAll = () => {
    setSelectedPlayers([])
  }

  // Add this helper function to get the latest attribute value for a player
  const getLatestAttributeValue = (player: any, attribute: string): number => {
    if (!player) return 0;
    
    // First check current attributes
    if (player.attributes && player.attributes[attribute] !== undefined) {
      return player.attributes[attribute];
    }

    // If no current attributes, check performance history
    if (player.performanceHistory && player.performanceHistory.length > 0) {
      // Sort history by date in descending order
      const sortedHistory = [...player.performanceHistory].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Find the most recent entry with this attribute
      const latestEntry = sortedHistory.find(entry => 
        entry.attributes && entry.attributes[attribute] !== undefined
      );

      if (latestEntry) {
        return latestEntry.attributes[attribute];
      }
    }

    return 0; // Return 0 only if no history exists at all
  };

  // Update radar data to use the latest attribute values
  const radarData = {
    labels: ["Shooting", "Pace", "Positioning", "Passing", "Ball Control", "Crossing"],
    datasets: selectedPlayers.map((playerId, index) => {
      const player = players.find((p) => p.id.toString() === playerId);
      return {
        label: player?.name || `Player ${index + 1}`,
        data: [
          getLatestAttributeValue(player, 'shooting'),
          getLatestAttributeValue(player, 'pace'),
          getLatestAttributeValue(player, 'positioning'),
          getLatestAttributeValue(player, 'passing'),
          getLatestAttributeValue(player, 'ballControl'),
          getLatestAttributeValue(player, 'crossing'),
        ],
        backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length],
        borderColor: PLAYER_BORDER_COLORS[index % PLAYER_BORDER_COLORS.length],
        borderWidth: 2,
        fill: true,
      };
    }),
  };

  // Update the line data generator function
  const lineData = (attribute: string) => {
    // Get all dates from all players' histories
    const allDates = new Set<string>();
    selectedPlayers.forEach(playerId => {
      const player = players.find(p => p.id.toString() === playerId);
      player?.performanceHistory?.forEach((entry: any) => {
        allDates.add(new Date(entry.date).toISOString().split('T')[0]);
      });
    });

    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort();

    // If no dates exist, create a date range from earliest record to today
    if (sortedDates.length === 0 && selectedPlayers.length > 0) {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
        sortedDates.push(d.toISOString().split('T')[0]);
      }
    }

    return {
      labels: sortedDates.map(date => new Date(date).toLocaleDateString()),
      datasets: selectedPlayers.map((playerId, index) => {
        const player = players.find((p) => p.id.toString() === playerId);
        let lastValue = getLatestAttributeValue(player, attribute);

        const data = sortedDates.map(date => {
          const entry = player?.performanceHistory?.find((e: any) => 
            new Date(e.date).toISOString().split('T')[0] === date
          );

          if (entry?.attributes?.[attribute] !== undefined) {
            lastValue = entry.attributes[attribute];
          }

          return lastValue;
        });

        return {
          label: player?.name || `Player ${index + 1}`,
          data: data,
          fill: false,
          borderColor: PLAYER_BORDER_COLORS[index % PLAYER_BORDER_COLORS.length],
          backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length],
          tension: 0.3, // Makes the line smoother
          pointRadius: 3,
        };
      }),
    };
  };

  const radarOptions = {
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        min: 0,
        ticks: {
          stepSize: 1,
          display: false,
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        pointLabels: {
          color: "rgb(255, 255, 255)",
          font: {
            size: 12,
          },
        },
        angleLines: {
          color: "rgba(255, 255, 255, 0.1)",
        },
      },
    },
    plugins: {
      legend: {
        display: true,
      },
    },
    maintainAspectRatio: false,
  }

  const lineOptions = {
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgb(255, 255, 255)",
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgb(255, 255, 255)",
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "rgb(255, 255, 255)",
        },
      },
    },
    elements: {
      line: {
        tension: 0.3, // Makes lines smoother
      },
      point: {
        radius: 3, // Smaller points
        hoverRadius: 5,
      },
    },
    maintainAspectRatio: false,
  }

  const getColorForAttribute = (attribute: string, value: number) => {
    const values = selectedPlayers.map(playerId => players.find(p => p.id.toString() === playerId)?.attributes[attribute as keyof PlayerAttributes] || 0)
    const max = Math.max(...values)
    const min = Math.min(...values)
    if (value === max) return "text-green-500"
    if (value === min) return "text-red-500"
    return ""
  }

  const handleTabChange = (index: number) => {
    setActiveTab(index)
    setSelectedGamePlan(gamePlans[index])
    setNewGamePlanStrategy(gamePlans[index].strategy)
  }

  const handlePrevious = () => {
    if (activeTab > 0) {
      handleTabChange(activeTab - 1)
    }
  }

  const handleNext = () => {
    if (activeTab < gamePlans.length - 1) {
      handleTabChange(activeTab + 1)
    }
  }

  const getPositionColor = (positionName: string): string => {
    if (positionName.includes("Goalkeeper")) return "text-amber-400"; // Gold color for GK
    if (positionName.includes("Back")) return "text-lime-400"; // Deep red for defenders
    if (positionName.includes("Midfielder")) return "text-yellow-600"; // Deep purple for midfielders
    if (positionName.includes("Striker")) return "text-orange-300"; // Deep orange for strikers
    return "text-white";
  };

  const renderPositionContent = (position: any, selectedGamePlan: GamePlan) => {
    if (!selectedGamePlan || !selectedGamePlan.positions) return null;

    const playerId = selectedGamePlan.positions[position.id]?.playerId;
    const player = players.find((p) => p.id.toString() === playerId);
    const positionColor = getPositionColor(position.name);
    
    if (player) {
      return (
        <div className="text-white text-center w-full h-full relative flex flex-col items-center justify-center gap-1">
          <Avatar className={`w-[full] h-[full] border-2 ${positionColor.replace('text-', 'border-')}`}>
            <AvatarImage 
              src={player.photoUrl} 
              alt={player.name}
              className="object-cover w-full h-full"
            />
            <AvatarFallback className="text-lg bg-gray-900 w-full h-full flex items-center justify-center">
              {player.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className={`text-xs font-medium truncate max-w-[80px] absolute -bottom-6 ${positionColor}`}>
            {player.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              handleRemovePlayer(position.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className={`text-sm font-medium ${positionColor}`}>
        {position.shortName}
      </div>
    );
  };

  // Add this helper function to count positions and goalkeepers
  const countPositions = (currentPositions: Position[]) => {
    const totalCount = currentPositions.length;
    const goalkeeperCount = currentPositions.filter(pos => 
      pos.type === 'gk' || pos.shortName === 'GK'
    ).length;
    return { totalCount, goalkeeperCount };
  };

  // Modify handleAddCustomPosition to include position validation
  const handleAddCustomPosition = () => {
    if (!selectedGamePlan) return;

    // Get current positions
    const currentPositions = [
      ...positions.filter(p => !deletedPositions.includes(p.id)), 
      ...customPositions
    ];

    const { totalCount, goalkeeperCount } = countPositions(currentPositions);

    // Check total positions
    if (totalCount >= 11) {
      toast({
        title: "Maximum players reached",
        description: "Delete an existing position before adding a new one",
        variant: "destructive",
      });
      return;
    }

    // Check goalkeeper position
    if (selectedPositionType === 'gk' && goalkeeperCount > 0) {
      toast({
        title: "Goalkeeper already exists",
        description: "Only one goalkeeper is allowed in the formation",
        variant: "destructive",
      });
      return;
    }

    const type = POSITION_TYPES.find(t => t.id === selectedPositionType) || POSITION_TYPES[4];
    const newPosition: Position = {
      id: `custom${Date.now()}`,
      name: `Custom ${type.name}`,
      shortName: type.shortName,
      type: type.id
    };

    // Add the new position to customPositions state
    setCustomPositions(prev => [...prev, newPosition]);

    // Also add it to the selected game plan's positions
    if (selectedGamePlan) {
      const defaultCoordinates = getDefaultPositionStyle(type.id);
      setSelectedGamePlan({
        ...selectedGamePlan,
        positions: {
          [newPosition.id]: {
            playerId: "",
            top: defaultCoordinates.top,
            left: defaultCoordinates.left,
          }
        }
      });

      // Update gamePlans state
      setGamePlans(prev =>
        prev.map(gp =>
          gp.id === selectedGamePlan.id
            ? {
                ...gp,
                positions: {
                  [newPosition.id]: {
                    playerId: "",
                    top: defaultCoordinates.top,
                    left: defaultCoordinates.left,
                  }
                }
              }
            : gp
        )
      );
    }

    // Show success toast
    toast({
      title: "Position Added",
      description: `Added new ${type.name} position`,
    });
  };

  const handleRemoveCustomPosition = (positionId: string) => {
    setCustomPositions(customPositions.filter(pos => pos.id !== positionId));
    
    if (selectedGamePlan) {
      const updatedPositions = { ...selectedGamePlan.positions };
      delete updatedPositions[positionId];
      
      setSelectedGamePlan({
        ...selectedGamePlan,
        positions: updatedPositions
      });
    }
  };

  const handleRemovePosition = (positionId: string) => {
    if (!selectedGamePlan) return;

    // Add to deleted positions if it's a default position
    if (!positionId.startsWith('custom')) {
      setDeletedPositions(prev => [...prev, positionId]);
    }

    // Remove position from both custom positions and game plan
    setCustomPositions(prev => prev.filter(pos => pos.id !== positionId));
    
    const updatedPositions = { ...selectedGamePlan.positions };
    delete updatedPositions[positionId];
    
    setSelectedGamePlan({
      ...selectedGamePlan,
      positions: updatedPositions
    });

    setGamePlans(prev =>
      prev.map(gp =>
        gp.id === selectedGamePlan.id
          ? { ...gp, positions: updatedPositions }
          : gp
      )
    );

    // Show remaining slots after removal
    const currentPositions = [
      ...positions.filter(p => !deletedPositions.includes(p.id)),
      ...customPositions
    ].filter(p => p.id !== positionId);

    const { totalCount } = countPositions(currentPositions);
    
    toast({
      title: "Position removed",
      description: `${11 - totalCount} position slots available`,
    });
  };

  const handleResetFormation = () => {
    if (!selectedGamePlan) return;

    setDeletedPositions([]); // Clear deleted positions
    setCustomPositions([]); // Clear custom positions
    
    // Reset to empty positions object
    setSelectedGamePlan({
      ...selectedGamePlan,
      positions: positions.reduce((acc, pos) => ({ ...acc, [pos.id]: null }), {})
    });
  };

  const handleAddSubstitute = (playerId: string, position: string) => {
    if (!selectedGamePlan) return;

    const isAlreadyAssigned = Object.values(selectedGamePlan.positions).some(
      (pos) => pos && pos.playerId === playerId
    ) || (selectedGamePlan.substitutes || []).some(sub => sub.playerId === playerId);

    if (isAlreadyAssigned) {
      toast({
        title: "Player already assigned",
        description: "This player is already in the team or substitutes",
        variant: "destructive",
      });
      return;
    }

    // Initialize substitutes array if it doesn't exist
    const currentSubstitutes = selectedGamePlan.substitutes || [];

    setSelectedGamePlan({
      ...selectedGamePlan,
      substitutes: [...currentSubstitutes, { playerId, position }]
    });

    setGamePlans(
      gamePlans.map((gp) => 
        gp.id === selectedGamePlan.id ? {
          ...gp,
          substitutes: [...(gp.substitutes || []), { playerId, position }]
        } : gp
      )
    );
  };

  const handleRemoveSubstitute = (playerId: string) => {
    if (!selectedGamePlan) return;

    const currentSubstitutes = selectedGamePlan.substitutes || [];

    setSelectedGamePlan({
      ...selectedGamePlan,
      substitutes: currentSubstitutes.filter(sub => sub.playerId !== playerId)
    });

    setGamePlans(
      gamePlans.map((gp) =>
        gp.id === selectedGamePlan.id ? {
          ...gp,
          substitutes: (gp.substitutes || []).filter(sub => sub.playerId !== playerId)
        } : gp
      )
    );
  };

  const SubstituteModal = () => (
    <Dialog open={showSubstitutesModal} onOpenChange={setShowSubstitutesModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Substitute Player</DialogTitle>
        </DialogHeader>
        <div className="h-[400px] overflow-y-auto">
          {positionGroups.map(([position, players]) => (
            <div key={position} className="mb-4">
              <h3 className="text-sm font-semibold mb-2">{position}</h3>
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-2 hover:bg-accent rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={player.photoUrl} alt={player.name} />
                      <AvatarFallback>{player.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span>{player.name}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      handleAddSubstitute(player.id.toString(), position);
                      setShowSubstitutesModal(false);
                    }}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Update selected batch section to filter batches
  const filteredBatches = useMemo(() => {
    if (!user?.academyId || !user?.id) return [];
    
    return batches.filter(batch => {
      const isUserBatch = batch.coachId === user.id || 
                         (batch.coachIds && batch.coachIds.includes(user.id));
      const isSameAcademy = batch.academyId === user.academyId;
      
      return isUserBatch && isSameAcademy;
    });
  }, [batches, user?.academyId, user?.id]);

  const ExportDialog = () => (
    <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Options</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Button 
            className="w-full" 
            onClick={async () => {
              if (!fieldRef.current || !selectedGamePlan) return;
              
              const canvas = await html2canvas(fieldRef.current, {
                backgroundColor: null,
                scale: 2,
              });
              
              const image = canvas.toDataURL('image/png');
              const link = document.createElement('a');
              link.href = image;
              link.download = `${selectedGamePlan.name}_formation.png`;
              link.click();
              
              setShowExportDialog(false);
            }}
          >
            Export as Image (PNG)
          </Button>
          <Button 
            className="w-full" 
            onClick={() => {
              if (!fieldRef.current || !selectedGamePlan) return;
              exportToPDF(fieldRef, selectedGamePlan, players, batches);
              setShowExportDialog(false);
            }}
          >
            Export as PDF (Formation + Details)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const handleSaveCustomization = () => {
    // Save the current state
    handleSaveGamePlans();
    
    // Exit customize mode
    setShowCustomizeMenu(false);
    
    toast({
      title: "Formation Saved",
      description: "Your customized formation has been saved",
    });
  };

  // Add a component to show position count in customize menu
  const PositionCounter = () => {
    const currentPositions = [
      ...positions.filter(p => !deletedPositions.includes(p.id)),
      ...customPositions
    ];
    const { totalCount, goalkeeperCount } = countPositions(currentPositions);

    return (
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Players: {totalCount}/11</span>
        <span>Goalkeeper: {goalkeeperCount}/1</span>
      </div>
    );
  };

  // Add this useEffect to fetch players when component mounts
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        if (!user) {
          console.error("Error: User is not initialized.");
          return;
        }

        if (!user.academyId) {
          console.error("Error: Academy ID is missing.");
          return;
        }

        setIsLoading(true);

        const response = await fetch(`/api/db/ams-player-data?academyId=${user.academyId}`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch players: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || "Unknown error occurred while fetching players.");
        }

        setPlayers(result.data);
      } catch (error) {
        console.error("Error fetching players:", error);
        toast({
          title: "Error",
          description: "Failed to load players. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.academyId) {
      fetchPlayers();
    }
  }, [user?.academyId]);

  // Update the renderPlayersByPosition function
  const renderPlayersByPosition = (position: string) => {
    const players = positionPlayers[position] || [];
    
    return (
      <div className="space-y-2">
        <h3 className="font-semibold">{position}</h3>
        {players.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {players.map((player) => (
              <div 
                key={player._id}
                className="flex items-center p-2 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
                onClick={() => handlePlayerSelect(player)}
              >
                <div className="w-8 h-8 rounded-full bg-gray-600 mr-2">
                  {player.photoUrl ? (
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      {player.name[0]}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">{player.name}</div>
                  <div className="text-xs text-gray-400">{player.position}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400">No players available</div>
        )}
      </div>
    );
  };

  // Update substitute players section
  const renderSubstitutes = () => {
    return (
      <div className="mt-4">
        <h3 className="font-semibold mb-2">Substitute Players</h3>
        {substitutePlayers.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {substitutePlayers.map((player) => (
              <div 
                key={player._id}
                className="flex items-center p-2 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
                onClick={() => handlePlayerSelect(player)}
              >
                <div className="w-8 h-8 rounded-full bg-gray-600 mr-2">
                  {player.photoUrl ? (
                    <img
                      src={player.photoUrl}
                      alt={player.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      {player.name[0]}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">{player.name}</div>
                  <div className="text-xs text-gray-400">Substitute</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400">No substitute players available</div>
        )}
      </div>
    );
  };

  const handleSaveStrategy = async () => {
    try {
      if (!user?.academyId || !selectedGamePlan) {
        toast({
          title: "Error",
          description: "No academy ID or selected game plan found",
          variant: "destructive",
        });
        return;
      }

      // Save the strategy for the selected game plan to MongoDB
      const response = await fetch(`/api/db/ams-gameplan/${selectedGamePlan._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: selectedGamePlan.strategy,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save strategy');
      }

      toast({
        title: "Success",
        description: "Strategy saved successfully",
      });
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast({
        title: "Error",
        description: "Failed to save strategy",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      {/* Update the main content container */}
      <div className="flex-1 min-w-0 overflow-x-auto">
        <div className="p-6 space-y-6">
          <CustomTooltip content="Create and manage team formations">
            <h1 className="text-3xl font-bold text-white">Team Builder</h1>
          </CustomTooltip>

          {/* Wrap buttons in a scrollable container */}
          <div className="overflow-x-auto">
            <div className="flex space-x-4 min-w-max pb-2">
              <Button onClick={() => setIsCreateDialogOpen(true)} disabled={gamePlans.length >= 3}>
                Create Game Plan
              </Button>
              <Button onClick={handleSaveGamePlans}>Save Game Plans</Button>
              <Button onClick={handleExportField}>Export Formation</Button>
            </div>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Game Plan</DialogTitle>
                <span>Fill in the details below to create a new game plan.</span>
              </DialogHeader>
              <Input
                placeholder="Game Plan Name"
                value={newGamePlanName}
                onChange={(e) => setNewGamePlanName(e.target.value)}
              />
              <Input
                placeholder="Size"
                value={newGamePlanSize}
                onChange={(e) => setNewGamePlanSize(e.target.value)}
              />
              <Textarea
                placeholder="Notes/Strategies"
                value={newGamePlanStrategy}
                onChange={(e) => setNewGamePlanStrategy(e.target.value)}
              />
              <DialogFooter>
                <Button
                  onClick={handleCreateGamePlan}
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {gamePlans.length > 0 && (
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={handlePrevious} disabled={activeTab === 0}>
                <ChevronLeft />
              </Button>
              <span>{gamePlans[activeTab].name}</span>
              <Button variant="outline" onClick={handleNext} disabled={activeTab === gamePlans.length - 1}>
                <ChevronRight />
              </Button>
              <Button variant="destructive" onClick={() => handleDeleteGamePlan(gamePlans[activeTab].id)}>
                Delete Game Plan
              </Button>
            </div>
          )}

          {/* Update the grid layout to be more responsive */}
          {selectedGamePlan && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_3fr] gap-4">
              {/* Players list card */}
              <Card className="order-2 lg:order-1 min-w-0">
                <CardHeader>
                  <CardTitle>Players by Position</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <div className="space-y-4">
                    {positionGroups.map(([position, positionPlayers]) => (
                      <div key={position}>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">{position}</h3>
                        <div className="space-y-2">
                          {positionPlayers.map((player) => (
                            <div
                              key={player.id}
                              className="bg-secondary p-2 rounded-md text-xs cursor-move flex items-center gap-2"
                              draggable
                              onDragStart={(e) => handlePlayerDragStart(e, player.id.toString())}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage 
                                  src={player.photoUrl} 
                                  alt={player.name}
                                />
                                <AvatarFallback className="text-xs">
                                  {player.name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium">{player.name}</span>
                                <span className="text-muted-foreground text-xs">{player.position}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Separator className="my-4" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Formation card */}
              <Card className="order-1 lg:order-2 min-w-0">
                <CardHeader className="flex flex-row justify-between items-center">
                  <CardTitle>{selectedGamePlan?.name} - Formation</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowCustomizeMenu(!showCustomizeMenu)}
                    >
                      Customize Formation
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <ScrollArea className="w-full max-h-[800px] overflow-y-auto">
                    <div
                      ref={fieldRef}
                      className="relative w-full max-w-[500px] aspect-[0.68] bg-green-700 rounded-md mb-4 mx-auto"
                      style={{ minWidth: "300px" }}
                      onDragOver={handleDragOver}
                      onDrop={handlePositionDropOnMap}
                    >
                      {/* Simplified Field markings */}
                      <div className="absolute inset-0">
                        <div className="absolute inset-2 border-2 border-white/50" />
                        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/50" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[15%] rounded-full border-2 border-white/50" />
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[15%] border-2 border-b-0 border-white/50" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[15%] border-2 border-t-0 border-white/50" />
                      </div>

                      {/* Player positions */}
                      {[...positions.filter(p => !deletedPositions.includes(p.id)), ...customPositions].map((position) => (
                        <div
                          key={position.id}
                          className="absolute w-16 h-16 bg-white/30 hover:bg-white/40 transition-colors rounded-full flex items-center justify-center border-2 border-white/50 cursor-move group"
                          style={getPositionStyle(position.id, selectedGamePlan)}
                          draggable={showCustomizeMenu} // Only draggable when customize menu is open
                          onDragStart={(e) => handlePositionDragStart(e, position.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handlePositionDrop(e, position.id)}
                          onClick={() => handlePositionClick(position)}
                        >
                          {renderPositionContent(position, selectedGamePlan)}
                          {/* Only show delete button when customize menu is open */}
                          {showCustomizeMenu && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-4 w-4 rounded-full opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePosition(position.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Add customization menu */}
                  {showCustomizeMenu && (
                    <div className="mt-4 w-full border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Formation Customization</h3>
                        <PositionCounter />
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowCustomizeMenu(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleSaveCustomization}
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Add New Position</h4>
                          <div className="flex gap-2">
                            <select
                              value={selectedPositionType}
                              onChange={(e) => setSelectedPositionType(e.target.value)}
                              className="bg-background border rounded px-2 py-1"
                            >
                              {POSITION_TYPES.map((type) => (
                                <option key={type.id} value={type.id}>
                                  {type.name}
                                </option>
                              ))}
                            </select>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleAddCustomPosition}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                        
                        <Button 
                          variant="destructive" 
                          onClick={handleResetFormation}
                          className="mt-2"
                        >
                          Reset Formation
                        </Button>
                        <div className="text-sm text-muted-foreground">
                          Drag positions to move them on the field.
                          All positions can be deleted by hovering and clicking the X.
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Make other sections scrollable */}
          <div className="space-y-4 overflow-x-auto">
            <div className="space-y-4">
              <label htmlFor="batch" className="text-white">Select Batch</label>
              <select
                id="batch"
                value={selectedBatch || ""}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full p-2 border rounded-md bg-gray-800 text-white"
              >
                <option value="" disabled>
                  Select a batch
                </option>
                {filteredBatches.map((batch) => ( // Use filteredBatches instead of batches
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedBatch && <ComparePlayers batchId={selectedBatch} />}
            <div className="space-y-4">
              <Button onClick={() => setIsDialogOpen(true)}>Compare Players</Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-h-[80vh] max-w-[80vw] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Compare Players</DialogTitle>
                  </DialogHeader>
                  <CardContent>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">Select Players</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64">
                        <Input
                          placeholder="Search players"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="mb-2"
                        />
                        {/* Use filteredPlayers here which now includes academyId filter */}
                        {filteredPlayers.map((player) => (
                          <DropdownMenuItem 
                            key={player.id} 
                            onSelect={() => handlePlayerSelection(player.id.toString())}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPlayers.includes(player.id.toString())}
                              onChange={() => handlePlayerSelection(player.id.toString())}
                              className="mr-2"
                            />
                            <span>{player.name}</span>
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem onSelect={handleDeselectAll}>
                          <Button variant="outline" className="w-full">
                            Deselect All
                          </Button>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="mt-6">
                      <div className="w-full h-[500px]">
                        <Radar data={radarData} options={radarOptions} />
                      </div>
                    </div>
                    <div className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Attribute Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Attribute</TableHead>
                                {selectedPlayers.map((playerId) => (
                                  <TableHead key={playerId}>{players.find((p) => p.id.toString() === playerId)?.name}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {["shooting", "pace", "positioning", "passing", "ballControl", "crossing"].map((attr) => (
                                <TableRow key={attr}>
                                  <TableCell>{attr.charAt(0).toUpperCase() + attr.slice(1)}</TableCell>
                                  {selectedPlayers.map((playerId) => {
                                    const player = players.find((p) => p.id.toString() === playerId)
                                    const value = player?.attributes[attr as keyof PlayerAttributes] || 0
                                    return (
                                      <TableCell key={playerId} className={getColorForAttribute(attr, value)}>
                                        {value}
                                      </TableCell>
                                    )
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Performance Graph</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex space-x-4 mb-4">
                            {["shooting", "pace", "positioning", "passing", "ballControl", "crossing"].map((attr) => (
                              <Button
                                key={attr}
                                variant={selectedAttribute === attr ? "default" : "outline"}
                                onClick={() => setSelectedAttribute(attr)}
                              >
                                {attr.charAt(0).toUpperCase() + attr.slice(1)}
                              </Button>
                            ))}
                          </div>
                          <div className="h-[400px]">
                            <Line data={lineData(selectedAttribute)} options={lineOptions} />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-4">
              <Textarea
                placeholder="Game Strategy"
                value={newGamePlanStrategy}
                onChange={(e) => setNewGamePlanStrategy(e.target.value)}
                className="max-w-[1000px]"
              />
              <Button onClick={handleSaveStrategy}>Save Strategy</Button>
            </div>
          </div>

          {/* Update team table container */}
          {selectedGamePlan && (
            <div className="space-y-4 overflow-x-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="min-w-[600px]">
                    {/* Starting lineup table */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-4">Starting Lineup</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Position</TableHead>
                            <TableHead>Player</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Combine default and custom positions */}
                          {[
                            ...positions.filter(p => !deletedPositions.includes(p.id)),
                            ...customPositions
                          ].map((position) => {
                            if (!selectedGamePlan || !selectedGamePlan.positions) return null;

                            const positionData = selectedGamePlan.positions[position.id];
                            const player = players.find((p) => p.id.toString() === positionData?.playerId);
                            return (
                              <TableRow key={position.id}>
                                <TableCell>{position.name}</TableCell>
                                <TableCell>
                                  {player ? (
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage 
                                          src={player.photoUrl} 
                                          alt={player.name}
                                        />
                                        <AvatarFallback className="text-xs">
                                          {player.name?.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{player.name}</span>
                                        <span className="text-sm text-muted-foreground">{player.position}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">Unassigned</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Substitutes section */}
                    <div className="mt-8">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Substitutes</h3>
                        <Button variant="outline" onClick={() => setShowSubstitutesModal(true)}>
                          Add Substitute
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Position</TableHead>
                            <TableHead>Player</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedGamePlan?.substitutes || []).map((sub) => {
                            const player = players.find((p) => p.id.toString() === sub.playerId);
                            return (
                              <TableRow key={sub.playerId}>
                                <TableCell>{sub.position}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={player?.photoUrl} alt={player?.name} />
                                      <AvatarFallback>{player?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{player?.name}</span>
                                      <span className="text-sm text-muted-foreground">
                                        {player?.position}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRemoveSubstitute(sub.playerId)}
                                  >
                                    Remove
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      <SubstituteModal />
      <ExportDialog />
      <PlayerSelectionModal /> {/* Add this line to render the PlayerSelectionModal */}
    </div>
  )
}

function getPositionStyle(positionId: string, selectedGamePlan: GamePlan | null): React.CSSProperties {
  if (!selectedGamePlan || !selectedGamePlan.positions) {
    const defaultCoordinates = getDefaultPositionStyle(positionId);
    return {
      top: defaultCoordinates.top,
      left: defaultCoordinates.left,
      transform: "translate(-50%, -50%)",
    };
  }

  const position = selectedGamePlan.positions[positionId];
  const defaultCoordinates = getDefaultPositionStyle(positionId);
  return {
    top: position?.top || defaultCoordinates.top,
    left: position?.left || defaultCoordinates.left,
    transform: "translate(-50%, -50%)",
  };
}

const getDefaultPositionStyle = (positionId: string): { top: string; left: string } => {
  const defaultPositions: { [key: string]: { top: string; left: string } } = {
    // Existing positions
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
    
    // New position default coordinates
    cam: { top: "30%", left: "50%" },  // Attacking mid in center
    lw: { top: "25%", left: "20%" },   // Left winger forward
    rw: { top: "25%", left: "80%" },   // Right winger forward
    
    // Default for custom positions remains the same
    default: { top: "50%", left: "50%" }
  };
  
  return defaultPositions[positionId] || defaultPositions.default;
};

