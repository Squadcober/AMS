"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { usePlayers } from "@/contexts/PlayerContext"
import { useBatches } from "@/contexts/BatchContext"
import { useAuth } from "@/contexts/AuthContext"
import { useCoaches } from "@/contexts/CoachContext"
import SliderComponent from "@/components/Slider"
import { BackendSetup } from '@/lib/backend-setup'
import { TimePicker } from "@/components/ui/timepicker"
import { Switch } from "@/components/ui/switch"
import Sidebar from "@/components/Sidebar" // Import the Sidebar component
import { format } from "date-fns" // Import format from date-fns
import { Calendar } from "@/components/ui/calendar"

import { toast, useToast } from "@/components/ui/use-toast"; // Import useToast hook
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs" // Add this import
import type { User } from "@/types/user" // Add User interface import
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from 'next/navigation'; // Add this import
import { Slider } from "@/components/ui/slider" // Add this import
import { getAll, create, update, remove, getByFilter } from '@/lib/db'
import { StorageUtils } from '@/lib/utils/storage';
import { CoachProvider } from "@/contexts/CoachContext" // Add this import

export interface Session {
  id: number
  name: string
  status: "Finished" | "On-going" | "Upcoming"
  date: string
  startTime: string
  endTime: string
  assignedBatch?: string
  assignedPlayers: string[] // Change this to just array of IDs
  coachId: string | string[]
  playerRatings?: { [playerId: string]: number }
  userId: string
  recurrenceDays?: string[]
  numberOfSessions?: number
  isRecurring?: boolean;
  recurringEndDate?: string;
  selectedDays?: string[];
  totalOccurrences?: number;
  coachNames?: string[];
  assignedPlayersData: { id: string, name: string, position: string }[] // Add this new property
  playerMetrics?: {
    [playerId: string]: {
      shooting: number;
      pace: number;
      positioning: number;
      passing: number;
      ballControl: number;
      crossing: number;
      sessionRating: number;
    }
  };
  attendance: {
    [playerId: string]: {
      status: "Present" | "Absent"
      markedAt: string
      markedBy: string
    }
  }
  parentSessionId?: number;  // ID of the parent recurring session
  occurrenceDate?: string;   // Specific date for this occurrence
  isOccurrence?: boolean;    // Flag to identify if this is a recurring occurrence
  academyId: string; // Add this property
}

// Add this interface near the top of the file, after the Session interface
export interface Batch {
  id: string
  name: string
  coachId: string
  coachName: string
  players: string[]
  coachIds?: string[]
  coachNames?: string[]
  academyId: string
}

// Update the exportToFile function with better CSV formatting
const exportToFile = (data: Session[], academyId: string, batchesData: Batch[]) => {
  // Filter sessions for current academy
  const academySessions = data.filter(session => session.academyId === academyId);
  
  // Define headers in specific order
  const headers = [
    'Session ID',
    'Session Name',
    'Is Recurring',
    'Date/Date Range',
    'Time',
    'Days',
    'Assigned Batch',
    'Assigned Players',
    'Assigned Coaches',
    'Academy ID'
  ];

  // Helper function to escape CSV values
  const escapeCsvValue = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Format each session according to headers
  const rows = academySessions.map(session => {
    const batchName = batchesData.find(b => b.id === session.assignedBatch)?.name || 'None';
    const values = {
      'Session ID': session.id.toString(),
      'Session Name': session.name,
      'Is Recurring': session.isRecurring ? 'Yes' : 'No',
      'Date/Date Range': session.isRecurring 
        ? `${session.date} to ${session.recurringEndDate}`
        : session.date,
      'Time': `${session.startTime} - ${session.endTime}`,
      'Days': session.isRecurring 
        ? escapeCsvValue(session.selectedDays?.join(', ') || '')
        : format(new Date(session.date), 'EEEE'),
      'Assigned Batch': batchName,
      'Assigned Players': escapeCsvValue(session.assignedPlayersData.map(p => p.name).join(', ')),
      'Assigned Coaches': escapeCsvValue(Array.isArray(session.coachNames) 
        ? session.coachNames.join(', ')
        : session.coachNames || 'None'),
      'Academy ID': session.academyId
    };
    
    // Return values in same order as headers
    return headers.map(header => values[header as keyof typeof values]).join(',');
  });

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows].join('\n');
  
  // Create and trigger download
  const date = new Date().toISOString().split('T')[0];
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sessions_export_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return academySessions.length;
};

const deleteOldSessions = (sessions: Session[], keepCount: number = 50) => {
  return sessions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, keepCount);
};

const MAX_SESSIONS = 50;

const exportAndClearSessions = async (type: 'archive' | 'backup') => {
  try {
    if (!user?.academyId) {
      toast({
        title: "Error",
        description: "No academy ID found",
        variant: "destructive",
      });
      return;
    }

    // First export the sessions
    const response = await fetch(`/api/db/ams-sessions?academyId=${user.academyId}`);
    if (!response.ok) throw new Error('Failed to fetch sessions');
    const sessions = await response.json();

    // Generate CSV and trigger download
    const date = new Date().toISOString().split('T')[0];
    const fileName = `sessions_${type}_${date}`;
    exportToFile(sessions, user.academyId, batches);

    // If it's an archive operation, clear the sessions from the database
    if (type === 'archive') {
      const clearResponse = await fetch('/api/db/ams-sessions/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear',
          academyId: user.academyId
        })
      });

      if (!clearResponse.ok) throw new Error('Failed to clear sessions');

      // Clear local state
      setSessions([]);
      setUnsavedSessions([]);
    }

    toast({
      title: "Success",
      description: `Sessions ${type === 'archive' ? 'archived' : 'backed up'} successfully`,
    });
  } catch (error) {
    console.error(`Error during ${type}:`, error);
    toast({
      title: "Error",
      description: `Failed to ${type} sessions`,
      variant: "destructive",
    });
  }
};

