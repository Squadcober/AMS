import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { statistics, matchId } = data;

    if (!statistics || !matchId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const db = await getDatabase();
    
    const result = await db.collection('ams-match-day').updateOne(
      { _id: new ObjectId(matchId) },
      {
        $set: {
          statistics,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Match not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        matchId,
        statistics
      }
    });

  } catch (error) {
    console.error('Error updating match statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update match statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return NextResponse.json({
        success: false,
        error: 'Match ID is required'
      }, { status: 400 });
    }

    const db = await getDatabase();
    const match = await db.collection('ams-match-day').findOne(
      { _id: new ObjectId(matchId) },
      { projection: { statistics: 1 } }
    );

    if (!match) {
      return NextResponse.json({
        success: false,
        error: 'Match not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: match.statistics || {}
    });

  } catch (error) {
    console.error('Error fetching match statistics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch match statistics'
    }, { status: 500 });
  }
}
