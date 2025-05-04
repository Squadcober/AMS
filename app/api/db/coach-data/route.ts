import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const academyId = searchParams.get('academyId');

    if (!username || !academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username and academyId are required' 
      }, { status: 400 });
    }

    const db = await getDatabase();

    // Fetch coach data from ams-users
    const coachData = await db.collection('ams-users').findOne({
      username,
      academyId,
      role: 'coach'
    });

    if (!coachData) {
      return NextResponse.json({
        success: false,
        error: 'Coach not found'
      }, { status: 404 });
    }

    // Get coach's ratings and other info from ams-coaches
    const coachDetails = await db.collection('ams-coaches').findOne({
      userId: coachData.id
    });

    // Get coach's finished sessions count
    const sessionsCount = await db.collection('ams-sessions').countDocuments({
      coachId: coachData.id,
      status: 'Finished'
    });

    return NextResponse.json({
      success: true,
      data: {
        ...coachData,
        ...coachDetails,
        sessionsCount,
        _id: coachData._id.toString()
      }
    });

  } catch (error) {
    console.error('Error fetching coach data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch coach data'
    }, { status: 500 });
  }
}
