import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest) {
  try {
    const {
      playerId,
      sessionId,
      attributes,
      sessionRating,
      overall,
      type,
      date,
      academyId
    } = await request.json();

    if (!playerId || !sessionId || !attributes || !academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Update the session metrics first
    const sessionResult = await db.collection('ams-sessions').updateOne(
      { 
        _id: new ObjectId(sessionId),
        academyId: academyId 
      },
      {
        $set: {
          [`playerMetrics.${playerId}`]: {
            ...attributes,
            sessionRating,
            overall,
            updatedAt: new Date()
          }
        }
      }
    );

    // Update player's performance metrics and add to history
    const playerResult = await db.collection('ams-player-data').updateOne(
      { _id: new ObjectId(playerId) },
      {
        $set: {
          attributes,
          lastUpdated: new Date()
        },
        $push: {
          'performanceHistory': {
            $each: [{
              date: new Date(date),
              sessionId: sessionId,
              attributes,
              sessionRating,
              overall,
              type: type || 'training'
            }]
          }
        }as any
      }
    );

    if (!sessionResult.matchedCount || !playerResult.matchedCount) {
      return NextResponse.json({
        success: false,
        error: 'Session or player not found'
      }, { status: 404 });
    }

    // Also update parent session if this is an occurrence
    const session = await db.collection('ams-sessions').findOne({ 
      _id: new ObjectId(sessionId) 
    });

    if (session?.parentSessionId) {
      await db.collection('ams-sessions').updateOne(
        { _id: new ObjectId(session.parentSessionId) },
        {
          $set: {
            [`playerMetrics.${playerId}`]: {
              ...attributes,
              sessionRating,
              overall,
              updatedAt: new Date()
            }
          }
        }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Metrics updated successfully'
    });

  } catch (error) {
    console.error('Error updating session metrics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update metrics'
    }, { status: 500 });
  }
}
