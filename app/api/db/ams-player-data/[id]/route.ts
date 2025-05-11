import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';

// Add in-memory cache
const CACHE: { [key: string]: { data: any, timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check cache first
    const cached = CACHE[params.id];
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('Returning cached player data for:', params.id);
      return NextResponse.json(cached.data);
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    const player = await db.collection('ams-player-data').findOne(
      { id: params.id }
    );

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Update cache
    CACHE[params.id] = {
      data: player,
      timestamp: now
    };

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Get current player data
    const currentPlayer = await db.collection('ams-player-data').findOne(
      { id: params.id }
    );

    if (!currentPlayer) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Calculate overall rating (sum of all attributes out of 100)
    const attributes = updates.$set?.attributes || currentPlayer.attributes || {};
    const attributeValues = [
      attributes.shooting || 0,
      attributes.pace || 0,
      attributes.positioning || 0,
      attributes.passing || 0,
      attributes.ballControl || 0,
      attributes.crossing || 0
    ];
    
    const overallRating = (attributeValues.reduce((sum, val) => sum + val, 0) / 60) * 100;

    interface Performance {
      sessionRating?: number;
      trainingPoints?: number;
      matchPoints?: number;
    }

    // Calculate average training performance (out of 10)
    const performanceHistory = currentPlayer.performanceHistory || [];
    const recentPerformances = performanceHistory.slice(-5); // Last 5 performances
    
    const averagePerformance = recentPerformances.length > 0 
      ? (recentPerformances.reduce((sum: number, perf: Performance) => {
          const sessionRating = perf.sessionRating || 0;
          const trainingPoints = perf.trainingPoints || 0;
          const matchPoints = perf.matchPoints || 0;
          return sum + ((sessionRating + trainingPoints + matchPoints) / 3);
        }, 0) / recentPerformances.length)
      : 0;

    // Add calculations to the update operation
    const updateOperation: { $set: any; $push?: any } = {
      $set: {
        ...updates.$set,
        overallRating: Math.round(overallRating * 10) / 10, // Round to 1 decimal
        averagePerformance: Math.round(averagePerformance * 10) / 10, // Round to 1 decimal
        lastUpdated: new Date()
      }
    };

    // Add any other update operations
    if (updates.$push) {
      updateOperation.$push = updates.$push;
    }

    const result = await db.collection('ams-player-data').updateOne(
      { id: params.id },
      updateOperation
    );

    if (!result.matchedCount) {
      return NextResponse.json(
        { error: 'Failed to update player' },
        { status: 500 }
      );
    }

    // Return updated player data
    const updatedPlayer = await db.collection('ams-player-data').findOne(
      { id: params.id }
    );

    return NextResponse.json(updatedPlayer);

  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const playerId = params.id;
    console.log('Updating player:', playerId);

    const updates = await request.json();
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Get existing player data first
    const existingPlayer = await db.collection('ams-player-data').findOne(
      { id: playerId }
    );

    if (!existingPlayer) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    // Remove _id from updates to avoid modification error
    const { _id, ...updateData } = updates;

    // Merge attributes carefully
    const updatedAttributes = {
      ...existingPlayer.attributes,
      ...updateData.attributes,
      lastUpdated: new Date().toISOString()
    };

    // Prepare update document
    const updateDoc = {
      ...updateData,
      attributes: updatedAttributes,
      updatedAt: new Date().toISOString()
    };

    // Update the player document
    await db.collection('ams-player-data').updateOne(
      { id: playerId },
      { $set: updateDoc }
    );

    // Always fetch the latest player data to return
    const updatedPlayer = await db.collection('ams-player-data').findOne(
      { id: playerId }
    );

    if (!updatedPlayer) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch updated player data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedPlayer,
    });

  } catch (error) {
    console.error('Error updating player data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update player data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
