import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    const player = await db.collection('ams-player-data').findOne({
      $or: [
        { _id: new ObjectId(params.id) },
        { id: params.id }
      ]
    });

    if (!player) {
      return NextResponse.json({
        success: false,
        error: 'Player not found'
      }, { status: 404 });
    }

    // Format the response data
    const formattedPlayer = {
      ...player,
      id: player._id.toString(),
      _id: player._id.toString(),
      // Sort performance history by date descending
      performanceHistory: (player.performanceHistory || [])
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };

    return NextResponse.json({
      success: true,
      data: formattedPlayer
    });

  } catch (error) {
    console.error('Error fetching player details:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch player details'
    }, { status: 500 });
  }
}
