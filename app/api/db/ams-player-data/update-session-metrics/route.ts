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

    // Try to update by _id (ObjectId), fallback to id (string)
    let sessionResult = await db.collection('ams-sessions').updateOne(
      { 
        _id: ObjectId.isValid(sessionId) ? new ObjectId(sessionId) : sessionId,
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

    // If not matched, try by id (string)
    if (!sessionResult.matchedCount) {
      sessionResult = await db.collection('ams-sessions').updateOne(
        { 
          id: typeof sessionId === 'string' && !ObjectId.isValid(sessionId) ? sessionId : Number(sessionId),
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
    }

    // Update player's performance metrics and add to history
    const playerResult = await db.collection('ams-player-data').updateOne(
      { id: playerId.toString() },
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
        } as any
      }
    );

    if (!sessionResult.matchedCount || !playerResult.matchedCount) {
      return NextResponse.json({
        success: false,
        error: 'Session or player not found'
      }, { status: 404 });
    }

    // Also update parent session if this is an occurrence
    let session;
    if (ObjectId.isValid(sessionId)) {
      session = await db.collection('ams-sessions').findOne({ _id: new ObjectId(sessionId) });
    } else {
      session = await db.collection('ams-sessions').findOne({ id: typeof sessionId === 'string' ? sessionId : Number(sessionId) });
    }

    if (session?.parentSessionId) {
      await db.collection('ams-sessions').updateOne(
        { id: session.parentSessionId },
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
