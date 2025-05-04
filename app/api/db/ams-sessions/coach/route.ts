import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coachId');
    const academyId = searchParams.get('academyId');

    if (!coachId || !academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    const sessions = await db.collection('ams-sessions')
      .find({
        academyId,
        $or: [
          { coachId },
          { coachId: { $in: [coachId] } }
        ],
        isDeleted: { $ne: true }
      })
      .toArray();

    // Process sessions to ensure time information
    const processedSessions = sessions.map(session => ({
      ...session,
      time: {
        start: session.time?.start || session.startTime || "09:00",
        end: session.time?.end || session.endTime || "10:00"
      },
      date: session.date || session.sessionDate,
      _id: session._id.toString()
    }));

    return NextResponse.json({
      success: true,
      data: processedSessions
    });

  } catch (error) {
    console.error('Error fetching coach sessions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch sessions'
    }, { status: 500 });
  }
}
