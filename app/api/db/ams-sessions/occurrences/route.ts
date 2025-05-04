import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const academyId = searchParams.get('academyId');
    const status = searchParams.get('status');

    if (!parentId || !academyId) {
      return NextResponse.json({
        success: false,
        error: 'parentId and academyId are required',
      }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Base query with parent session lookup
    const pipeline = [
      {
        $match: {
          parentSessionId: Number(parentId),
          academyId: academyId.trim(),
          ...(status && { status })
        }
      },
      {
        $lookup: {
          from: 'ams-player-data',
          localField: 'assignedPlayers',
          foreignField: 'id',
          as: 'assignedPlayersData'
        }
      },
      {
        $addFields: {
          id: { $toString: '$_id' },
          assignedPlayersData: {
            $map: {
              input: '$assignedPlayersData',
              as: 'player',
              in: {
                id: '$$player.id',
                name: { $ifNull: ['$$player.name', '$$player.username', 'Unknown Player'] },
                position: { $ifNull: ['$$player.position', 'Not specified'] }
              }
            }
          }
        }
      }
    ];

    const occurrences = await db.collection('ams-sessions')
      .aggregate(pipeline)
      .toArray();

    console.log(`Found ${occurrences.length} occurrences for parent ${parentId}`);

    return NextResponse.json({
      success: true,
      data: Array.isArray(occurrences) ? occurrences : []
    });
  } catch (error) {
    console.error('Error fetching occurrences:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch occurrences',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
