'use server'

import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      playerId, 
      sessionId, 
      attributes, 
      sessionRating, 
      overall,
      type,
      date,
      academyId 
    } = body;

    if (!playerId || !sessionId || !attributes || !academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Create the performance history entry
    const performanceEntry = {
      date: new Date(date),
      sessionId,
      attributes,
      sessionRating,
      overall,
      type,
      updatedAt: new Date(),
    };

    // Update player document with new attributes and add to performance history
    const result = await db.collection('ams-player-data').updateOne(
      { 
        _id: new ObjectId(playerId),
        academyId // Ensure we're updating the correct academy's player
      },
      {
        $set: {
          attributes, // Update current attributes
          overallRating: overall,
          lastUpdated: new Date()
        },
        $push: {
          'performanceHistory': { $each: [performanceEntry] }
        }as any,
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({
        success: false,
        error: 'Player not found'
      }, { status: 404 });
    }

    // Get the updated player document
    const updatedPlayer = await db.collection('ams-player-data').findOne({
      _id: new ObjectId(playerId)
    });

    return NextResponse.json({ 
      success: true,
      data: updatedPlayer
    });

  } catch (error) {
    console.error('Error updating player metrics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update player metrics'
    }, { status: 500 });
  }
}
