"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Sidebar from "@/components/Sidebar"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, compareAsc, isAfter } from "date-fns"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ScheduleEvent {
  date: string
  title: string
  type: 'session' | 'match'
  startTime: string
  endTime: string
  description?: string
  venue?: string
  opponent?: string
}

const renderEventDetailContent = (event: any) => {
  return (
    <div className="space-y-4">
      <div className={cn(
        "p-4 rounded-lg",
        event.type === 'session' ? "bg-blue-500/10 border-blue-500/20" : "bg-red-500/10 border-red-500/20",
        "border"
      )}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className={cn(
              "text-xl font-bold mb-1",
              event.type === 'session' ? "text-blue-500" : "text-red-500"
            )}>
              {event.title}
            </h3>
            <span className={cn(
              "px-2 py-1 rounded-full text-xs",
              event.type === 'session' ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
            )}>
              {event.type.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-muted-foreground text-right">
            <div className="font-medium">{event.startTime} - {event.endTime}</div>
          </div>
        </div>

        {event.type === 'match' && (
          <div className="space-y-2 mt-4 text-sm">
            {event.opponent && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Opponent:</span>
                <span>{event.opponent}</span>
              </div>
            )}
            {event.venue && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Venue:</span>
                <span>{event.venue}</span>
              </div>
            )}
            {event.status && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">Status:</span>
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs",
                  event.status === 'Upcoming' ? "bg-blue-500/20 text-blue-400" :
                  event.status === 'On-going' ? "bg-green-500/20 text-green-400" :
                  "bg-gray-500/20 text-gray-400"
                )}>
                  {event.status}
                </span>
              </div>
            )}
          </div>
        )}

        {event.type === 'session' && (
          <div className="space-y-2 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-muted-foreground">Type:</span>
              <span>Training Session</span>
            </div>
            {event.description && (
              <div className="flex flex-col gap-1">
                <span className="font-medium text-muted-foreground">Description:</span>
                <p className="text-sm leading-relaxed">{event.description}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Schedule() {
  const { user } = useAuth()
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        if (!user?.academyId) {
          setError("Academy ID not found");
          setLoading(false);
          return;
        }

        console.log('Fetching schedule data for academy:', user.academyId);

        // Fetch sessions and matches
        const [sessionsRes, matchesRes] = await Promise.all([
          fetch(`/api/db/ams-sessions?academyId=${user.academyId}`),
          fetch(`/api/db/ams-match-day?academyId=${user.academyId}`)
        ]);

        const [sessionsData, matchesData] = await Promise.all([
          sessionsRes.json(),
          matchesRes.json()
        ]);

        console.log('Matches data:', matchesData);
        console.log('Sessions data:', sessionsData);

        // Format and combine all events
        const formattedEvents = [
          ...(sessionsData.data || []).map((session: any) => ({
            date: session.date,
            title: session.name || 'Training Session',
            type: 'session',
            startTime: session.startTime || '00:00',
            endTime: session.endTime || '00:00',
            description: session.description || '',
          })),
          ...(matchesData.data || []).map((match: any) => ({
            date: match.date,
            title: `Match: ${match.name || `vs ${match.opponent || 'TBD'}`}`,
            type: 'match',
            startTime: match.startTime,
            endTime: match.endTime,
            description: match.description || '',
            venue: match.venue,
            opponent: match.opponent,
            status: match.status
          }))
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        console.log('Formatted events:', formattedEvents);
        setEvents(formattedEvents);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching schedule data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load schedule');
        setLoading(false);
      }
    };

    fetchScheduleData();
  }, [user?.academyId]);

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const getDayEvents = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return events.filter(event => event.date === formattedDate);
  };

  const getUpcomingEvents = (type: 'session' | 'match', limit: number = 3) => {
    const now = new Date();
    return events
      .filter(event => {
        const eventDate = new Date(`${event.date}T${event.startTime}`);
        return event.type === type && isAfter(eventDate, now);
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.startTime}`);
        const dateB = new Date(`${b.date}T${b.startTime}`);
        return compareAsc(dateA, dateB);
      })
      .slice(0, limit);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  const renderDayContent = (day: Date) => {
    const dayEvents = getDayEvents(day);
    const isToday = isSameDay(day, new Date());

    return (
      <div 
        className="h-full flex flex-col cursor-pointer"
        onClick={() => handleDateClick(day)}
      >
        <span className={cn(
          "text-sm font-semibold",
          isToday && "text-primary"
        )}>
          {format(day, 'd')}
        </span>
        <div className="mt-1 space-y-1 flex-1">
          {dayEvents.map((event, idx) => (
            <div
              key={idx}
              className={cn(
                "text-xs p-1.5 rounded-md",
                event.type === 'session' && "bg-blue-500/20 text-blue-500",
                event.type === 'match' && "bg-red-500/20 text-red-500"
              )}
            >
              <div className="font-medium">{event.title}</div>
              <div className="text-[10px] opacity-80">
                {`${event.startTime} - ${event.endTime}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUpcomingEvent = (event: ScheduleEvent) => (
    <Card key={`${event.date}-${event.title}`} className="bg-accent/50">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg">{event.title}</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(event.date), 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {event.startTime} - {event.endTime}
          </div>
        </div>
        {event.type === 'match' && (
          <div className="mt-2 text-sm">
            {event.venue && <p>Venue: {event.venue}</p>}
            {event.opponent && <p>Opponent: {event.opponent}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col space-y-6 p-8 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Schedule</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button variant="outline" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="flex-1 p-4">
          <div className="grid grid-cols-7 gap-px bg-muted rounded-lg h-full">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center font-semibold">
                {day}
              </div>
            ))}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 bg-background" />
            ))}
            {days.map((day) => (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[120px] p-2 bg-background transition-colors hover:bg-accent",
                  !isSameMonth(day, currentDate) && "opacity-50",
                  "overflow-y-auto"
                )}
              >
                {renderDayContent(day)}
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Upcoming Sessions</h2>
            <div className="space-y-4">
              {getUpcomingEvents('session').map((event) => renderUpcomingEvent(event))}
              {getUpcomingEvents('session').length === 0 && (
                <p className="text-muted-foreground">No upcoming sessions</p>
              )}
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold mb-4">Upcoming Matches</h2>
            <div className="space-y-4">
              {getUpcomingEvents('match').map((event) => renderUpcomingEvent(event))}
              {getUpcomingEvents('match').length === 0 && (
                <p className="text-muted-foreground">No upcoming matches</p>
              )}
            </div>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Details</DialogTitle>
            </DialogHeader>
            {selectedDate && (
              <div className="space-y-4">
                <div className="text-lg font-semibold mb-4">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </div>
                {getDayEvents(selectedDate).length > 0 ? (
                  getDayEvents(selectedDate).map((event, idx) => (
                    <div key={idx}>
                      {renderEventDetailContent(event)}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No events scheduled for this date
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}