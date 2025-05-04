import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { sessionId, metrics } = await request.json();

    if (!sessionId || !metrics) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Update player's current attributes and add to performance history
    const result = await db.collection('ams-player-data').updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          attributes: metrics.attributes,
          lastUpdated: new Date()
        },
        $push: {
          performanceHistory: {
            sessionId,
            date: new Date(),
            attributes: metrics.attributes,
            sessionRating: metrics.sessionRating,
            type: 'training'
          }
        }
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({
        success: false,
        error: 'Player not found'
      }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating player metrics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update metrics'
    }, { status: 500 });
  }
}
