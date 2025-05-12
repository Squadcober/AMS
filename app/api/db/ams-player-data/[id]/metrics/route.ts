import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Import ObjectId from mongodb
    const { ObjectId } = require('mongodb');
    let objectId: any = undefined;
    try {
      objectId = new ObjectId(params.id);
    } catch (e) {
      objectId = undefined;
    }

    const player = await db.collection('ams-player-data').findOne({ 
      $or: [
        objectId ? { _id: objectId } : {},
        { id: params.id }
      ]
    });

    if (!player) {
      return NextResponse.json({ 
        success: false, 
        error: 'Player not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        attributes: player.attributes || {},
        performanceHistory: player.performanceHistory || []
      }
    });

  } catch (error) {
    console.error('Error fetching player metrics:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch player metrics' 
    }, { status: 500 });
  }
}
