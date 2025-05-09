'use server'

import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const { playerId, status } = data;

    if (!playerId) {
      return NextResponse.json({
        success: false,
        error: 'Player ID is required'
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Update the session's attendance
    const result = await db.collection('ams-sessions').updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          [`attendance.${playerId}`]: {
            status: status ? 'Present' : 'Absent',
            updatedAt: new Date()
          }
        }
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating attendance:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update attendance'
    }, { status: 500 });
  }
}
