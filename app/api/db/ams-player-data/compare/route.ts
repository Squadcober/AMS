import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerIds = searchParams.get('ids')?.split(',');
    const academyId = searchParams.get('academyId');

    if (!playerIds || !academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    const db = await getDatabase();
    const players = await db.collection('ams-player-data')
      .find({
        _id: { $in: playerIds.map(id => new ObjectId(id)) },
        academyId,
        isDeleted: { $ne: true }
      })
      .toArray();

    return NextResponse.json({
      success: true,
      data: players.map(player => ({
        ...player,
        performanceHistory: player.performanceHistory?.slice(-5) // Only return last 5 performances
      }))
    });
  } catch (error) {
    console.error('Error comparing players:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to compare players'
    }, { status: 500 });
  }
}
