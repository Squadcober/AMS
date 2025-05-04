import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Try finding by _id first
    let player;
    try {
      player = await db.collection('ams-player-data').findOne({
        _id: new ObjectId(params.id)
      });
    } catch {
      // If ObjectId conversion fails, try finding by string id
      player = await db.collection('ams-player-data').findOne({
        id: params.id
      });
    }

    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    // Format the response
    const formattedPlayer = {
      ...player,
      id: player._id.toString(),
      _id: player._id.toString(),
      performanceHistory: (player.performanceHistory || []).sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    };

    return NextResponse.json({ success: true, data: formattedPlayer });
  } catch (error) {
    console.error('Error fetching player details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch player details' },
      { status: 500 }
    );
  }
}
