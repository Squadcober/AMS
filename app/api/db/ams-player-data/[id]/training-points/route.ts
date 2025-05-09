'use server'

import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { points, drillId, previousPoints } = await request.json();
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // First get current player data
    const player = await db.collection('ams-player-data').findOne({
      _id: new ObjectId(params.id)
    });

    if (!player) {
      return NextResponse.json({ 
        success: false, 
        error: 'Player not found' 
      }, { status: 404 });
    }

    // Create history entry
    const historyEntry = {
      date: new Date(),
      type: 'drill_training',
      drillId,
      previousPoints,
      newPoints: points,
      difference: points - (previousPoints || 0),
    };

    // Update player document
    const result = await db.collection('ams-player-data').updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          'attributes.trainingPoints': points,
          'attributes.lastUpdated': new Date()
        },
        $push: {
          performanceHistory: historyEntry
        } as any // Cast $push as any to avoid TypeScript type error with MongoDB driver
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Failed to update player');
    }

    // Get updated player data
    const updatedPlayer = await db.collection('ams-player-data').findOne({
      _id: new ObjectId(params.id)
    });

    return NextResponse.json({
      success: true,
      data: updatedPlayer
    });

  } catch (error) {
    console.error('Error updating training points:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update training points'
    }, { status: 500 });
  }
}