// Add this helper function after other helper functions
const getNextSessionDate = (session: Session, startDate: string, endDate: string) => {
  const today = new Date();
  const currentDate = new Date(startDate);
  const selectedDays = session.selectedDays || [];
  let pastOccurrences = 0; // Initialize pastOccurrences
  let futureOccurrences = 0; // Initialize futureOccurrences

  while (currentDate <= new Date(endDate)) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (selectedDays.includes(dayName)) {
      if (currentDate > today) {
        // Return the correct next date (do not increment further)
        return currentDate.toISOString().split('T')[0];
      }
      if (currentDate < today) {
        pastOccurrences++;
      } else if (currentDate > today) {
        futureOccurrences++;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (futureOccurrences > 0) {
    return currentDate.toISOString().split('T')[0];
  }

  return null;
};

// Update the generateRecurringOccurrences function
const generateRecurringOccurrences = (session: Session): Session[] => {
  console.log('Starting generateRecurringOccurrences with session:', {
    name: session.name,
    date: session.date,
    recurringEndDate: session.recurringEndDate,
    selectedDays: session.selectedDays
  });

  if (!session.isRecurring || !session.selectedDays) return [session];

  const startDate = new Date(session.date);
  const endDate = new Date(session.recurringEndDate || "");
  const selectedDays = session.selectedDays;
  const occurrences: Session[] = [];
  
  // Get current date at the start of the day (midnight)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  console.log('Time references:', {
    now: now.toISOString(),
    today: today.toISOString(),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });

  // Create a copy of start date to iterate through
  const currentDate = new Date(startDate);
  
  // Ensure we're working with the correct day starting at midnight
  currentDate.setHours(0, 0, 0, 0);
  
  let occurrenceCounter = 0;
  while (currentDate <= endDate) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    if (selectedDays.includes(dayName)) {
      // Create occurrence date string in YYYY-MM-DD format
      const occurrenceDate = currentDate.toISOString().split('T')[0];
      
      // Create session start and end times for this occurrence
      const sessionDateTime = new Date(occurrenceDate);
      const [startHour, startMinute] = session.startTime.split(':').map(Number);
      const [endHour, endMinute] = session.endTime.split(':').map(Number);
      
      const sessionStart = new Date(sessionDateTime);
      sessionStart.setHours(startHour, startMinute, 0);
      
      const sessionEnd = new Date(sessionDateTime);
      sessionEnd.setHours(endHour, endMinute, 0);

      // Determine status based on the current time
      let status: Session['status'];
      if (currentDate < today) {
        status = 'Finished';
      } else if (currentDate.getTime() === today.getTime()) {
        if (now >= sessionEnd) {
          status = 'Finished';
        } else if (now >= sessionStart && now <= sessionEnd) {
          status = 'On-going';
        } else {
          status = 'Upcoming';
        }
      } else {
        status = 'Upcoming';
      }

      // Create occurrence with truly unique ID
      const occurrenceId = `${session.id}-${Date.now()}-${occurrenceCounter++}`;
      occurrences.push({
        ...session,
        id: occurrenceId,
        parentSessionId: session.id,
        date: occurrenceDate,
        isOccurrence: true,
        status,
        attendance: {},
        playerMetrics: {},
        playerRatings: {}
      });
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return occurrences;
};

// Add this function to clean up duplicates when saving sessions
const cleanupDuplicateSessions = (sessions: Session[]): Session[] => {
  console.log('Starting cleanup with sessions:', {
    total: sessions.length,
    recurring: sessions.filter(s => s.isRecurring).length,
    occurrences: sessions.filter(s => s.isOccurrence).length
  });

  // First, separate sessions into different categories
  const regularSessions = new Map<string, Session>();
  const parentSessions = new Map<number, Session>();
  const occurrences = new Map<string, Session>();

  sessions.forEach(session => {
    if (session.isOccurrence && session.parentSessionId) {
      // Handle occurrences
      const key = `${session.parentSessionId}-${session.date}`;
      if (occurrences.has(key)) {
        const existing = occurrences.get(key)!;
        // Keep the most "final" status
        if (session.status === 'Finished' || (session.status === 'On-going' && existing.status === 'Upcoming')) {
          occurrences.set(key, session);
        }
      } else {
        occurrences.set(key, session);
      }
    } else if (session.isRecurring && !session.isOccurrence) {
      // Handle parent recurring sessions
      parentSessions.set(session.id, session);
    } else {
      // Handle regular sessions
      const key = `${session.id}-${session.date}`;
      regularSessions.set(key, session);
    }
  });

  // Combine all sessions
  const cleanedSessions = [
    ...Array.from(regularSessions.values()),
    ...Array.from(parentSessions.values()),
    ...Array.from(occurrences.values())
  ];

  console.log('Cleanup result:', {
    originalCount: sessions.length,
    cleanedCount: cleanedSessions.length,
    byStatus: {
      Finished: cleanedSessions.filter(s => s.status === 'Finished').length,
      'On-going': cleanedSessions.filter(s => s.status === 'On-going').length,
      Upcoming: cleanedSessions.filter(s => s.status === 'Upcoming').length
    }
  });

  return cleanedSessions;
};

const validateRecurringDates = (startDate: string, endDate: string, selectedDays: string[]) => {
  if (!startDate || !endDate || !selectedDays.length) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check if the dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  
  // Check if end date is after start date
  if (end < start) return false;

  // Check if at least one selected day occurs between start and end dates
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (selectedDays.includes(dayName)) {
      return true; // Found at least one valid occurrence
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return false; // No valid occurrences found
};

const updateSessionStatus = (sessions: Session[]): Session[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return sessions.map(session => {
    if (session.isOccurrence) {
      const occurrenceDateTime = new Date(session.occurrenceDate || session.date);
      const [startHour, startMinute] = session.startTime.split(':').map(Number);
      const [endHour, endMinute] = session.endTime.split(':').map(Number);

      const sessionStart = new Date(occurrenceDateTime);
      sessionStart.setHours(startHour, startMinute, 0);

      const sessionEnd = new Date(occurrenceDateTime);
      sessionEnd.setHours(endHour, endMinute, 0);

      let status: Session['status'];
      if (occurrenceDateTime < today) {
        status = 'Finished';
      } else if (occurrenceDateTime.getTime() === today.getTime()) {
        if (now >= sessionEnd) {
          status = 'Finished';
        } else if (now >= sessionStart && now <= sessionEnd) {
          status = 'On-going';
        } else {
          status = 'Upcoming';
        }
      } else {
        status = 'Upcoming';
      }

      return { ...session, status };
    }
    return session;
  });
};

// Update getDateLimits to use 60 days for both past and future
const getDateLimits = () => {
  const today = new Date();
  
  // Set past limit to 60 days ago (changed from 14)
  const past60Days = new Date(today);
  past60Days.setDate(today.getDate() - 60);
  
  const future60Days = new Date(today);
  future60Days.setDate(today.getDate() + 60);
  
  return {
    minDate: past60Days.toISOString().split('T')[0],
    maxDate: future60Days.toISOString().split('T')[0],
    today: today.toISOString().split('T')[0]
  };
};

// Add this helper to filter and organize sessions
const organizeRecurringSessions = (sessions: Session[]) => {
  // Group sessions by parent ID
  const groupedSessions = sessions.reduce((acc, session) => {
    if (session.isOccurrence && session.parentSessionId) {
      // Add to occurrences group
      if (!acc.occurrences[session.parentSessionId]) {
        acc.occurrences[session.parentSessionId] = [];
      }
      acc.occurrences[session.parentSessionId].push(session);
    } else if (session.isRecurring && !session.isOccurrence) {
      // Add to parents group
      acc.parents[session.id] = session;
    } else {
      // Add to regular sessions
      acc.regular.push(session);
    }
    return acc;
  }, { parents: {}, occurrences: {}, regular: [] } as any);

  // Create virtual parent sessions if missing
  Object.keys(groupedSessions.occurrences).forEach(parentId => {
    if (!groupedSessions.parents[parentId]) {
      const occurrences = groupedSessions.occurrences[parentId];
      if (occurrences.length > 0) {
        // Create parent from first occurrence
        const firstOccurrence = occurrences[0];
        groupedSessions.parents[parentId] = {
          ...firstOccurrence,
          id: parseInt(parentId),
          isRecurring: true,
          isOccurrence: false,
          parentSessionId: undefined,
          occurrenceDate: undefined,
          totalOccurrences: occurrences.length
        };
      }
    }
  });

  // Combine all sessions
  return [
    ...Object.values(groupedSessions.parents),
    ...groupedSessions.regular
  ];
};

const DEFAULT_AVATAR = "/default-avatar.png"; // Update path to match new location

// Add this type near the top with other interfaces
interface MetricsCache {
  [key: string]: {
    data: any;
    timestamp: number;
    isDirty: boolean;
  }
}

// Add this outside the component
const metricsCache: MetricsCache = {};

const POLLING_INTERVAL = 300000; // 30 seconds

// Define LOCAL_STORAGE_KEY for session storage
const LOCAL_STORAGE_KEY = 'ams-sessions';

export default function SessionsPage() {
  return (
    <CoachProvider>
      <SessionsContent />
    </CoachProvider>
  )
}

function SessionsContent() {
  const { user } = useAuth();  // Keep this at the top
  const { toast } = useToast();
  
  // Add this new state for the toggle
  const [showMySessions, setShowMySessions] = useState(false);

  // Move isPolling state declaration to the top with other states
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [viewDetailsSessionData, setViewDetailsSessionData] = useState<Session | null>(null);
  
  // Add this ref to track component mount state
  const isMounted = useRef(true);
  const lastFetchedData = useRef<Session[]>([]);
  const lastValidData = useRef<Session[]>([]);

  // Add this state near other state declarations, before OccurrencesDialog is used
  const [isOccurrencesDialogOpen, setIsOccurrencesDialogOpen] = useState(false);

  // Add refs for storing previous and current data
  const previousSessionsRef = useRef<Session[]>([]);
  const currentSessionsRef = useRef<Session[]>([]);
  const isFirstLoad = useRef(true);

  // Replace fetchSessions with this optimized version
  const fetchSessions = useCallback(async (forceRefresh = false) => {
    if (!user?.academyId || !isMounted.current) return;

    try {
      // Keep current sessions visible
      const currentSessions = sessions;

      const response = await fetch(
        `/api/db/ams-sessions?academyId=${encodeURIComponent(user.academyId)}`,
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();

      if (!isMounted.current) return;
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error(result.error || 'Invalid session data format');
      }

      const newData = result.data;
      
      // Compare data to avoid unnecessary updates
      const currentDataString = JSON.stringify(currentSessionsRef.current);
      const newDataString = JSON.stringify(newData);
      
      if (currentDataString !== newDataString || forceRefresh) {
        // Store the previous state before updating
        previousSessionsRef.current = currentSessions;
        currentSessionsRef.current = newData;

        // Update sessions with smooth transition
        if (!isFirstLoad.current) {
          // First, update any changed sessions in place
          setSessions(prev => prev.map(session => {
            const updatedSession = newData.find(s => s.id === session.id);
            if (updatedSession) {
              return {
                ...session,
                ...updatedSession,
                isUpdating: true // Add a flag for animation
              };
            }
            return session;
          }));

          // Then after a short delay, add/remove sessions
          setTimeout(() => {
            if (isMounted.current) {
              setSessions(newData);
            }
          }, 300);
        } else {
          setSessions(newData);
          isFirstLoad.current = false;
        }

        setLastUpdate(Date.now());
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      // On error, keep current data visible
      if (previousSessionsRef.current.length > 0) {
        setSessions(previousSessionsRef.current);
      }
      if (isMounted.current) {
        toast({
          title: "Error",
          description: "Failed to refresh sessions",
          variant: "destructive",
        });
      }
    }
  }, [user?.academyId, toast, sessions]);

  // Initial load effect
  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const loadInitialSessions = async () => {
      if (!user?.academyId) {
        console.log('Waiting for academyId...');
        return;
      }
      
      try {
        const response = await fetch(
          `/api/db/ams-sessions?academyId=${encodeURIComponent(user.academyId)}`,
          { headers: { 'Cache-Control': 'no-cache' } }
        );

        if (!response.ok) throw new Error('Failed to fetch initial sessions');
        const result = await response.json();

        if (!mounted) return;

        if (result.success && Array.isArray(result.data)) {
          lastValidData.current = result.data;
          setSessions(result.data);
          setLastUpdate(Date.now());
        }
      } catch (error) {
        console.error('Initial load error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialSessions();

    return () => {
      mounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [user?.academyId]);

  // Update polling effect with better cleanup
  useEffect(() => {
    if (!user?.academyId || !isPolling) return;

    let pollInterval: NodeJS.Timeout;
    
    const poll = async () => {
      if (!isMounted.current) return;
      try {
        await fetchSessions(false);
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial poll
    poll();

    // Set up polling interval
    pollInterval = setInterval(poll, POLLING_INTERVAL);

    // Cleanup function
    return () => {
      clearInterval(pollInterval);
      isMounted.current = false;
    };
  }, [user?.academyId, isPolling, fetchSessions]);

  // Update visibility change effect to be less aggressive
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.academyId) {
        // Add delay before refresh to prevent rapid updates
        visibilityTimeout = setTimeout(() => {
          if (isMounted.current) {
            console.log('Tab visible, refreshing sessions...');
            fetchSessions(true);
          }
        }, 1000);
      }
      setIsPolling(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(visibilityTimeout);
    };
  }, [user?.academyId, fetchSessions]);

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    BackendSetup.initialize()
  }, [])

  const { players } = usePlayers()
  const { batches, setBatches } = useBatches()
  const { coaches, setCoaches } = useCoaches() // Fetch coaches from context
  const [newSession, setNewSession] = useState<Omit<Session, "id" | "status" | "playerRatings" | "attendance">>({
    name: "",
    date: new Date().toISOString().split('T')[0], // Set default date to today
    startTime: "",
    endTime: "",
    assignedBatch: "",
    assignedPlayers: [] as string[], // Change to string array
    coachId: [],
    userId: user?.id || "",
    coachNames: [],
    assignedPlayersData: [],
    academyId: user?.academyId || "", // Add academyId
  })
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none")
  const [recurrenceLimit, setRecurrenceLimit] = useState<number>(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedSessions, setSelectedSessions] = useState<number[]>([])
  const [activeLog, setActiveLog] = useState<"All" | "Finished" | "On-going" | "Upcoming">("All")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showCheckboxes, setShowCheckboxes] = useState(false)
  const [unsavedSessions, setUnsavedSessions] = useState<Session[]>([])
  const [isRecurring, setIsRecurring] = useState(false)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [dateRange, setDateRange] = useState({ from: "", to: "" })
  const [users, setUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [viewDetailsSessionId, setViewDetailsSessionId] = useState<number | null>(null)
  const [visibleSessionsCount, setVisibleSessionsCount] = useState(10)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date()) // State for selected date
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [trimDates, setTrimDates] = useState(false);
  const router = useRouter();
  const [playerMetrics, setPlayerMetrics] = useState<{
    [playerId: string]: {
      shooting: string;
      pace: string;
      positioning: string;
      passing: string;
      ballControl: string;
      crossing: string;
      sessionRating: string;
    }
  }>({});
  const [selectedPlayerForMetrics, setSelectedPlayerForMetrics] = useState<{
    id: string;
    name: string;
    sessionId: number;
  } | null>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState(""); // Add this new state
  const [batchSearchQuery, setBatchSearchQuery] = useState("");
  const [coachSearchQuery, setCoachSearchQuery] = useState("");
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [showExportAlert, setShowExportAlert] = useState(false);
  const [dateLimits] = useState(getDateLimits());
  const [detailsPlayerSearchQuery, setDetailsPlayerSearchQuery] = useState("");
  const DAYS_OF_WEEK = [
    { label: "Sun", value: "sunday" },
    { label: "Mon", value: "monday" },
    { label: "Tue", value: "tuesday" },
    { label: "Wed", value: "wednesday" },
    { label: "Thu", value: "thursday" },
    { label: "Fri", value: "friday" },
    { label: "Sat", value: "saturday" },
  ]

  // Move mapSessionPlayers outside useEffect and memoize it
  const mapSessionPlayers = useCallback((session: any) => ({
    ...session,
    assignedPlayers: session.assignedPlayers.map((playerId: string) => {
      const player = players.find(p => p.id === playerId)
      return playerId // Just return the ID since we've updated the type
    })
  }), [players]);

  // Replace the sessions loading useEffect
  useEffect(() => {
    const loadSessions = async () => {
      if (!user?.academyId) {
        console.log('Waiting for academyId...');
        return;
      }
      try {
        const response = await fetch(`/api/db/ams-sessions?academyId=${encodeURIComponent(user?.academyId || '')}`);
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        
        const result = await response.json();
        
        if (!Array.isArray(result.data)) {
          console.warn('Invalid response format:', result);
          setSessions([]);
          return;
        }

        const updatedSessions = updateSessionStatus(result.data);
        setSessions(updatedSessions);
        setLastUpdate(Date.now());
      } catch (error) {
        console.error('Error loading sessions:', error);
        setSessions([]);
      }
    };

    if (user?.academyId) {
      loadSessions();

      const pollInterval = setInterval(() => {
        if (isPolling) {
          loadSessions();
        }
      }, POLLING_INTERVAL);

      return () => {
        clearInterval(pollInterval);
        setIsPolling(false);
      };
    }
  }, [mapSessionPlayers, isPolling, user?.academyId]);

  // Update the chunked data loading effect
  useEffect(() => {
    const loadSessions = () => {
      try {
        const chunkCount = parseInt(localStorage.getItem(`${LOCAL_STORAGE_KEY}_count`) || "0");
        let allSessions: Session[] = [];
        
        for (let i = 0; i < chunkCount; i++) {
          const chunk = StorageUtils.getItem(`${LOCAL_STORAGE_KEY}_${i}`);
          if (chunk) allSessions = [...allSessions, ...chunk];
        }

        return allSessions;
      } catch (error) {
        console.error('Error loading sessions:', error);
        return [];
      }
    };

    const savedSessions = loadSessions();
    const updatedSessions = updateSessionStatus(savedSessions.map(mapSessionPlayers));
    setSessions(updatedSessions);
  }, [mapSessionPlayers]); // Add mapSessionPlayers to dependencies

  useEffect(() => {
    const mapSessionPlayers = (session: any) => ({
      ...session,
      assignedPlayers: session.assignedPlayers.map((playerId: string) => {
        const player = players.find(p => p.id === playerId)
        return playerId // Just return the ID since we've updated the type
      })
    })

    // Use StorageUtils instead of localStorage directly
    const savedSessions = StorageUtils.getItem(LOCAL_STORAGE_KEY) || [];
    const updatedSessions = updateSessionStatus(savedSessions.map(mapSessionPlayers));
    setSessions(updatedSessions);

    const interval = setInterval(async () => {
      const updatedSessions = await updateSessionStatus(savedSessions.map(mapSessionPlayers));
      setSessions(updatedSessions.map(mapSessionPlayers));
    }, 60000);
    const updateSessions = async () => {
      try {
        const updatedSessions = await updateSessionStatus(savedSessions.map(mapSessionPlayers));
        setSessions(updatedSessions.map(mapSessionPlayers));
      } catch (error) {
        console.error('Error updating sessions:', error);
      }
    };

    updateSessions(); // Initial update
    return () => clearInterval(interval);
  }, [players]);

  // Update the users loading effect
  useEffect(() => {
    // Load users from localStorage and filter by academy ID and role
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const filteredCoaches = storedUsers.filter((u: any) => 
      u.role === "coach" && u.academyId === user?.academyId
    );
    setUsers(filteredCoaches);
  }, [user?.academyId]);

  // Fix calculateTrimmedDates to properly trim to first and last valid occurrence
  const calculateTrimmedDates = (startDate: string, endDate: string, selectedDays: string[]) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let firstOccurrence: Date | null = null;
    let lastOccurrence: Date | null = null;
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (selectedDays.includes(dayName)) {
        if (!firstOccurrence) {
          firstOccurrence = new Date(currentDate);
        }
        lastOccurrence = new Date(currentDate);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  
    // Only return trimmed dates if both are found
    if (firstOccurrence && lastOccurrence) {
      return {
        start: firstOccurrence.toISOString().split('T')[0],
        end: lastOccurrence.toISOString().split('T')[0]
      };
    }
    // If no valid days found, return original dates
    return { start: startDate, end: endDate };
  };

const handleRemoveSession = () => {
  if (!showCheckboxes) {
    setShowCheckboxes(true)
  } else if (selectedSessions.length > 0) {
    setShowDeleteAlert(true)
  } else {
    setShowCheckboxes(false)
  }
}

// Update handleConfirmDelete to delete from the database using the correct DELETE API
const handleConfirmDelete = async () => {
  try {
    if (!user?.academyId) {
      toast({
        title: "Error",
        description: "No academy ID found",
        variant: "destructive",
      });
      return;
    }

    // Call the DELETE API with sessionIds and academyId in the body
    const response = await fetch('/api/db/ams-sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionIds: selectedSessions,
        academyId: user.academyId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete sessions');
    }

    // Remove from local state
    setSessions(prev => prev.filter(session => !selectedSessions.includes(session.id)));
    setSelectedSessions([]);
    setShowCheckboxes(false);
    setShowDeleteAlert(false);

    toast({
      title: "Success",
      description: `${selectedSessions.length} sessions have been deleted`,
    });
  } catch (error) {
    console.error('Error deleting sessions:', error);
    toast({
      title: "Error",
      description: "Failed to delete sessions",
      variant: "destructive",
    });
  }
};

const handleSelectSession = (id: number) => {
  setSelectedSessions((prev) => (prev.includes(id) ? prev.filter((sessionId) => sessionId !== id) : [...prev, id]))
}

const handleApproveSession = (sessionId: number) => {
  setSessions((prevSessions) => {
    const updatedSessions = prevSessions.map((session) => {
      if (session.id === sessionId) {
        return {
          ...session,
          status: "Finished" as const
        };
      }
      return session;
    });
    return updatedSessions;
  });
}

const handleRejectSession = async (sessionId: number) => {
  try {
    const response = await fetch(`/api/db/ams-sessions/${sessionId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete session');

    setSessions(prev => prev.filter(session => session.id !== sessionId));
    
    toast({
      title: "Success",
      description: "Session deleted successfully",
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    toast({
      title: "Error",
      description: "Failed to delete session",
      variant: "destructive",
    });
  }
}

// Add this state near other state declarations
const [occurrences, setOccurrences] = useState<Session[]>([]);

// Update handleViewOccurrences function
const handleViewOccurrences = async (parentId: number) => {
  try {
    if (!user?.academyId) {
      toast({
        title: "Error",
        description: "No academy ID found",
        variant: "destructive",
      });
      return;
    }

    console.log('Fetching parent session:', parentId);

    // Fetch parent session
    const parentResponse = await fetch(`/api/db/ams-sessions/${parentId}`);
    if (!parentResponse.ok) throw new Error('Failed to fetch parent session');
    const parentResult = await parentResponse.json();

    if (!parentResult.success || !parentResult.data) {
      throw new Error('Invalid parent session response');
    }

    // Fetch occurrences
    const occurrencesResponse = await fetch(
      `/api/db/ams-sessions/occurrences?parentId=${parentId}&academyId=${user.academyId}`,
      {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }
    );

    if (!occurrencesResponse.ok) throw new Error('Failed to fetch occurrences');
    const occurrencesResult = await occurrencesResponse.json();

    // Ensure the data is an array
    const occurrences = Array.isArray(occurrencesResult.data) ? occurrencesResult.data : [];

    // Calculate the status of each occurrence based on date and time
    const now = new Date();
    const updatedOccurrences = occurrences.map((occurrence) => {
      const occurrenceDate = new Date(occurrence.date);
      const [startHour, startMinute] = occurrence.startTime.split(':').map(Number);
      const [endHour, endMinute] = occurrence.endTime.split(':').map(Number);

      const sessionStart = new Date(occurrenceDate);
      sessionStart.setHours(startHour, startMinute, 0);

      const sessionEnd = new Date(occurrenceDate);
      sessionEnd.setHours(endHour, endMinute, 0);

      let status: Session['status'];
      if (now < sessionStart) {
        status = "Upcoming";
      } else if (now >= sessionStart && now <= sessionEnd) {
        status = "On-going";
      } else {
        status = "Finished";
      }

      return { ...occurrence, status };
    });

    // Group occurrences by status
    const groupedOccurrences = updatedOccurrences.reduce((acc: { [key: string]: Session[] }, occurrence: Session) => {
      const status = occurrence.status || "Unknown";
      if (!acc[status]) acc[status] = [];
      acc[status].push(occurrence);
      return acc;
    }, {});

    setViewOccurrencesData({
      parentSession: parentResult.data,
      occurrences: updatedOccurrences,
      groupedOccurrences
    });

    setIsOccurrencesDialogOpen(true); // Explicitly open dialog

    console.log('Updated occurrences with status:', updatedOccurrences);
  } catch (error) {
    console.error('Error viewing occurrences:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to load occurrences",
      variant: "destructive",
    });
  }
};

const handleViewDetails = async (sessionId: number | string) => {
  try {
    if (!user?.academyId) {
      toast({
        title: "Error",
        description: "No academy ID found",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log('Fetching details for session:', sessionId);

    // Fetch session details (including attendance)
    const response = await fetch(`/api/db/ams-sessions/${sessionId}?academyId=${user.academyId}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch session details');

    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch session details');
    }

    const session = result.data;

    // Log attendance for this session
    console.log(
      `[ATTENDANCE] Session ID: ${session.id} | Recurring: ${!!session.isRecurring} | Occurrence: ${!!session.isOccurrence}`,
      session.attendance
    );

    // If recurring occurrence, also fetch parent session attendance
    if (session.isOccurrence && session.parentSessionId) {
      const parentResponse = await fetch(`/api/db/ams-sessions/${session.parentSessionId}?academyId=${user.academyId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (parentResponse.ok) {
        const parentResult = await parentResponse.json();
        if (parentResult.success && parentResult.data) {
          console.log(
            `[ATTENDANCE] Parent Session ID: ${parentResult.data.id} | Recurring: ${!!parentResult.data.isRecurring}`,
            parentResult.data.attendance
          );
        }
      }
    }

    // ...existing code for fetching player details and updating state...
    if (session.assignedPlayers?.length > 0) {
      const playerIds = Array.isArray(session.assignedPlayers) ? session.assignedPlayers : [session.assignedPlayers];
      const playersResponse = await fetch(`/api/db/ams-player-data/batch?ids=${playerIds.join(',')}`);
      if (playersResponse.ok) {
        const playersResult = await playersResponse.json();
        if (playersResult.success && Array.isArray(playersResult.data)) {
          session.assignedPlayersData = playersResult.data.map((player: any) => ({
            id: player._id || player.id,
            name: player.name || player.username || 'Unknown Player',
            position: player.position || 'Not specified',
            photoUrl: player.photoUrl || DEFAULT_AVATAR,
          }));
        } else {
          session.assignedPlayersData = [];
        }
      } else {
        session.assignedPlayersData = playerIds.map(id => ({
          id,
          name: 'Unknown Player',
          position: 'Not specified',
          photoUrl: DEFAULT_AVATAR,
        }));
      }
    } else {
      session.assignedPlayersData = [];
    }

    setSessions(prev => prev.map(s => 
      s.id.toString() === sessionId.toString() ? session : s
    ));
    setViewDetailsSessionId(sessionId);
    setViewDetailsSessionData(session);

    // ...existing code...
  } catch (error) {
    console.error('Error viewing session details:', error);
    toast({
      title: "Error",
      description: "Failed to load session details",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

const handleViewMore = () => {
  setVisibleSessionsCount(prevCount => prevCount + 30)
}

const sortedSessions = useCallback((sessions: Session[]) => {
  const now = new Date()
  
  return [...sessions].sort((a, b) => {
    // First sort by status priority (Upcoming > On-going > Finished)
    const statusPriority = {
      "Upcoming": 0,
      "On-going": 1,
      "Finished": 2
    }
    
    const statusDiff = statusPriority[a.status] - statusPriority[b.status]
    if (statusDiff !== 0) return statusDiff

    // Then sort within each status
    switch (a.status) {
      case "Upcoming":
        // Earliest date first
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      case "On-going":
      case "Finished":
        // Most recent first
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      default:
        return 0;
    }
  })
}, [])

// Add this new helper function after getNextSessionDate
const getLastFinishedDate = (session: Session) => {
  if (!session.isRecurring) return null;
  
  const now = new Date();
  const finishedOccurrences = sessions
    .filter(s => {
      // Check if it's an occurrence of this recurring session
      if (s.parentSessionId !== session.id || !s.isOccurrence) return false;
      
      // Create date objects for comparison
      const occurrenceDate = new Date(s.date);
      const [endHour, endMinute] = s.endTime.split(':').map(Number);
      const sessionEnd = new Date(occurrenceDate);
      sessionEnd.setHours(endHour, endMinute, 0);
      
      // Check if the session has ended (compare with current date and time)
      return sessionEnd < now;
    })
    .sort((a, b) => {
      // Sort by date and time in descending order
      const dateA = new Date(`${a.date}T${a.endTime}`);
      const dateB = new Date(`${b.date}T${b.endTime}`);
      return dateB.getTime() - dateA.getTime();
    });

  if (finishedOccurrences.length === 0) return 'No finished sessions';
  
  // Format the most recent finished date with correct timezone adjustment
  const lastDate = new Date(finishedOccurrences[0].date);
  lastDate.setDate(lastDate.getDate() + 1); // Adjust for timezone offset
  return format(lastDate, "dd-MM-yyyy (EEE)");
};

// Add this helper function after getLastFinishedDate and before renderSessionTable
const getCompletedSessionsCount = (session: Session) => {
  if (!session.isRecurring) return "1 completed";

  const now = new Date();
  const finishedOccurrences = sessions.filter(s => 
    s.parentSessionId === session.id &&
    s.isOccurrence &&
    new Date(`${s.date}T${s.endTime}`) < now
  );

  return `${finishedOccurrences.length} completed`;
};

// Add CSS for smooth transitions
const sessionRowStyles = {
  transition: 'all 0.3s ease-in-out',
  opacity: 1,
  transform: 'translateX(0)',
};

const updatingSessionStyles = {
  backgroundColor: 'rgba(59, 130, 246, 0.1)', // Subtle highlight
  transition: 'background-color 0.3s ease-in-out',
};

// Modify the renderSessionTable function to show different columns based on status
const renderSessionTable = (status: Session["status"] | "All") => {
  const now = new Date();
  
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  
  // Get all sessions for current academy that aren't occurrences
  let academySessions = safeSessions.filter(session => 
    session.academyId === user?.academyId && !session.isOccurrence
  );

  // Then filter by coach if showing only my sessions
  if (showMySessions && user?.id) {
    academySessions = academySessions.filter(session => {
      const coachIds = Array.isArray(session.coachId) ? session.coachId : [session.coachId];
      return coachIds.includes(user.id);
    });
  }
  
  // Filter based on status
  const filteredSessions = academySessions.filter((session) => {
    if (status === "All") return true;

    const now = new Date();
    
    if (session.isRecurring) {
      // Get all occurrences for this recurring session
      const occurrences = sessions.filter(s => s.parentSessionId === session.id);
      
      switch (status) {
        case "Upcoming":
          // Show if ANY occurrence is in the future
          return occurrences.some(occ => {
            const occurrenceDate = new Date(occ.date);
            const [startHour, startMinute] = occ.startTime.split(':').map(Number);
            const sessionStart = new Date(occurrenceDate);
            sessionStart.setHours(startHour, startMinute, 0);
            return sessionStart > now;
          });
        
        case "On-going":
          // Show if ANY occurrence is currently happening
          return occurrences.some(occ => {
            const occurrenceDate = new Date(occ.date);
            const [startHour, startMinute] = occ.startTime.split(':').map(Number);
            const [endHour, endMinute] = occ.endTime.split(':').map(Number);
            const sessionStart = new Date(occurrenceDate);
            const sessionEnd = new Date(occurrenceDate);
            sessionStart.setHours(startHour, startMinute, 0);
            sessionEnd.setHours(endHour, endMinute, 0);
            return now >= sessionStart && now <= sessionEnd;
          });
        
        case "Finished":
          // Show if ANY occurrence is finished
          return occurrences.some(occ => {
            const occurrenceDate = new Date(occ.date);
            const [endHour, endMinute] = occ.endTime.split(':').map(Number);
            const sessionEnd = new Date(occurrenceDate);
            sessionEnd.setHours(endHour, endMinute, 0);
            return sessionEnd < now;
          });
        
        default:
          return false;
      }
    } else {
      // For non-recurring sessions, use the existing logic
      const sessionDate = new Date(session.date);
      const [startHour, startMinute] = session.startTime.split(':').map(Number);
      const [endHour, endMinute] = session.endTime.split(':').map(Number);
      
      const sessionStart = new Date(sessionDate);
      const sessionEnd = new Date(sessionDate);
      sessionStart.setHours(startHour, startMinute, 0);
      sessionEnd.setHours(endHour, endMinute, 0);
      
      switch (status) {
        case "Upcoming":
          return sessionStart > now;
        case "On-going":
          return now >= sessionStart && now <= sessionEnd;
        case "Finished":
          return sessionEnd < now;
        default:
          return false;
      }
    }
  });

  // Apply search filter
  const searchedSessions = filteredSessions.filter((session) => {
    if (!session || typeof session !== 'object') return false;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Check session name
    const nameMatch = session.name && 
      typeof session.name === 'string' && 
      session.name.toLowerCase().includes(searchLower);
    
    // Check players
    const playerMatch = Array.isArray(session.assignedPlayers) && 
      session.assignedPlayers.some(playerId => {
        if (!playerId) return false;
        const player = players.find(p => 
          p.id === playerId && 
          p.academyId === user?.academyId // Add academy filter
        );
        return player?.name.toLowerCase().includes(searchLower);
      });
    
    // Check coach
    const coachIds = Array.isArray(session.coachId) 
      ? session.coachId 
      : [session.coachId];
    
    const coachMatch = coachIds.some(id => {
      if (!id) return false;
      const coach = users.find(user => user?.id === id);
      return coach?.name?.toLowerCase().includes(searchLower);
    });

    return nameMatch || playerMatch || coachMatch;
  });

  const visibleSessions = sortedSessions(searchedSessions).slice(0, visibleSessionsCount);
  const hasMore = searchedSessions.length > visibleSessionsCount;

  // Rest of the rendering code...
  return (
    <Card className="mt-2">
      <CardHeader className="flex justify-between items-center">
        <CardTitle>{status} Sessions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="w-full max-h-[450px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {showCheckboxes && <TableHead className="w-[50px]">Select</TableHead>}
                <TableHead>Session Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>
                  {status === "Finished" ? "Last Finished Date" : "Next Date"}
                </TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Batch/Players</TableHead>
                <TableHead>Day(s)</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleSessions.map((session) => (
                <TableRow 
                  // Use a compound key that includes all unique identifiers
                  key={`${session.id}-${session.date}-${session.isOccurrence ? 'occ' : 'reg'}`}
                  style={{
                    ...sessionRowStyles,
                    ...(session.isUpdating ? updatingSessionStyles : {})
                  }}
                >
                  {showCheckboxes && (
                    <TableCell>
                      <Input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={selectedSessions.includes(session.id)}
                        onChange={() => handleSelectSession(session.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>{session.name}</TableCell>
                  <TableCell>
                    {session.isRecurring 
                      ? `${session.date} to ${session.recurringEndDate}`
                      : session.date
                    }
                  </TableCell>
                  <TableCell>
                    {session.isRecurring && (
                      <span className="text-cyan-400">
                        {status === "Finished"
                          ? getLastFinishedDate(session) || 'No finished sessions'
                          : getNextSessionDate(session, session.date, session.recurringEndDate) || 'No upcoming dates'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{`${session.startTime} - ${session.endTime}`}</TableCell>
                  <TableCell>
                    {session.assignedBatch
                      ? batches.find((b) => b.id === session.assignedBatch)?.name
                      : `${session.assignedPlayers?.length || 0} players`}
                  </TableCell>
                  <TableCell>
                    {session.isRecurring
                      ? status === "Finished"
                        ? getCompletedSessionsCount(session)
                        : `${session.totalOccurrences} total`
                      : status === "Finished"
                        ? "1 completed"
                        : "1 session"}
                  </TableCell>
                  <TableCell>
                    {session.coachNames && session.coachNames.length > 0
                      ? session.coachNames.join(", ")
                      : "Not assigned"}
                  </TableCell>
                  <TableCell>
                    <Button variant="default" onClick={() => {
                      if (session.isRecurring) {
                        if (status === "Finished") {
                          handleViewFinishedOccurrences(session.id);
                        } else if (status === "Upcoming") {
                          handleViewUpcomingOccurrences(session.id);
                        } else {
                          handleViewOccurrences(session.id);
                        }
                      } else {
                        handleViewDetails(session.id);
                      }
                    }}>
                      {session.isRecurring 
                        ? status === "Finished"
                          ? "View Finished Sessions"
                          : status === "Upcoming"
                            ? "View Upcoming Occurrences"
                            : "View Occurrences"
                        : "View Details"
                      }
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => setVisibleSessionsCount(prev => prev + 10)}
              className="text-white hover:text-gray-300"
            >
              View More ({searchedSessions.length - visibleSessionsCount} remaining)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Add this new function to split recurring sessions
const splitRecurringSession = (session: Session) => {
  if (!session.isRecurring) return [session];

  const today = new Date();
  const startDate = new Date(session.date);
  const endDate = new Date(session.recurringEndDate || "");
  const selectedDays = session.selectedDays || [];
  
  // Find today's occurrence if any
  const todayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const isSessionToday = selectedDays.includes(todayName);
  const sessionStartTime = new Date(`${today.toISOString().split('T')[0]}T${session.startTime}`);
  const sessionEndTime = new Date(`${today.toISOString().split('T')[0]}T${session.endTime}`);
  const now = new Date();
  const isOngoing = isSessionToday && now >= sessionStartTime && now <= sessionEndTime;
  
  let pastOccurrences = 0;
  let futureOccurrences = 0;
  
  // Count occurrences before and after today
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (currentDate.toDateString() !== today.toDateString()) { // Skip today for past/future counts
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (selectedDays.includes(dayName)) {
        if (currentDate < today) {
          pastOccurrences++;
        } else {
          futureOccurrences++;
        }
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const sessions: Session[] = [];

  // Add past sessions if any
  if (pastOccurrences > 0) {
    sessions.push({
      ...session,
      status: "Finished" as const,
      totalOccurrences: pastOccurrences,
      recurringEndDate: today.toISOString().split('T')[0]
    });
  }

  // Add today's ongoing session if applicable
  if (isOngoing) {
    sessions.push({
      ...session,
      status: "On-going" as const,
      date: today.toISOString().split('T')[0],
      recurringEndDate: today.toISOString().split('T')[0],
      totalOccurrences: 1
    });
  }

  // Add future sessions if any
  if (futureOccurrences > 0) {
    sessions.push({
      ...session,
      status: "Upcoming" as const,
      date: today.toISOString().split('T')[0],
      totalOccurrences: futureOccurrences
    });
  }

  return sessions;
};

// Update the handleViewFinishedOccurrences function
const handleViewFinishedOccurrences = async (parentId: number) => {
  try {
    if (!user?.academyId) {
      toast({
        title: "Error",
        description: "No academy ID found",
        variant: "destructive",
      });
      return;
    }

    console.log('Fetching parent session:', parentId);

    // Fetch parent session
    const parentResponse = await fetch(`/api/db/ams-sessions/${parentId}`);
    if (!parentResponse.ok) throw new Error('Failed to fetch parent session');
    const parentResult = await parentResponse.json();

    if (!parentResult.success || !parentResult.data) {
      throw new Error('Invalid parent session response');
    }

    // Fetch all occurrences
    const occurrencesResponse = await fetch(
      `/api/db/ams-sessions/occurrences?parentId=${parentId}&academyId=${user.academyId}`
    );
    if (!occurrencesResponse.ok) throw new Error('Failed to fetch occurrences');
    const occurrencesResult = await occurrencesResponse.json();

    // Ensure the data is an array
    const allOccurrences = Array.isArray(occurrencesResult.data) ? occurrencesResult.data : [];

    // Calculate status for each occurrence based on date and time
    const now = new Date();
    const finishedOccurrences = allOccurrences
      .map(occurrence => {
        const occurrenceDate = new Date(occurrence.date);
        const [endHour, endMinute] = occurrence.endTime.split(':').map(Number);
        const sessionEnd = new Date(occurrenceDate);
        sessionEnd.setHours(endHour, endMinute, 0);

        // Session is finished if end time has passed
        if (now > sessionEnd) {
          return {
            ...occurrence,
            status: "Finished" as const
          };
        }
        return null;
      })
      .filter(Boolean) // Remove null values
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending

    setViewOccurrencesData({
      parentSession: parentResult.data,
      occurrences: finishedOccurrences,
      showOnlyFinished: true,
      totalOccurrences: allOccurrences.length,
      finishedCount: finishedOccurrences.length
    });

    // Ensure the dialog box opens
    setIsOccurrencesDialogOpen(true);

    console.log('Finished occurrences:', {
      total: allOccurrences.length,
      finished: finishedOccurrences.length,
      occurrences: finishedOccurrences
    });

  } catch (error) {
    console.error('Error viewing finished occurrences:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to load finished occurrences",
      variant: "destructive",
    });
  }
};

// Update the type definition for viewOccurrencesData
const [viewOccurrencesData, setViewOccurrencesData] = useState<{
  parentSession: Session;
  occurrences: Session[];
  groupedOccurrences?: { [status: string]: Session[] };
  showOnlyFinished?: boolean;
  totalOccurrences?: number;
  finishedCount?: number;
} | null>(null);

const OccurrencesDialog = () => {
  if (!viewOccurrencesData) return null;

  const { parentSession, occurrences } = viewOccurrencesData;
  
  // Group occurrences by status
  const groupedOccurrences = occurrences.reduce((acc, occ) => {
    const status = occ.status || "Unknown";
    if (!acc[status]) acc[status] = [];
    acc[status].push(occ);
    return acc;
  }, {} as Record<string, Session[]>);

  return (
    <Dialog 
      open={isOccurrencesDialogOpen} 
      onOpenChange={(open) => {
        setIsOccurrencesDialogOpen(open);
        if (!open) setViewOccurrencesData(null);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recurring Session: {parentSession.name}</DialogTitle>
          <DialogDescription>View and manage session information</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Session Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <div className="font-medium">
                {format(new Date(parentSession.date), "PPP")}
              </div>
            </div>
            <div>
              <Label>End Date</Label>
              <div className="font-medium">
                {format(new Date(parentSession.recurringEndDate || parentSession.date), "PPP")}
              </div>
            </div>
            <div>
              <Label>Days</Label>
              <div className="font-medium">
                {parentSession.selectedDays?.map(day => 
                  day.charAt(0).toUpperCase() + day.slice(1)
                ).join(", ") || "None"}
              </div>
            </div>
            <div>
              <Label>Total Occurrences</Label>
              <div className="font-medium">{occurrences.length}</div>
            </div>
          </div>

          {/* Occurrences Section */}
          <div className="space-y-4">
            {Object.entries(groupedOccurrences).map(([status, statusOccurrences]) => (
              <div key={status} className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 flex justify-between items-center">
                  {status} <span className="text-sm text-muted-foreground">({statusOccurrences.length})</span>
                </h3>
                <div className="space-y-2">
                  {statusOccurrences.length > 0 ? (
                    statusOccurrences.map(occurrence => (
                      <div 
                        key={occurrence.id}
                        className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors"
                      >
                        <div>
                          <div className="font-medium">
                            {format(new Date(occurrence.date), "PPP")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {occurrence.startTime} - {occurrence.endTime}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Attendance: {Object.values(occurrence.attendance || {})
                              .filter(a => a.status === "Present").length} / {
                              occurrence.assignedPlayers?.length || 0
                            }
                          </div>
                        </div>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(occurrence.id, parentSession.id)}
                        >
                          View Details
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      No {status.toLowerCase()} occurrences
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Add new SessionTable component for reusability
const SessionTable = ({ 
  sessions, 
  onViewDetails,
  showStatus = true
}: { 
  sessions: Session[], 
  onViewDetails: (id: number) => void,
  showStatus?: boolean
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Date</TableHead>
        {showStatus && <TableHead>Status</TableHead>}
        <TableHead>Attendance</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {sessions.map((session) => (
        <TableRow 
          key={`${session.id}-${session.date}-${session.isOccurrence ? 'occ' : 'reg'}-${Date.now()}`}
        >
          <TableCell>{session.date}</TableCell>
          {showStatus && (
            <TableCell>
              <Badge 
                variant={
                  session.status === "On-going" ? "default" : 
                  session.status === "Finished" ? "secondary" : 
                  "outline"
                }
              >
                {session.status}
              </Badge>
            </TableCell>
          )}
          <TableCell>
            {Object.values(session.attendance || {}).filter(a => a.status === "Present").length} /
            {session.assignedPlayers.length} present
          </TableCell>
          <TableCell>
            <Button variant="default" onClick={() => onViewDetails(session.id)}>
              View Details
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// Add this useEffect to load coaches from localStorage
  useEffect(() => {
    const storedCoaches = localStorage.getItem('ams-coaches')
    if (storedCoaches) {
      const parsedCoaches = JSON.parse(storedCoaches)
      setCoaches(parsedCoaches)
    }
  }, [])

// Update getAvailableCoaches function
const getAvailableCoaches = async () => {
  try {
    if (!user?.academyId) {
      console.log('No academyId available for coach fetching');
      return [];
    }

    console.log('Fetching coaches for academy:', user.academyId);

    const response = await fetch(`/api/db/ams-users?academyId=${encodeURIComponent(user.academyId)}&role=coach`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch coaches');
    }

    const result = await response.json();
    console.log('Fetched coaches data:', result);

    if (!result.success || !Array.isArray(result.data)) {
      console.error('Invalid coach data format:', result);
      return [];
    }

    // Filter active coaches and map to required format
    const availableCoaches = result.data
      .filter(coach => coach.status === 'active')
      .map(coach => ({
        id: coach.id || coach._id,
        email: coach.email,
        displayName: coach.name || coach.username,
        role: coach.role
      }));

    console.log('Available coaches for selection:', availableCoaches);
    return availableCoaches;
  } catch (error) {
    console.error('Error fetching coaches:', error);
    return [];
  }
};

// Add state for available coaches
const [availableCoaches, setAvailableCoaches] = useState<any[]>([]);

// Add effect to load coaches when dialog opens
useEffect(() => {
  if (isDialogOpen) {
    const loadCoaches = async () => {
      try {
        const coaches = await getAvailableCoaches();
        console.log('Setting available coaches:', coaches);
        setAvailableCoaches(coaches);
      } catch (error) {
        console.error('Error loading coaches:', error);
        toast({
          title: "Error",
          description: "Failed to load coaches",
          variant: "destructive",
        });
      }
    };
    loadCoaches();
  }
}, [isDialogOpen, user?.academyId]);

  // Add new handler for deselecting batch
  const handleBatchDeselect = () => {
    setNewSession(prev => ({
      ...prev,
      assignedBatch: "",
      assignedPlayers: [],
      coachId: [],        // Clear coach IDs
      coachNames: []      // Clear coach names
    }));
  };

  // Add this function to handle date selection properly
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Add one day to compensate for timezone offset
      const adjustedDate = new Date(date)
      adjustedDate.setDate(adjustedDate.getDate() + 1)
      
      setSelectedDate(date)
      setNewSession({ 
        ...newSession, 
        date: adjustedDate.toISOString().split('T')[0] 
      })
    }
  }

  // Update batch selection handler
  const handleBatchSelect = async (value: string) => {
    try {
      if (!user?.academyId) {
        console.error('No academy ID found');
        return;
      }

      console.log('Selected batch ID:', value);

      // Clear players if deselecting batch
      if (!value || value === newSession.assignedBatch) {
        setNewSession(prev => ({
          ...prev,
          assignedBatch: "",
          assignedPlayers: [],
          assignedPlayersData: [],
          coachId: [],
          coachNames: []
        }));
        return;
      }

      // Fetch batch details from MongoDB
      const batchResponse = await fetch(`/api/db/ams-batches/${value}`);
      if (!batchResponse.ok) {
        throw new Error('Failed to fetch batch details');
      }

      const result = await batchResponse.json();
      if (!result.success || !result.data) {
        throw new Error('Invalid batch data');
      }
      
      const batchData = result.data;
      console.log('Fetched batch data:', batchData);

      // Fetch player details for all players in the batch
      const playerIds = batchData.players || [];
      console.log('Player IDs in batch:', playerIds);

      if (playerIds.length > 0) {
        // Fetch from ams-player-data collection
        const playersResponse = await fetch(`/api/db/ams-player-data?ids=${playerIds.join(',')}`);
        if (!playersResponse.ok) {
          throw new Error('Failed to fetch player details');
        }

        const playersData = await playersResponse.json();
        console.log('Fetched players data:', playersData);

        if (playersData.success && Array.isArray(playersData.data)) {
          // Always assign all batch players to assignedPlayers (as strings)
          setNewSession(prev => ({
            ...prev,
            assignedBatch: value,
            assignedPlayers: playerIds.map((id: any) => id.toString()),
            assignedPlayersData: playersData.data,
            coachId: batchData.coachIds || [batchData.coachId],
            coachNames: batchData.coachNames || []
          }));
        }
      }

    } catch (error) {
      console.error('Error selecting batch:', error);
      toast({
        title: "Error",
        description: "Failed to load batch details",
        variant: "destructive",
      });
    }
  };

  // Update individual player selection handler
  const handlePlayerSelect = (playerId: string, checked: boolean) => {
    setNewSession(prev => ({
      ...prev,
      assignedPlayers: checked 
        ? [...prev.assignedPlayers, playerId]
        : prev.assignedPlayers.filter(id => id !== playerId)
    }))
  }

  const handleExportClick = () => {
    setShowExportAlert(true);
  };

  // Replace handleConfirmExport to clear all sessions from the database using DELETE API
const handleConfirmExport = async () => {
  if (!user?.academyId) {
    toast({
      title: "Error",
      description: "No academy ID found",
      variant: "destructive",
    });
    return;
  }

  try {
    // Export to CSV
    const exportedCount = exportToFile(sessions, user.academyId, batches);

    // Clear all sessions from database using a DELETE API (assuming such an endpoint exists)
    // If not, you may need to call DELETE for each session
    await Promise.all(
      sessions
        .filter(session => session.academyId === user.academyId)
        .map(session =>
          fetch(`/api/db/ams-sessions/${session.id}`, { method: 'DELETE' })
        )
    );

    // Update local state
    setSessions([]);
    setUnsavedSessions([]);
    setHasUnsavedChanges(false);

    toast({
      title: "Success",
      description: `${exportedCount} sessions have been exported and cleared`,
      variant: "default",
    });

    setShowExportAlert(false);
  } catch (error) {
    console.error('Error during export:', error);
    toast({
      title: "Error",
      description: "Failed to export and clear sessions",
      variant: "destructive",
    });
  }
};

  // Update the initial load effect to handle chunked data
  useEffect(() => {
    const loadSessions = () => {
      try {
        const chunkCount = parseInt(localStorage.getItem(`${LOCAL_STORAGE_KEY}_count`) || "0");
        let allSessions: Session[] = [];
        
        for (let i = 0; i < chunkCount; i++) {
          const chunk = StorageUtils.getItem(`${LOCAL_STORAGE_KEY}_${i}`);
          if (chunk) allSessions = [...allSessions, ...chunk];
        }

        return allSessions;
      } catch (error) {
        console.error('Error loading sessions:', error);
        return [];
      }
    };

    const savedSessions = loadSessions();
    setSessions(savedSessions.map(mapSessionPlayers));
  }, []);

  // Reset visible count when changing tabs or search
  useEffect(() => {
    setVisibleSessionsCount(10)
  }, [activeLog, searchTerm])

  const getPlayerCurrentMetrics = async (playerId: string, sessionId: number) => {
    const cacheKey = `${playerId}-${sessionId}`;
    const now = Date.now();
  
    // Return cached data if available and not expired
    if (metricsCache[cacheKey] && now - metricsCache[cacheKey].timestamp < 300000) { // 5 minutes
      return metricsCache[cacheKey].data;
    }
  
    try {
      // First try to get session-specific metrics
      const session = sessions.find(s => s.id === sessionId);
      const sessionMetrics = session?.playerMetrics?.[playerId];
  
      // Get player's current attributes from MongoDB
      const response = await fetch(`/api/db/ams-player-data/${playerId}`);
      if (!response.ok) throw new Error('Failed to fetch player data');
      const playerData = await response.json();
  
      const metrics = {
        shooting: sessionMetrics?.shooting?.toString() || playerData?.attributes?.shooting?.toString() || "0",
        pace: sessionMetrics?.pace?.toString() || playerData?.attributes?.pace?.toString() || "0",
        positioning: sessionMetrics?.positioning?.toString() || playerData?.attributes?.positioning?.toString() || "0",
        passing: sessionMetrics?.passing?.toString() || playerData?.attributes?.passing?.toString() || "0",
        ballControl: sessionMetrics?.ballControl?.toString() || playerData?.attributes?.ballControl?.toString() || "0",
        crossing: sessionMetrics?.crossing?.toString() || playerData?.attributes?.crossing?.toString() || "0",
        sessionRating: sessionMetrics?.sessionRating?.toString() || "0"
      };
  
      // Cache the metrics
      metricsCache[cacheKey] = {
        data: metrics,
        timestamp: now,
        isDirty: false
      };
  
      return metrics;
    } catch (error) {
      console.error('Error getting player metrics:', error);
      return metricsCache[cacheKey]?.data || {
        shooting: "0", pace: "0", positioning: "0",
        passing: "0", ballControl: "0", crossing: "0",
        sessionRating: "0"
      };
    }
  };
  
  const handleMetricsClick = async (playerId: string, playerName: string, sessionId: number) => {
    try {
      const currentMetrics = await getPlayerCurrentMetrics(playerId, sessionId);
      setPlayerMetrics(prev => ({
        ...prev,
        [playerId]: currentMetrics
      }));
      setSelectedPlayerForMetrics({
        id: playerId,
        name: playerName,
        sessionId
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load player metrics",
        variant: "destructive",
      });
    }
  };

const handleSaveMetrics = async (sessionId: number, playerId: string, metricsToSave: any) => {
  try {
    if (!metricsToSave || !sessionId || !playerId || !user?.academyId) {
      throw new Error('Missing required data');
    }

    const numericMetrics = {
      shooting: Math.min(Math.max(Number(metricsToSave.shooting || 0), 0), 10),
      pace: Math.min(Math.max(Number(metricsToSave.pace || 0), 0), 10),
      positioning: Math.min(Math.max(Number(metricsToSave.positioning || 0), 0), 10),
      passing: Math.min(Math.max(Number(metricsToSave.passing || 0), 0), 10),
      ballControl: Math.min(Math.max(Number(metricsToSave.ballControl || 0), 0), 10),
      crossing: Math.min(Math.max(Number(metricsToSave.crossing || 0), 0), 10),
    };

    const sessionRating = Math.min(Math.max(Number(metricsToSave.sessionRating || 0), 0), 10);

    const overall = Math.round(
      Object.values(numericMetrics).reduce((sum, val) => sum + val, 0) / 
      Object.keys(numericMetrics).length
    );

    // First, update the session metrics
    const sessionResponse = await fetch(`/api/db/ams-sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerMetrics: {
          [playerId]: {
            ...numericMetrics,
            sessionRating,
            overall,
          },
        },
        updatedBy: user.id,
      }),
    });

    if (!sessionResponse.ok) {
      throw new Error('Failed to update session metrics');
    }

    // Then, update the player's performance history
    const playerResponse = await fetch(`/api/db/ams-player-data/update-session-metrics`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        sessionId,
        attributes: numericMetrics,
        sessionRating,
        overall,
        type: 'training',
        date: new Date().toISOString(),
        academyId: user.academyId
      }),
    });

    if (!playerResponse.ok) {
      throw new Error('Failed to update player performance history');
    }

    toast({
      title: "Success",
      description: "Player metrics updated successfully",
      variant: "default",
    });

    return true;

  } catch (error) {
    console.error('Error saving metrics:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to save metrics",
      variant: "destructive",
    });
    return false;
  }
};

  // Update the PlayerMetricsDialog component
  const PlayerMetricsDialog = () => {
    const [localMetrics, setLocalMetrics] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const dialogRef = useRef<{ hasLoaded: boolean }>({ hasLoaded: false });
  
    useEffect(() => {
      const loadMetrics = async () => {
        if (!selectedPlayerForMetrics || dialogRef.current.hasLoaded) return;
  
        setIsLoading(true);
        try {
          const session = sessions.find(s => s.id === selectedPlayerForMetrics.sessionId);
          if (!session) {
            console.error('Session not found for metrics dialog');
            return;
          }
  
          // Fetch metrics from session's playerMetrics or fallback to player's original attributes
          const playerMetrics = session.playerMetrics?.[selectedPlayerForMetrics.id];
          const playerData = mongoPlayers.find(p => p.id === selectedPlayerForMetrics.id);
  
          const metrics = {
            shooting: playerMetrics?.shooting?.toString() || playerData?.attributes?.shooting?.toString() || "0",
            pace: playerMetrics?.pace?.toString() || playerData?.attributes?.pace?.toString() || "0",
            positioning: playerMetrics?.positioning?.toString() || playerData?.attributes?.positioning?.toString() || "0",
            passing: playerMetrics?.passing?.toString() || playerData?.attributes?.passing?.toString() || "0",
            ballControl: playerMetrics?.ballControl?.toString() || playerData?.attributes?.ballControl?.toString() || "0",
            crossing: playerMetrics?.crossing?.toString() || playerData?.attributes?.crossing?.toString() || "0",
            sessionRating: playerMetrics?.sessionRating?.toString() || "0",
          };
  
          setLocalMetrics(metrics);
          dialogRef.current.hasLoaded = true;
        } catch (error) {
          console.error('Error loading metrics:', error);
          toast({
            title: "Error",
            description: "Failed to load player metrics",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
  
      loadMetrics();
  
      // Reset hasLoaded when dialog closes
      return () => {
        dialogRef.current.hasLoaded = false;
      };
    }, [selectedPlayerForMetrics, sessions, mongoPlayers]);
  
    const handleMetricChange = (key: string, value: number) => {
      setLocalMetrics(prev => ({
        ...prev,
        [key]: value.toString()
      }));
    };
  
    return (
      <Dialog 
        open={!!selectedPlayerForMetrics} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPlayerForMetrics(null);
            setLocalMetrics(null);
            dialogRef.current.hasLoaded = false;
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Input Metrics for {selectedPlayerForMetrics?.name}
            </DialogTitle>
            <DialogDescription>
              Update performance metrics and session rating
            </DialogDescription>
          </DialogHeader>
          <DialogDescription>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {localMetrics && METRICS_CONFIG.map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm">{label}</Label>
                    <span className="text-sm text-muted-foreground">
                      {localMetrics[key as keyof typeof localMetrics]}/10
                    </span>
                  </div>
                  <Slider
                    value={[Number(localMetrics[key as keyof typeof localMetrics])]}
                    min={0}
                    max={10}
                    step={0.1}
                    onValueChange={([value]) => handleMetricChange(key, value)}
                  />
                </div>
              ))}
              <div className="col-span-2 space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">Session Rating</Label>
                  <span className="text-sm text-muted-foreground">
                    {localMetrics?.sessionRating}/10
                  </span>
                </div>
                <Slider
                  value={[Number(localMetrics?.sessionRating)]}
                  min={0}
                  max={10}
                  step={0.1}
                  onValueChange={([value]) => handleMetricChange('sessionRating', value)}
                />
              </div>
            </div>
          </DialogDescription>
          <DialogFooter className="mt-4">
            <Button onClick={() => {
              handleSaveMetrics(
                selectedPlayerForMetrics?.sessionId,
                selectedPlayerForMetrics?.id,
                localMetrics
              );
              setSelectedPlayerForMetrics(null);
            }}>
              Save Metrics
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Add this new function
  const handleSelectAllPlayers = (checked: boolean) => {
    if (newSession.assignedBatch) {
      // If batch is selected, select/deselect all filtered batch players
      const batchPlayers = batches
        .find((batch) => batch.id === newSession.assignedBatch)
        ?.players.filter(playerId => {
          const player = players.find(p => 
            p.id === playerId && 
            p.academyId === user?.academyId // Add academy filter
          );
          return player?.name.toLowerCase().includes(playerSearchQuery.toLowerCase());
        }) || [];
      setNewSession(prev => ({
        ...prev,
        assignedPlayers: checked ? batchPlayers.map(id => id.toString()) : []
      }));
    } else {
      // If no batch selected, select/deselect all filtered individual players
      const filteredPlayers = players
        .filter(player => 
          player.academyId === user?.academyId &&
          player.name.toLowerCase().includes(playerSearchQuery.toLowerCase())
        )
        .map(player => player.id.toString());
      setNewSession(prev => ({
        ...prev,
        assignedPlayers: checked ? filteredPlayers : []
      }));
    }
  };

const handleViewUpcomingOccurrences = async (parentId: number) => {
  try {
    if (!user?.academyId) {
      toast({
        title: "Error",
        description: "No academy ID found",
        variant: "destructive",
      });
      return;
    }

    console.log('Fetching parent session:', parentId);

    // Fetch parent session
    const parentResponse = await fetch(`/api/db/ams-sessions/${parentId}`);
    if (!parentResponse.ok) throw new Error('Failed to fetch parent session');
    const parentResult = await parentResponse.json();

    if (!parentResult.success || !parentResult.data) {
      throw new Error('Invalid parent session response');
    }

    // Fetch all occurrences
    const occurrencesResponse = await fetch(
      `/api/db/ams-sessions/occurrences?parentId=${parentId}&academyId=${user.academyId}`
    );
    if (!occurrencesResponse.ok) throw new Error('Failed to fetch occurrences');
    const occurrencesResult = await occurrencesResponse.json();

    // Ensure the data is an array
    const allOccurrences = Array.isArray(occurrencesResult.data) ? occurrencesResult.data : [];

    // Calculate status for each occurrence based on date and time
    const now = new Date();
    const upcomingOccurrences = allOccurrences
      .map(occurrence => {
        const occurrenceDate = new Date(occurrence.date);
        const [startHour, startMinute] = occurrence.startTime.split(':').map(Number);
        const sessionStart = new Date(occurrenceDate);
        sessionStart.setHours(startHour, startMinute, 0);

        // Only include future sessions (upcoming)
        if (now < sessionStart) {
          return {
            ...occurrence,
            status: "Upcoming" as const
          };
        }
        return null;
      })
      .filter(Boolean) // Remove null values
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date ascending

    setViewOccurrencesData({
      parentSession: parentResult.data,
      occurrences: upcomingOccurrences,
      showOnlyUpcoming: true,
      totalOccurrences: allOccurrences.length,
      upcomingCount: upcomingOccurrences.length
    });

    // Ensure the dialog box opens
    setIsOccurrencesDialogOpen(true);

    console.log('Upcoming occurrences:', {
      total: allOccurrences.length,
      upcoming: upcomingOccurrences.length,
      occurrences: upcomingOccurrences
    });

  } catch (error) {
    console.error('Error viewing upcoming occurrences:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to load upcoming occurrences",
      variant: "destructive",
    });
  }
};

const renderSessionDetails = (session: Session | undefined) => {
  if (!session) return null;

  console.log('Rendering session details:', session);

  const currentStatus = calculateSessionStatus(session);
  const filteredPlayers = (session.assignedPlayersData || []).filter(player => 
    player.name.toLowerCase().includes(detailsPlayerSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Session Name</Label>
          <div className="font-medium">{session.name || "N/A"}</div>
        </div>
        <div>
          <Label>Date</Label>
          <div className="font-medium">
            {session.isOccurrence 
              ? format(new Date(session.date), "PPP")
              : session.isRecurring 
                ? `${format(new Date(session.date), "PPP")} to ${format(new Date(session.recurringEndDate || session.date), "PPP")}`
                : format(new Date(session.date), "PPP")}
          </div>
        </div>
        <div>
          <Label>Time</Label>
          <div className="font-medium">
            {session.startTime && session.endTime 
              ? `${session.startTime} - ${session.endTime}`
              : "N/A"}
          </div>
        </div>
        <div>
          <Label>Status</Label>
          <Badge 
            variant={
              currentStatus === "On-going" ? "default" : 
              currentStatus === "Finished" ? "secondary" : 
              "outline"
            }
          >
            {currentStatus || "Unknown"}
          </Badge>
        </div>
      </div>

      {/* Player List Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Label>Assigned Players ({filteredPlayers.length})</Label>
          <div className="w-1/3">
            <Input
              placeholder="Search players..."
              value={detailsPlayerSearchQuery}
              onChange={(e) => setDetailsPlayerSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        <div className="border rounded-md p-4 mt-2 max-h-[400px] overflow-y-auto">
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((player) => {
              const attendanceStatus = session.attendance?.[player.id]?.status;
              const isPresent = attendanceStatus === "Present";

              return (
                <div key={player.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                      <img
                        src={player.photoUrl || DEFAULT_AVATAR}
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{player.name}</span>
                      <span className="text-sm text-gray-500">{player.position}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={isPresent}
                        onCheckedChange={(checked) => handleAttendanceChange(session.id, player.id, checked)}
                        disabled={currentStatus === "Upcoming"}
                      />
                      <span className="text-sm">
                        {isPresent ? "Present" : "Absent"}
                      </span>
                    </div>
                    {isPresent && currentStatus === "Finished" && (
                      <Button
                        size="sm"
                        variant="outline" 
                        onClick={() => handleMetricsClick(player.id, player.name, session.id)}
                      >
                        Input Metrics
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4 text-gray-500">
              No players found
            </div>
          )}
        </div>
      </div>

      {/* Additional Details */}
      <div>
        <Label>Coaches</Label>
        <div className="font-medium mt-1">
          {session.coachNames?.length ? session.coachNames.join(", ") : "Not assigned"}
        </div>
      </div>
      {session.isOccurrence && session.parentSessionId && (
        <div>
          <Label>Occurrence Details</Label>
          <div className="text-sm text-gray-500 mt-1">
            Part of recurring session #{session.parentSessionId}
          </div>
        </div>
      )}
    </div>
  );
};

  // Add this new handler for attendance
  const handleAttendanceChange = async (sessionId: number | string, playerId: string, isPresent: boolean) => {
    if (!user?.academyId) {
      console.error('[ATTENDANCE] No academyId available');
      return;
    }
  
    // Store previous state for rollback
    const previousSessions = [...sessions];
  
    // Find session in local state
    const session = sessions.find(s => 
      s._id?.toString() === sessionId.toString() || 
      s.id.toString() === sessionId.toString()
    );
  
    if (!session) {
      console.error('[ATTENDANCE] Session not found:', sessionId);
      return;
    }
  
    // Create updated attendance object
    const updatedAttendance = {
      ...session.attendance,
      [playerId]: {
        status: isPresent ? "Present" : "Absent",
        markedAt: new Date().toISOString(),
        markedBy: user.id
      }
    };
  
    // Optimistic update
    setSessions(prev => prev.map(s => {
      if (s._id?.toString() === sessionId.toString() || s.id.toString() === sessionId.toString()) {
        return { ...s, attendance: updatedAttendance, isUpdating: true };
      }
      return s;
    }));
  
    // Update view details if open
    if (viewDetailsSessionData?._id?.toString() === sessionId.toString() ||
        viewDetailsSessionData?.id?.toString() === sessionId.toString()) {
      setViewDetailsSessionData(prev => prev ? {
        ...prev,
        attendance: updatedAttendance
      } : prev);
    }
  
    // Show immediate success toast
    toast({
      title: "Updating",
      description: `Marking as ${isPresent ? "Present" : "Absent"}...`,
    });
  
    // Update backend
    try {
      const updatePayload = {
        attendance: updatedAttendance,
        academyId: user.academyId,
        isOccurrence: session.isOccurrence || false,
        parentSessionId: session.parentSessionId,
        lastUpdated: new Date().toISOString()
      };
  
      const apiId = session._id || session.id;
      const response = await fetch(`/api/db/ams-sessions/${apiId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(updatePayload)
      });
  
      if (!response.ok) throw new Error('Failed to update attendance');
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to update attendance');
  
      // Fetch latest attendance from backend and log it
      const fetchAttendanceResp = await fetch(`/api/db/ams-sessions/${sessionId}?academyId=${user.academyId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (fetchAttendanceResp.ok) {
        const attendanceResult = await fetchAttendanceResp.json();
        if (attendanceResult.success && attendanceResult.data) {
          console.log(
            `[ATTENDANCE][AFTER UPDATE] Session ID: ${attendanceResult.data.id} | Recurring: ${!!attendanceResult.data.isRecurring} | Occurrence: ${!!attendanceResult.data.isOccurrence}`,
            attendanceResult.data.attendance
          );
        }
      }
  
      // Show final success toast
      toast({
        title: "Success",
        description: `Attendance saved as ${isPresent ? "Present" : "Absent"}`,
        variant: "default",
      });

      // Remove updating state after success
      setTimeout(() => {
        setSessions(prev => prev.map(s => {
          if (s.id.toString() === sessionId.toString()) {
            return { ...s, isUpdating: false };
          }
          return s;
        }));
      }, 300);
  
    } catch (error) {
      // Rollback on error
      setSessions(previousSessions);
  
      // Update view details if open
      if (viewDetailsSessionData?._id?.toString() === sessionId.toString() ||
          viewDetailsSessionData?.id?.toString() === sessionId.toString()) {
        setViewDetailsSessionData(prev => prev ? {
          ...prev,
          attendance: session.attendance
        } : prev);
      }
  
      // Show error toast
      console.error('Error updating attendance:', error);
      toast({
        title: "Error",
        description: "Failed to save attendance. Changes reverted.",
        variant: "destructive",
      });
    }
  };

  // Add this helper function for status calculation
  const calculateSessionStatus = (session: Session) => {
    const now = new Date();
    const sessionDate = new Date(session.date);
    const [startHour, startMinute] = session.startTime.split(':').map(Number);
    const [endHour, endMinute] = session.endTime.split(':').map(Number);
    
    const sessionStart = new Date(sessionDate);
    sessionStart.setHours(startHour, startMinute, 0);
    
    const sessionEnd = new Date(sessionDate);
    sessionEnd.setHours(endHour, endMinute, 0);
    
    if (now < sessionStart) {
      return "Upcoming" as const;
    } else if (now >= sessionStart && now <= sessionEnd) {
      return "On-going" as const;
    } else {
      return "Finished" as const;
    }
  };

  // Add this new handler for full metrics input
  const handleFullMetricsInput = (sessionId: number, playerId: string) => {
    // Redirect to coach dashboard metrics page with query parameters
    router.push(`/dashboard/coach/metrics/${playerId}?sessionId=${sessionId}`);  // Standardized parameter names
  };

  // Add this state for storing players from MongoDB
  const [mongoPlayers, setMongoPlayers] = useState<any[]>([]);

  // Add this effect to fetch players from MongoDB
  useEffect(() => {
    const fetchMongoPlayers = async () => {
      try {
        if (!user?.academyId) {
          console.log('No academyId available');
          return;
        }

        const response = await fetch(`/api/db/ams-player-data?academyId=${user.academyId}`);
        if (!response.ok) throw new Error('Failed to fetch players');
        
        const result = await response.json();
        
        // Ensure we're setting an array
        if (result.success && Array.isArray(result.data)) {
          setMongoPlayers(result.data.map((player: any) => ({
            ...player,
            id: player._id?.toString() || player.id,
            name: player.name || player.username || 'Unknown Player',
            academyId: player.academyId
          })));
        } else {
          console.error('Invalid player data format:', result);
          setMongoPlayers([]);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
        setMongoPlayers([]);
      }
    };

    fetchMongoPlayers();
  }, [user?.academyId]);

  // Update the player selection section in the dialog
  const renderPlayerSelection = () => {
    // Ensure players are filtered correctly based on batch or academy
    const filteredPlayers = newSession.assignedBatch
      ? // If a batch is selected, filter players in the batch
        newSession.assignedPlayersData.filter(player =>
          player.name.toLowerCase().includes(playerSearchQuery.toLowerCase())
        )
      : // If no batch is selected, show all players in the academy
        mongoPlayers.filter(player =>
          player.academyId === user?.academyId &&
          player.name.toLowerCase().includes(playerSearchQuery.toLowerCase())
        );
  
    // Calculate if all visible players are selected
    const allSelected = filteredPlayers.length > 0 && 
      filteredPlayers.every(player => 
        newSession.assignedPlayers.includes(player.id.toString())
      );
  
    // Calculate if some but not all players are selected
    const someSelected = filteredPlayers.some(player => 
      newSession.assignedPlayers.includes(player.id.toString())
    );
  
    return (
      <div className="mt-4">
        <Input
          placeholder="Search players..."
          value={playerSearchQuery}
          onChange={(e) => setPlayerSearchQuery(e.target.value)}
          className="mb-2"
        />
        <div className="h-[200px] overflow-y-auto border rounded-md p-2">
          <div className="sticky top-0 bg-background border-b pb-2 mb-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={ref => {
                  if (ref) {
                    // Handle indeterminate state
                    ref.indeterminate = !allSelected && someSelected;
                  }
                }}
                onChange={(e) => {
                  const playerIds = filteredPlayers.map(p => p.id.toString());
                  if (e.target.checked) {
                    // Add all filtered players that aren't already selected
                    const newPlayerIds = [
                      ...new Set([
                        ...newSession.assignedPlayers,
                        ...playerIds
                      ])
                    ];
                    setNewSession(prev => ({
                      ...prev,
                      assignedPlayers: newPlayerIds
                    }));
                  } else {
                    // Remove all filtered players
                    setNewSession(prev => ({
                      ...prev,
                      assignedPlayers: prev.assignedPlayers.filter(
                        id => !playerIds.includes(id)
                      )
                    }));
                  }
                }}
              />
              <span>Select All</span>
            </div>
          </div>
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((player) => (
              <div key={player.id} className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  checked={newSession.assignedPlayers.includes(player.id.toString())}
                  onChange={(e) => handlePlayerSelect(player.id.toString(), e.target.checked)}
                />
                <span>{player.name}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 p-2">No players found</div>
          )}
        </div>
      </div>
    );
  };

const handleSaveChanges = async () => {
  try {
    if (!user?.academyId) {
      toast({
        title: "Error",
        description: "No academy ID found. Please contact administrator.",
        variant: "destructive",
      });
      return;
    }

    if (unsavedSessions.length === 0) {
      toast({
        title: "No Changes",
        description: "There are no unsaved sessions to save.",
        variant: "default",
      });
      return;
    }

    // Save each unsaved session to the database
    for (const session of unsavedSessions) {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...session, academyId: user.academyId}),
      });

      if (!response.ok) {
        throw new Error(`Failed to save session: ${session.name}`);
      }
    }

    // Clear unsaved sessions and refresh the session list
    setUnsavedSessions([]);
    setHasUnsavedChanges(false);
    await fetchSessions(true);

    toast({
      title: "Success",
      description: "All changes have been saved successfully.",
      variant: "default",
    });
  } catch (error) {
    console.error('Error saving changes:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to save changes.",
      variant: "destructive",
    });
  }
};

  // Move renderBatchPlayers inside SessionsContent so it can access handlePlayerSelect and state
  const renderBatchPlayers = (newSession: any, playerSearchQuery: string) => {
    if (!newSession.assignedBatch) return null;

    // Find the selected batch
    const selectedBatch = batches.find(batch => batch.id === newSession.assignedBatch);

    // If no batch is found, return null
    if (!selectedBatch) {
      return (
        <div className="text-sm text-gray-500 p-2">
          Selected batch not found
        </div>
      );
    }

    // Filter the players based on the search query
    const filteredPlayers = newSession.assignedPlayersData.filter(player =>
      player.name.toLowerCase().includes(playerSearchQuery.toLowerCase())
    );

    return (
      <>
        <div className="text-sm text-gray-500">Players in batch:</div>
        <div className="h-[200px] overflow-y-auto border rounded-md p-2">
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((player) => (
              <div key={player.id} className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  checked={newSession.assignedPlayers.includes(player._id.toString())}
                  onChange={(e) => handlePlayerSelect(player._id.toString(), e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="flex flex-col">
                  <span>{player.name || player.id}</span>
                  {player.position && (
                    <span className="text-sm text-gray-400">{player.position}</span>
                  )}
                </span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 p-2">
              No players found in this batch
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex flex-col space-y-6 overflow-auto">
        <h1 className="text-3xl font-bold text-white p-4">Sessions</h1>
        
        <div className="flex justify-between p-4">
          <div className="flex space-x-4">
            {/* Add the toggle button here */}
            <Button
              variant={showMySessions ? "default" : "outline"}
              onClick={() => setShowMySessions(!showMySessions)}
              className="min-w-[150px]"
            >
              {showMySessions ? "My Sessions" : "All Sessions"}
            </Button>
          </div>
          <div>
            <div className="text-white">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </div>
          </div>
        </div>

        <div className="flex justify-between p-4">
          <Input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="px-4">
          <Tabs
            defaultValue="All"
            value={activeLog}
            onValueChange={(value) => setActiveLog(value as typeof activeLog)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 bg-gray-800">
              <TabsTrigger 
                value="All"
                className="data-[state=active]:bg-gray-900"
              >
                All
              </TabsTrigger>
              <TabsTrigger 
                value="Finished"
                className="data-[state=active]:bg-gray-900"
              >
                Finished
              </TabsTrigger>
              <TabsTrigger 
                value="On-going"
                className="data-[state=active]:bg-gray-900"
              >
                On-going
              </TabsTrigger>
              <TabsTrigger 
                value="Upcoming"
                className="data-[state=active]:bg-gray-900"
              >
                Upcoming
              </TabsTrigger>
            </TabsList>
            <TabsContent value="All">
              {renderSessionTable("All")}
            </TabsContent>
            <TabsContent value="Finished">
              {renderSessionTable("Finished")}
            </TabsContent>
            <TabsContent value="On-going">
              {renderSessionTable("On-going")}
            </TabsContent>
            <TabsContent value="Upcoming">
              {renderSessionTable("Upcoming")}
            </TabsContent>
          </Tabs>
        </div>
        {/* Session Details Dialog */}
        <Dialog open={viewDetailsSessionId !== null} onOpenChange={() => setViewDetailsSessionId(null)}>
          <DialogContent className="max-w-4xl max-h-[100vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Session Details</DialogTitle>
              <DialogDescription>
                View and manage session information, attendance, and metrics
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {renderSessionDetails(viewDetailsSessionData)}
            </div>
            <DialogFooter>
              <Button variant="default" onClick={() => setViewDetailsSessionId(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <PlayerMetricsDialog />
      <OccurrencesDialog />
    </div>
  )
}

// Add this after the interfaces and before the component
const METRICS_CONFIG = [
  { key: "shooting", label: "Shooting" },
  { key: "pace", label: "Pace" },
  { key: "positioning", label: "Positioning" },
  { key: "passing", label: "Passing" },
  { key: "ballControl", label: "Ball Control" },
  { key: "crossing", label: "Crossing" },
  { key: "sessionRating", label: "Session Rating" }
] as const;

const handleExportSessions = async (academyId: string | undefined) => {
  try {
    const response = await fetch('/api/db/ams-sessions/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'export',
        academyId
      }),
    });
    if (!response.ok) throw new Error('Failed to export sessions');
    const data = await response.json();
    // Create and download CSV
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessions-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast({
      title: "Success",
      description: "Sessions exported successfully",
    });
  } catch (error) {
    console.error('Error exporting sessions:', error);
    toast({
      title: "Error",
      description: "Failed to export sessions",
      variant: "destructive",
    });
  }
};

const handleClearSessions = async (academyId: string | undefined) => {
  try {
    if (!window.confirm('Are you sure you want to clear all sessions? This action cannot be undone.')) {
      return;
    }
    const response = await fetch('/api/db/ams-sessions/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'clear',
        academyId
      }),
    });
    if (!response.ok) throw new Error('Failed to clear sessions');
    setSessions([]);
    setSelectedSessions([]);
    toast({
      title: "Success",
      description: "All sessions cleared successfully",
    });
  } catch (error) {
    console.error('Error clearing sessions:', error);
    toast({
      title: "Error",
      description: "Failed to clear sessions",
      variant: "destructive",
    });
  }
};

const handleDeleteSelected = async (academyId: string | undefined) => {
  try {
    if (!window.confirm(`Are you sure you want to delete ${selectedSessions.length} session(s)?`)) {
      return;
    }
    const response = await fetch('/api/db/ams-sessions/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        sessionIds: selectedSessions,
        academyId
      }),
    });
    if (!response.ok) throw new Error('Failed to delete sessions');
    setSessions(prev => prev.filter(session => !selectedSessions.includes(session._id)));
    setSelectedSessions([]);
    toast({
      title: "Success",
      description: "Selected sessions deleted successfully",
    });
  } catch (error) {
    console.error('Error deleting sessions:', error);
    toast({
      title: "Error",
      description: "Failed to delete sessions",
      variant: "destructive",
    });
  }
};

