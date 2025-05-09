import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

// Add these exports to mark the route as dynamic
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const academyId = request.nextUrl.searchParams.get('academyId');

    if (!sessionId || !academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    const db = await getDatabase();

    // Query players based on sessionId and academyId
    const players = await db.collection('ams-player-data')
      .find({
        sessionId: sessionId,
        academyId: academyId
      })
      .toArray();

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
