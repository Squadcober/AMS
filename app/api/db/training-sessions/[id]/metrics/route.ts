import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { playerId, metrics } = await request.json();
    
    if (!playerId || !metrics) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // First update the session metrics
    const sessionResult = await db.collection('ams-sessions').updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          [`playerMetrics.${playerId}`]: {
            ...metrics,
            updatedAt: new Date()
          }
        }
      }
    );

    // Then update the player's attributes and add to performance history
    const playerResult = await db.collection('ams-player-data').updateOne(
      { _id: new ObjectId(playerId) },
      {
        $set: {
          attributes: metrics.attributes,
          lastUpdated: new Date()
        },
        $push: {
          performanceHistory: {
            date: new Date(),
            sessionId: params.id,
            attributes: metrics.attributes,
            sessionRating: metrics.sessionRating,
            type: 'training'
          }
        }
      }
    );

    if (!sessionResult.matchedCount || !playerResult.matchedCount) {
      return NextResponse.json({
        success: false,
        error: 'Session or player not found'
      }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating metrics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update metrics'
    }, { status: 500 });
  }
}
