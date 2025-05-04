import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerIds = searchParams.get('ids')?.split(',');

    if (!playerIds || playerIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Player IDs are required' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Query players using both string IDs and player_* format
    const players = await db.collection('ams-player-data')
      .find({
        $or: [
          { id: { $in: playerIds } },
          { _id: { $in: playerIds } },
          { playerId: { $in: playerIds } }
        ]
      })
      .toArray();

    console.log(`Found ${players.length} players for IDs:`, playerIds);

    const formattedPlayers = players.map(player => ({
      ...player,
      id: player._id?.toString() || player.id || player.playerId,
      _id: player._id?.toString() || player.id || player.playerId,
      name: player.name || player.username || 'Unknown Player',
      position: player.position || 'Unassigned'
    }));

    return NextResponse.json({
      success: true,
      data: formattedPlayers
    });

  } catch (error) {
    console.error('Error fetching session players:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch session players'
    }, { status: 500 });
  }
}
