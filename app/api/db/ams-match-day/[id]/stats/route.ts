import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { playerStats } = await request.json();
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);
    
    const result = await db.collection('ams-match-day').updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: {
          playerStats,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating match stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update match stats'
    }, { status: 500 });
  }
}
