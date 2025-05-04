import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { matchId, points, previousPoints } = await request.json();
    
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    
    // Update the player's match points and add to performance history
    const result = await db.collection('ams-player-data').updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          'attributes.matchPoints': points
        },
        $push: {
          performanceHistory: {
            date: new Date().toISOString(),
            type: 'match',
            matchId,
            matchPoints: points,
            previousPoints,
          }
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating match points:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update match points' },
      { status: 500 }
    );
  }
}
