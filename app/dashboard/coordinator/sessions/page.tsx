"use client"
import loaddynamic from "next/dynamic";

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

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

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
  assignedPlayersData: { id: string, name: string, position: string, photoUrl: any }[] // Add this new property
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

export default function SessionsPage() {
  return (
    <CoachProvider>
      <SessionsContent />
    </CoachProvider>
  )
}

function SessionsContent(): JSX.Element | any {
  const { user } = useAuth();  // Add this line to get user from context
  const [sessions, setSessions] = useState<Session[]>([]); // <-- Add this line to define setSessions
  const [unsavedSessions, setUnsavedSessions] = useState<Session[]>([]); // <-- Add this line to define setUnsavedSessions

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
      const { batches } = useBatches();
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

        // Create occurrence with truly unique numeric ID
        const occurrenceId = Number(`${session.id}${Date.now()}${occurrenceCounter++}`);
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

  // ...rest of the existing code...
}