const convertToCSV = (data: any[]) => {
  if (!data.length) return '';
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(item => 
    Object.values(item).map(value => 
      typeof value === 'string' ? `"${value}"` : value
    ).join(',')
  );
  return [headers, ...rows].join('\n');
};

// ...rest of existing code remains unchanged...

// Update DialogContent component to fix hydration error
const renderSessionDetails = (session: Session | undefined) => {
  if (!session) return null;

  console.log('Rendering session details:', session);

  const currentStatus = calculateSessionStatus(session);
  const filteredPlayers = (session.assignedPlayersData || []).filter(player => 
    player.name.toLowerCase().includes(detailsPlayerSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Other session details */}
      <div className="border rounded-md p-4 mt-2 max-h-[400px] overflow-y-auto">
        {filteredPlayers.map((player) => {
          const attendanceStatus = session.attendance?.[player.id]?.status;
          const isPresent = attendanceStatus === "Present";
          
          return (
            <div key={player.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                  <img
                    src={player.photoUrl || DEFAULT_AVATAR}
                    alt={player.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{player.name || "Unknown Player"}</span>
                  {player.position && (
                    <span className="text-sm text-gray-500">{player.position}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isPresent}
                    onCheckedChange={(checked) => handleAttendanceChange(session.id, player.id, checked)}
                    disabled={currentStatus === "Upcoming"}
                  />
                  <span className="text-sm">
                    {isPresent ? "Present" : "Absent"}
                  </span>
                </div>
                {isPresent && currentStatus === "Finished" && (
                  <Button
                    size="sm"
                    variant="outline" 
                    onClick={() => handleMetricsClick(player.id, player.name, session.id)}
                  >
                    Input Metrics
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Update handleAttendanceChange to handle occurrence sessions correctly
const handleAttendanceChange = async (sessionId: number | string, playerId: string, isPresent: boolean) => {
  if (!user?.academyId) {
    console.error('[ATTENDANCE] No academyId available');
    return;
  }

  // Store previous state for rollback
  const previousSessions = [...sessions];

  try {
    // Optimistic update
    setSessions(prev => prev.map(s => {
      if (s._id?.toString() === sessionId.toString() || s.id.toString() === sessionId.toString()) {
        return {
          ...s,
          attendance: {
            ...s.attendance,
            [playerId]: {
              status: isPresent ? "Present" : "Absent",
              markedAt: new Date().toISOString(),
              markedBy: user.id
            }
          }
        };
      }
      return s;
    }));

    // Rest of the existing handleAttendanceChange code...
  } catch (error) {
    // Rollback on error
    setSessions(previousSessions);
    console.error('Error updating attendance:', error);
    toast({
      title: "Error",
      description: "Failed to save attendance. Changes reverted.",
      variant: "destructive",
    });
  }
};

// Add this new function to render match details
const renderMatchDetails = () => {
  const parentSession = sessions.find(s => s.id === viewDetailsSessionId);
  if (!parentSession) return null;

  // Find all occurrences for this session
  const occurrences = sessions.filter(s => 
    s.parentSessionId === parentSession.id || 
    (s.isOccurrence && s.id.toString().startsWith(parentSession.id.toString()))
  );

  return (
    <div className="space-y-6">
      {/* Parent Session Details */}
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold mb-4">Parent Session</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Date:</strong> {format(new Date(parentSession.date), "PP")}</p>
            <p><strong>Time:</strong> {parentSession.startTime} - {parentSession.endTime}</p>
            <p><strong>Status:</strong> {parentSession.status}</p>
          </div>
          <div>
            <p><strong>Total Occurrences:</strong> {parentSession.totalOccurrences}</p>
            <p><strong>Recurring Until:</strong> {format(new Date(parentSession.recurringEndDate), "PP")}</p>
            <p><strong>Repeat on:</strong> {parentSession.selectedDays?.join(", ")}</p>
          </div>
        </div>
      </div>

      {/* Occurrences */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Session Occurrences</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {occurrences.map((occurrence) => (
              <TableRow key={occurrence.id}>
                <TableCell>{format(new Date(occurrence.date), "PP")}</TableCell>
                <TableCell>{occurrence.startTime} - {occurrence.endTime}</TableCell>
                <TableCell>
                  <Badge>{occurrence.status}</Badge>
                </TableCell>
                <TableCell>
                  {Object.keys(occurrence.attendance || {}).length} attended
                </TableCell>
                <TableCell>
                  <Button variant="ghost" onClick={() => handleViewDetails(occurrence.id)}>
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Rest of existing session details */}
      {renderSessionDetails(parentSession)}
    </div>
  );
};

