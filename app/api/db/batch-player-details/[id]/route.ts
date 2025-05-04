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

    let player;
    try {
      player = await db.collection('ams-player-data').findOne({
        _id: new ObjectId(params.id)
      });
    } catch {
      player = await db.collection('ams-player-data').findOne({
        id: params.id
      });
    }

    if (!player) {
      return NextResponse.json({
        success: false,
        error: 'Player not found'
      }, { status: 404 });
    }

    // Format the response with all required fields
    const formattedPlayer = {
      id: player._id.toString(),
      _id: player._id.toString(),
      name: player.name,
      position: player.position,
      photoUrl: player.photoUrl,
      attributes: {
        shooting: player.attributes?.shooting || 0,
        pace: player.attributes?.pace || 0,
        positioning: player.attributes?.positioning || 0,
        passing: player.attributes?.passing || 0,
        ballControl: player.attributes?.ballControl || 0,
        crossing: player.attributes?.crossing || 0
      },
      overallRating: player.overallRating || 0,
      averagePerformance: player.averagePerformance || 0,
      performanceHistory: (player.performanceHistory || [])
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
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
