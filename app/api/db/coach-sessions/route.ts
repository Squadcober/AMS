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
        $or: [
          { coachId }, 
          { coachIds: coachId }
        ],
        academyId,
        isDeleted: { $ne: true }
      })
      .sort({ date: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Error fetching coach sessions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch sessions'
    }, { status: 500 });
  }
}
