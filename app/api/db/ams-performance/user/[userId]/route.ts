import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Get player data
    const playerData = await db.collection('ams-player-data')
      .findOne({ userId: params.userId });

    if (!playerData) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get player's sessions
    const sessions = await db.collection('ams-sessions')
      .find({
        assignedPlayers: playerData.id,
        status: 'Finished'
      })
      .sort({ date: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      player: playerData,
      sessions: sessions
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}
