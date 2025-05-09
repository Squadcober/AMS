import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const db = await getDatabase();
    const { username } = params;

    // First get the player data
    const player = await db.collection('ams-player-data').findOne({ 
      username,
      isDeleted: { $ne: true }
    });

    if (!player) {
      return NextResponse.json({
        success: false,
        error: 'Player not found'
      }, { status: 404 });
    }

    // Format performance data
    const performanceData = {
      attributes: player.attributes || {},
      performanceHistory: player.performanceHistory || [],
      trainingHistory: player.trainingHistory || [],
      stats: {
        sessionsAttended: player.sessionsAttended || 0,
        matchesPlayed: player.matchesPlayed || 0,
        averageRating: calculateAverageRating(player.performanceHistory),
        trainingCompletion: calculateTrainingCompletion(player.trainingHistory)
      }
    };

    return NextResponse.json({
      success: true,
      data: performanceData
    });

  } catch (error) {
    console.error('Error fetching player performance:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch player performance data'
    }, { status: 500 });
  }
}

// Helper functions
function calculateAverageRating(history: any[] = []): number {
  if (!history.length) return 0;
  const ratings = history
    .filter(entry => typeof entry.rating === 'number')
    .map(entry => entry.rating);
  return ratings.length ? 
    ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
}

function calculateTrainingCompletion(history: any[] = []): number {
  if (!history.length) return 0;
  const completed = history.filter(entry => entry.status === 'completed').length;
  return (completed / history.length) * 100;
}
