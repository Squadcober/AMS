export type Drill = {
  academyId: string
  id: string;
  name: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  assignedPlayers: { id: string; name: string }[];
  coachId: string;
  coachName: string;
  isRecurring: boolean;
  recurringEndDate?: string;
  selectedDays?: string[];
  totalOccurrences?: number;
  status: "Finished" | "On-going" | "Upcoming";
  playersAssigned: string[];
  attendance?: {
    [playerId: string]: {
      status: "Present" | "Absent";
      markedAt: string;
      markedBy: string;
    };
  };
  playerRatings?: { [playerId: string]: number };
};