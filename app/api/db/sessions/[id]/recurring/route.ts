import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const parentId = params.id;
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');

    if (!parentId || !academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    const db = await getDatabase();
    const occurrences = await db.collection('ams-sessions')
      .find({
        parentSessionId: parentId,
        academyId,
        isOccurrence: true,
        isDeleted: { $ne: true }
      })
      .sort({ date: 1, startTime: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: occurrences.map(occurrence => ({
        ...occurrence,
        _id: occurrence._id.toString()
      }))
    });

  } catch (error) {
    console.error('Error fetching recurring sessions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch recurring sessions'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const parentId = params.id;
    const updates = await request.json();
    const { academyId } = updates;

    if (!parentId || !academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('ams-sessions').updateMany(
      {
        parentSessionId: parentId,
        academyId,
        isOccurrence: true
      },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error updating recurring sessions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update recurring sessions'
    }, { status: 500 });
  }
}
