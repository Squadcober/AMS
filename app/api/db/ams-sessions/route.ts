'use server'

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Add these exports for dynamic API routes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');

    console.log('API: Received request for academyId:', academyId);

    if (!academyId || academyId.trim() === '') {
      console.error('API: Missing or empty academyId');
      return NextResponse.json({ 
        success: false, 
        error: 'academyId is required',
        details: 'A valid academyId must be provided'
      }, { status: 400 });
    }

    const db = await getDatabase();
    
    const sessions = await db.collection('ams-sessions')
      .find({ 
        academyId: academyId.trim(),
        isDeleted: { $ne: true } 
      })
      .toArray();

    // Map attendance data from the embedded structure
    const sessionsWithFormattedAttendance = sessions.map(session => ({
      ...session,
      attendance: session.attendance || {}
    }));

    console.log(`API: Found ${sessions.length} sessions for academy ${academyId}`);

    return NextResponse.json({
      success: true,
      data: sessionsWithFormattedAttendance,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'academyId is required' 
      }, { status: 400 });
    }

    const db = await getDatabase();

    // Add creation timestamp
    const sessionData = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection('ams-sessions').insertOne(sessionData);

    // Return created session with id
    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        ...sessionData
      }
    });

  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { sessionIds, academyId } = await request.json();

    if (!sessionIds?.length || !academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing sessionIds or academyId'
      }, { status: 400 });
    }

    const db = await getDatabase();

    // Separate valid ObjectIds and string ids
    const objectIds = sessionIds
      .map((id: string) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Also support deletion by 'id' field (number or string)
    const stringIds = sessionIds.filter((id: string) => typeof id === 'string' || typeof id === 'number');

    // Build query to match either _id or id
    const query: any = {
      academyId
    };
    const orConditions = [];
    if (objectIds.length > 0) {
      orConditions.push({ _id: { $in: objectIds } });
    }
    if (stringIds.length > 0) {
      orConditions.push({ id: { $in: stringIds } });
    }
    if (orConditions.length > 0) {
      query["$or"] = orConditions;
    }

    const result = await db.collection('ams-sessions').deleteMany(query);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error deleting sessions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
