import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Error handling utility
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const db = await getDatabase();

    // Build query based on ID type
    const query = ObjectId.isValid(id) 
      ? { _id: new ObjectId(id) }
      : { id: id };

    const batch = await db.collection('ams-batches').findOne(query);

    if (!batch) {
      return NextResponse.json({
        success: false,
        error: 'Batch not found'
      }, { status: 404 });
    }

    if (!batch.players || !Array.isArray(batch.players)) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Convert string IDs to ObjectIds where possible
    const playerObjectIds = batch.players
      .map((id: string) => {
        try {
          return new ObjectId(id);
        } catch {
          return id; // Keep original if not valid ObjectId
        }
      });

    // Find all players in batch
    const players = await db.collection('ams-player-data')
      .find({
        $or: [
          { _id: { $in: playerObjectIds.filter((id: string | ObjectId) => id instanceof ObjectId) } },
          { id: { $in: playerObjectIds.filter((id: string | ObjectId) => typeof id === 'string') } }
        ]
      })
      .toArray();

    // Format response data
    const formattedPlayers = players.map(player => ({
      ...player,
      _id: player._id.toString(),
      id: player.id || player._id.toString(),
      name: player.name || player.username || 'Unknown Player'
    }));

    return NextResponse.json({
      success: true,
      data: formattedPlayers
    });

  } catch (error) {
    console.error('Error fetching batch players:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch batch players',
      details: getErrorMessage(error)
    }, { status: 500 });
  }
}
