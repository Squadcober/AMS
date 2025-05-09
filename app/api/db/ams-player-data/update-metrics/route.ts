'use server'


import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest) {
  try {
    const { playerId, sessionId, metrics } = await request.json();

    if (!playerId || !metrics) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Calculate overall rating based on attributes
    const overallRating = Object.values(metrics.attributes as Record<string, number>).reduce((sum, val) => sum + val, 0) / 6;

    // Update player document
    const result = await db.collection('ams-player-data').updateOne(
      { _id: new ObjectId(playerId) },
      {
        $set: {
          attributes: metrics.attributes,
          overallRating: Number(overallRating.toFixed(1))
        },
        $push: {
          performanceHistory: {
            date: new Date(),
            sessionId: sessionId,
            attributes: metrics.attributes,
            sessionRating: metrics.sessionRating,
            type: 'training'
          }
        }as any,
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
