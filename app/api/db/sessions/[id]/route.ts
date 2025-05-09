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
      return NextResponse.json(cached.data);
    }
    
    const db = await getDatabase();
    let session;

    if (ObjectId.isValid(id)) {
      session = await db.collection('ams-sessions').findOne({
        _id: new ObjectId(id)
      });
    } else {
      session = await db.collection('ams-sessions').findOne({
        id: parseInt(id)
      });
    }

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 });
    }

    const responseData = {
      success: true,
      data: {
        ...session,
        _id: session._id.toString(),
        attendance: session.attendance || {},
        playerMetrics: session.playerMetrics || {}
      }
    };

    // Update cache
    CACHE[id] = {
      data: responseData,
      timestamp: now
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch session'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const updates = await request.json();
    const db = await getDatabase();

    const result = await db.collection('ams-sessions').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 });
    }

    // Clear cache
    delete CACHE[id];

    return NextResponse.json({
      success: true,
      data: { modifiedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update session'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const db = await getDatabase();

    const result = await db.collection('ams-sessions').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          isDeleted: true,
          deletedAt: new Date()
        }
      }
    );

    if (!result.matchedCount) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 });
    }

    // Clear cache
    delete CACHE[id];

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete session'
    }, { status: 500 });
  }
}
