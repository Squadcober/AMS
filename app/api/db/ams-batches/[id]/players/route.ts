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

    console.log('Fetching batch with ID:', params.id);

    // First get the batch
    const batch = await db.collection('ams-batches').findOne({
      _id: new ObjectId(params.id)
    });

    if (!batch) {
      console.log('Batch not found');
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    console.log('Found batch with players:', batch.players);

    // Get the players from ams-player-data collection using string IDs
    const players = await db.collection('ams-player-data')
      .find({
        id: { $in: batch.players }
      })
      .toArray();

    console.log(`Found ${players.length} players using string IDs`);

    // If no players found with string IDs, try ObjectIds as fallback
    if (players.length === 0) {
      try {
        const playerObjectIds = batch.players
          .map(id => {
            try {
              return new ObjectId(id);
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        if (playerObjectIds.length > 0) {
          const playersById = await db.collection('ams-player-data')
            .find({
              _id: { $in: playerObjectIds }
            })
            .toArray();
          console.log(`Found ${playersById.length} players using ObjectIds`);
          
          if (playersById.length > 0) {
            return NextResponse.json({
              success: true,
              data: playersById.map(player => ({
                ...player,
                id: player._id.toString()
              }))
            });
          }
        }
      } catch (error) {
        console.error('Error trying ObjectId lookup:', error);
      }
    }

    // Format and return whatever players we found
    const formattedPlayers = players.map(player => ({
      ...player,
      id: player._id?.toString() || player.id,
      _id: player._id?.toString() || player.id
    }));

    return NextResponse.json({
      success: true,
      data: formattedPlayers
    });

  } catch (error) {
    console.error('Error fetching batch players:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch batch players' },
      { status: 500 }
    );
  }
}
