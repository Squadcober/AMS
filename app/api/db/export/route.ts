import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');
    const collection = searchParams.get('collection');

    if (!academyId) {
      return NextResponse.json({ error: 'Academy ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    let data;
    switch (collection) {
      case 'players':
        data = await db.collection('ams-player-data')
          .find({ academyId })
          .toArray();
        break;
      
      case 'coaches':
        // Fetch and combine coach data
        const coaches = await db.collection('ams-users')
          .find({ academyId, role: 'coach' })
          .toArray();
        
        const coachDetails = await db.collection('ams-coaches')
          .find({ academyId })
          .toArray();
        
        data = coaches.map(coach => {
          const details = coachDetails.find(d => d.userId === coach.id);
          return { ...coach, ...details };
        });
        break;
      
      case 'batches':
        data = await db.collection('ams-batches')
          .find({ academyId })
          .toArray();
        break;

      case 'finances':
        data = await db.collection('ams-finance')
          .find({ academyId })
          .toArray();
        break;

      case 'performance':
        // Fetch player performance data with details
        const players = await db.collection('ams-player-data')
          .find({ 
            academyId,
            performanceHistory: { $exists: true }
          })
          .toArray();

        data = players.flatMap(player => 
          (player.performanceHistory || []).map((ph: any) => ({
            playerId: player.id,
            playerName: player.name,
            ...ph
          }))
        );
        break;

      case 'all':
        // Fetch all collections
        const [
          allPlayers,
          allCoaches,
          allBatches,
          allFinances,
        ] = await Promise.all([
          db.collection('ams-player-data').find({ academyId }).toArray(),
          db.collection('ams-users').find({ academyId, role: 'coach' }).toArray(),
          db.collection('ams-batches').find({ academyId }).toArray(),
          db.collection('ams-finance').find({ academyId }).toArray(),
        ]);

        data = {
          players: allPlayers,
          coaches: allCoaches,
          batches: allBatches,
          finances: allFinances,
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid collection specified' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
