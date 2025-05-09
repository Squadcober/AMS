'use server'

import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
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

    const client = await getClientPromise();
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
        }as any // Cast $push as any to avoid TypeScript type error with MongoDB driver
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
