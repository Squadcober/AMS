import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const academyId = searchParams.get('academyId');

    if (!userId || !academyId) {
      return NextResponse.json({
        success: false,
        error: 'User ID and Academy ID are required',
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Fetch player data
    const playerData = await db.collection('ams-player-data').findOne({
      userId,
      academyId,
      isDeleted: { $ne: true },
    });

    // Fetch academy data
    const academyData = await db.collection('ams-academy').findOne({
      id: academyId,
    });

    if (!playerData && !academyData) {
      return NextResponse.json({
        success: false,
        error: 'No data found for the given User ID and Academy ID',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        player: playerData || null,
        academy: academyData || null,
      },
    });
  } catch (error) {
    console.error('Error fetching student data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch student data',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
