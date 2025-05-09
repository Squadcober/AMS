'use server'

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Add cache at the top of file
const CACHE: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log('API: Fetching session with ID:', id);

    // Check cache first
    const now = Date.now();
    const cached = CACHE[id];
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('API: Returning cached session data');
      return NextResponse.json(cached.data);
    }
    
    const db = await getDatabase();
    let session;

    // Handle ObjectId or composite ID formats
    if (ObjectId.isValid(id)) {
      session = await db.collection('ams-sessions').findOne({
        _id: new ObjectId(id)
      });
    } else if (id.includes('-')) {
      // For recurring child sessions
      const targetId = id.split('-')[1]; // Get the occurrence ObjectId
      session = await db.collection('ams-sessions').findOne({
        _id: new ObjectId(targetId)
      });

      if (session) {
        // Get parent session data
        const parentSession = await db.collection('ams-sessions').findOne({
          id: parseInt(session.parentSessionId)
        });

        if (parentSession) {
          session = {
            ...session,
            parentSessionData: {
              name: parentSession.name,
              coachId: parentSession.coachId,
              coachNames: parentSession.coachNames,
              recurringEndDate: parentSession.recurringEndDate,
              selectedDays: parentSession.selectedDays,
              totalOccurrences: parentSession.totalOccurrences
            }
          };
        }
      }
    } else {
      // For regular numeric IDs
      session = await db.collection('ams-sessions').findOne({
        id: parseInt(id)
      });
    }

    if (!session) {
      console.error('API: Session not found for ID:', id);
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found'
      }, { status: 404 });
    }

    // Format assignedPlayersData
    session.assignedPlayersData = (session.assignedPlayersData || []).map((player: { _id?: ObjectId; id?: string; name?: string; username?: string; position?: string; }) => ({
      id: player._id?.toString() || player.id,
      name: player.name || player.username || 'Unknown Player',
      position: player.position || 'Not specified'
    }));

    console.log('API: Found session:', {
      _id: session._id,
      id: session.id,
      name: session.name,
      isOccurrence: session.isOccurrence,
      parentSessionId: session.parentSessionId,
      playerCount: session.assignedPlayersData?.length
    });

    // Store in cache before returning
    const responseData = {
      success: true,
      data: {
        ...session,
        id: session.id || session._id.toString(),
        _id: session._id.toString(),
        attendance: session.attendance || {},
        playerRatings: session.playerRatings || {},
        playerMetrics: session.playerMetrics || {}
      }
    };

    CACHE[id] = {
      data: responseData,
      timestamp: now
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid session ID' 
      }, { status: 400 });
    }

    const updates = await request.json();
    const db = await getDatabase();

    // Ensure attendance or metrics are updated correctly
    if (updates.playerMetrics) {
      updates.updatedAt = new Date().toISOString();
    }

    let query = {};
    try {
      query = { _id: new ObjectId(id) };
    } catch {
      query = { id: Number(id) };
    }

    // Update the session document
    const updateResult = await db.collection('ams-sessions').updateOne(
      query,
      { $set: updates }
    );

    if (!updateResult.modifiedCount) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found or no changes made' 
      }, { status: 404 });
    }

    // If playerMetrics are updated, update the player's performanceHistory
    if (updates.playerMetrics) {
      const playerMetrics = updates.playerMetrics;

      for (const [playerId, metrics] of Object.entries(playerMetrics)) {
        const performanceEntry = {
          sessionId: id,
          sessionName: updates.name || 'Unknown Session',
          date: new Date().toISOString(),
          attributes: metrics,
          rating: (metrics as { sessionRating?: number }).sessionRating || 0,
          isVerified: true,
          verifiedBy: updates.updatedBy || 'system',
          attendance: updates.attendance?.[playerId]?.status === 'Present',
        };

        // Push the performance entry to the player's performanceHistory
        const playerUpdateResult = await db.collection('ams-player-data').updateOne(
          { id: playerId },
          {
            $push: { performanceHistory: { $each: [performanceEntry] } }as any,
            $set: { 
              updatedAt: new Date().toISOString() 
            },
          }
        );

        if (!playerUpdateResult.modifiedCount) {
          console.error(`Failed to update performanceHistory for player ID: ${playerId}`);
        }
      }
    }

    // Fetch the updated session document
    const updatedSession = await db.collection('ams-sessions').findOne(query);

    return NextResponse.json({ 
      success: true,
      data: updatedSession
    });

  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid session ID' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('ams-sessions').deleteOne({
      _id: new ObjectId(id)
    });

    if (!result.deletedCount) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
