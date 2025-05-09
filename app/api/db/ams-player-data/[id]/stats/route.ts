'use server'

import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { matchId, stats } = await request.json();
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

    // Update attributes
    const result = await db.collection('ams-player-data').updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: {
          attributes: {
            ...(player.attributes || {}),
            goals: ((player.attributes?.goals || 0) + (stats.goals || 0)),
            assists: ((player.attributes?.assists || 0) + (stats.assists || 0)),
            cleanSheets: ((player.attributes?.cleanSheets || 0) + (stats.cleanSheets || 0)),
            matchPoints: stats.matchPoints?.edited || stats.matchPoints?.current || 0
          }
        },
        $push: {
          performanceHistory: {
            matchId,
            date: new Date(),
            stats,
            type: 'match'
          }
        } as any
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update player'
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating player stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update player stats'
    }, { status: 500 });
  }
}
