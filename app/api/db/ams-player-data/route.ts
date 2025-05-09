'use server'


import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { calculateOverall, calculateAveragePerformance } from '@/utils/calculations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');
    const academyId = searchParams.get('academyId');

    if (!academyId && !ids) {
      return NextResponse.json({
        success: false,
        error: 'Either academyId or player IDs are required'
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);
    let query = {};

    if (academyId) {
      // Fetch all players for academy
      query = { academyId: academyId.trim() };
    } else if (ids) {
      // Fetch specific players using both _id and userId fields
      const playerIds = ids.split(',');
      query = {
        $or: [
          { _id: { $in: playerIds.map(id => {
            try { return new ObjectId(id); } catch { return null; }
          }).filter(Boolean) } },
          { userId: { $in: playerIds } },
          { id: { $in: playerIds } }
        ]
      };
    }

    const players = await db.collection('ams-player-data')
      .find(query)
      .toArray();

    // Ensure consistent data structure
    const formattedPlayers = players.map(player => ({
      _id: player._id.toString(),
      id: player.id || player._id.toString(),
      userId: player.userId,
      username: player.username,
      name: player.name || player.username || 'Unknown Player',
      position: player.position || 'Not specified',
      photoUrl: player.photoUrl || '/default-avatar.png',
      academyId: player.academyId,
      age: player.age || null,
      attributes: player.attributes || {},
      performanceHistory: Array.isArray(player.performanceHistory) ? player.performanceHistory : [],
      trainingHistory: Array.isArray(player.trainingHistory) ? player.trainingHistory : [],
      phone: player.phone || null,
      emergencyContact: player.emergencyContact || null,
      sessionsAttended: player.sessionsAttended || 0
    }));

    return NextResponse.json({
      success: true,
      data: formattedPlayers
    });

  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch players'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { playerId, attributes, performanceHistory } = data;

    if (!playerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Player ID is required' 
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Calculate new overall and average performance
    const overall = calculateOverall(attributes, performanceHistory);
    const averagePerformance = calculateAveragePerformance(performanceHistory);

    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (attributes) {
      updateData['attributes'] = {
        ...attributes,
        overall
      };
    }

    if (performanceHistory) {
      updateData['performanceHistory'] = performanceHistory;
      updateData['averagePerformance'] = averagePerformance;
    }

    const result = await db.collection('ams-player-data').updateOne(
      { 
        $or: [
          { _id: ObjectId.isValid(playerId) ? new ObjectId(playerId) : undefined },
          { id: playerId }
        ]
      },
      { $set: updateData }
    );

    return NextResponse.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        overall,
        averagePerformance
      }
    });

  } catch (error) {
    console.error('Error updating player:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update player',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
