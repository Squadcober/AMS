import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    const { playerId, attributes, sessionRating } = data;

    if (!playerId) {
      return NextResponse.json({
        success: false,
        error: 'Player ID is required'
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Update player attributes and add to performance history
    const result = await db.collection('ams-player-data').updateOne(
      { _id: new ObjectId(playerId) },
      {
        $set: {
          attributes,
          lastUpdated: new Date()
        },
        $push: {
          performanceHistory: {
            date: new Date(),
            attributes,
            sessionRating,
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
