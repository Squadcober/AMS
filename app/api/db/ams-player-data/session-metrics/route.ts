import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';

export async function PATCH(request: NextRequest) {
  try {
    const { playerId, sessionId, attributes, sessionRating, overall, type, date, academyId } = await request.json();

    if (!playerId || !sessionId || !attributes || !academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Update session with metrics
    await db.collection('ams-sessions').updateOne(
      { _id: sessionId, academyId },
      {
        $set: {
          [`playerMetrics.${playerId}`]: {
            ...attributes,
            sessionRating,
            overall,
            updatedAt: new Date().toISOString()
          }
        }
      }
    );

    // Add to player's performance history
    await db.collection('ams-player-data').updateOne(
      { $or: [{ _id: playerId }, { id: playerId }], academyId },
      {
        $push: {
          performanceHistory: {
            type,
            date,
            sessionId,
            attributes,
            sessionRating,
            overall
          }
        } as any
      }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating session metrics:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update metrics' 
    }, { status: 500 });
  }
}
