import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');
    const playerId = searchParams.get('playerId');

    if (!academyId) {
      return NextResponse.json({
        success: false,
        error: 'academyId is required'
      }, { status: 400 });
    }

    const db = await getDatabase();

    const query: any = {
      academyId: academyId.trim(),
    };

    if (playerId) {
      query.players = playerId;
    }

    const matches = await db.collection('ams-match-day').aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'ams-player-data',
          localField: 'players',
          foreignField: 'id',
          as: 'playerDetails'
        }
      },
      {
        $addFields: {
          result: {
            homeTeam: '$team1',
            awayTeam: '$team2',
            homeScore: { $ifNull: ['$team1Score', 0] },
            awayScore: { $ifNull: ['$team2Score', 0] },
            scorers: {
              $map: {
                input: {
                  $filter: {
                    input: '$playerStats',
                    as: 'stat',
                    cond: { $gt: ['$$stat.goals', 0] }
                  }
                },
                as: 'scorer',
                in: {
                  playerId: '$$scorer.playerId',
                  playerName: '$$scorer.playerName',
                  goals: '$$scorer.goals',
                  team: '$$scorer.team'
                }
              }
            }
          }
        }
      }
    ]).toArray();

    return NextResponse.json({
      success: true,
      data: matches
    });

  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch matches',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
