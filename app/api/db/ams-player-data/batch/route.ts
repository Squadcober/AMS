'use server'

import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerIds = searchParams.get('ids')?.split(',');

    if (!playerIds || playerIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No player IDs provided'
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Convert string IDs to ObjectIds where possible
    const objectIds = playerIds.map(id => {
      try {
        return new ObjectId(id);
      } catch {
        return null;
      }
    }).filter((id): id is ObjectId => id !== null);

    // Query using both string IDs and ObjectIds
    const players = await db.collection('ams-player-data')
      .find({
        $or: [
          { _id: { $in: objectIds } },
          { id: { $in: playerIds } },
          { playerId: { $in: playerIds } }
        ]
      })
      .toArray();

    console.log(`Found ${players.length} players for IDs:`, playerIds);

    return NextResponse.json({
      success: true,
      data: players.map(player => ({
        id: player._id?.toString() || player.id || player.playerId,
        name: player.name || player.username || 'Unknown Player',
        position: player.position || 'Unassigned',
        photoUrl: player.photoUrl || '/default-avatar.png',
        academyId: player.academyId
      }))
    });

  } catch (error) {
    console.error('Error fetching batch players:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch batch players'
    }, { status: 500 });
  }
}
