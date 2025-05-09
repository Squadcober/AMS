import type { Session } from '@/types/session';

const LOCAL_STORAGE_KEY = "ams-sessions"
const USER_CREATED_SESSIONS_KEY = "user-created-sessions"

export class SessionManager {
  private static cachedSessions: any[] | null = null;

  static getCache() {
    return this.cachedSessions;
  }

  static setCache(sessions: any[]) {
    this.cachedSessions = sessions;
  }
  
  static async getSessions(academyId: string): Promise<Session[]> {
    try {
      const response = await fetch(
        `/api/db/session-management?action=getSessions&academyId=${encodeURIComponent(academyId)}`
      );
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }

  static async addSession(newSession: Session): Promise<Session | null> {
    try {
      const response = await fetch('/api/db/session-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addSession',
          ...newSession
        })
      });
      if (!response.ok) throw new Error('Failed to add session');
      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error adding session:', error);
      return null;
    }
  }

  static async removeSessions(sessionIds: string[], academyId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/db/session-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeSessions',
          sessionIds,
          academyId
        })
      });
      if (!response.ok) throw new Error('Failed to remove sessions');
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error removing sessions:', error);
      return false;
    }
  }

  static async updateSessionStatus(academyId: string): Promise<Session[]> {
    try {
      if (!academyId) {
        console.error('No academyId provided to updateSessionStatus');
        return [];
      }

      const sessions = await this.getSessions(academyId);
      if (!Array.isArray(sessions)) {
        console.error('Invalid sessions data received:', sessions);
        return [];
      }

      const now = new Date();
      const updatedSessions = sessions.map(session => {
        if (session.isRecurring) {
          // Handle recurring sessions
          const startDate = new Date(session.date);
          const endDate = new Date(session.recurringEndDate || "");
          const selectedDays = session.selectedDays || [];
          let status: Session["status"] = "Upcoming";

          // Calculate status based on recurring pattern
          // ... existing recurring session status logic ...

          return { ...session, status };
        } else {
          // Handle single sessions
          const sessionDate = new Date(session.date);
          const [startHour, startMinute] = session.startTime.split(':').map(Number);
          const [endHour, endMinute] = session.endTime.split(':').map(Number);

          const sessionStart = new Date(sessionDate);
          const sessionEnd = new Date(sessionDate);

          sessionStart.setHours(startHour || 0, startMinute || 0, 0);
          sessionEnd.setHours(endHour || 0, endMinute || 0, 0);

          let status: Session["status"];
          if (now < sessionStart) {
            status = "Upcoming";
          } else if (now >= sessionStart && now <= sessionEnd) {
            status = "On-going";
          } else {
            status = "Finished";
          }

          return { ...session, status };
        }
      });

      try {
        // Update via API
        await fetch('/api/db/session-management', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateStatus',
            sessions: updatedSessions
          })
        });
      } catch (error) {
        console.error('Failed to persist status updates:', error);
        // Continue with returning updated sessions even if persistence fails
      }

      return updatedSessions;
    } catch (error) {
      console.error('Error in updateSessionStatus:', error);
      return [];
    }
  }

  static async updatePlayerMetrics(
    sessionId: string, 
    playerId: string, 
    metrics: {
      shooting?: number;
      pace?: number;
      positioning?: number;
      passing?: number;
      ballControl?: number;
      crossing?: number;
      sessionRating?: number;
    }
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/db/session-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePlayerMetrics',
          sessionId,
          playerId,
          metrics
        })
      });
      if (!response.ok) throw new Error('Failed to update player metrics');
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error updating player metrics:', error);
      return false;
    }
  }

  static async getSessionsByUserId(userId: string, academyId: string): Promise<Session[]> {
    try {
      const response = await fetch(
        `/api/db/session-management?action=getSessionsByUserId&userId=${encodeURIComponent(userId)}&academyId=${encodeURIComponent(academyId)}`
      );
      if (!response.ok) throw new Error('Failed to fetch user sessions');
      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }

  static async getCoachSessions(coachId: string, academyId: string): Promise<Session[]> {
    try {
      const response = await fetch(
        `/api/db/ams-sessions?coachId=${encodeURIComponent(coachId)}&academyId=${encodeURIComponent(academyId)}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error fetching coach sessions:', error);
      return [];
    }
  }

  static async updateCoachSessionStatus(coachId: string, academyId: string): Promise<Session[]> {
    try {
      const sessions = await this.getCoachSessions(coachId, academyId);
      if (!Array.isArray(sessions)) return [];

      const now = new Date();
      return sessions.map(session => {
        const sessionDate = new Date(session.date);
        const [startHour, startMinute] = session.startTime.split(':').map(Number);
        const [endHour, endMinute] = session.endTime.split(':').map(Number);

        const sessionStart = new Date(sessionDate);
        const sessionEnd = new Date(sessionDate);

        sessionStart.setHours(startHour || 0, startMinute || 0, 0);
        sessionEnd.setHours(endHour || 0, endMinute || 0, 0);

        let status: Session["status"];
        if (now < sessionStart) {
          status = "Upcoming";
        } else if (now >= sessionStart && now <= sessionEnd) {
          status = "On-going";
        } else {
          status = "Finished";
        }

        return { ...session, status };
      });
    } catch (error) {
      console.error('Error updating coach session status:', error);
      return [];
    }
  }
}