export interface AttendanceRecord {
  academyId: string;
  date: string;
  type: 'student' | 'coach';
  records: {
    [id: string]: {
      status: 'present' | 'absent';
      markedBy: string;
      markedAt: string;
      notes?: string;
    }
  };
}
