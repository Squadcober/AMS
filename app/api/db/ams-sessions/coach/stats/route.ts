import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coachId');

    if (!coachId) {
      return NextResponse.json({
        success: false,
        error: 'Coach ID is required'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Get total and finished sessions count
    const stats = await db.collection('ams-sessions').aggregate([
      {
        $match: {
          coachId: coachId,
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          finishedSessions: {
            $sum: {
              $cond: [
                { $eq: ["$status", "Finished"] },
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    const result = stats[0] || { totalSessions: 0, finishedSessions: 0 };

    return NextResponse.json({
      success: true,
      data: {
        totalSessions: result.totalSessions,
        finishedSessions: result.finishedSessions
      }
    });

  } catch (error) {
    console.error('Error fetching coach stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch coach statistics'
    }, { status: 500 });
  }
}
