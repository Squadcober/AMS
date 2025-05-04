import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const result = await db.collection('ams-drills').updateOne(
      { _id: new ObjectId(params.id) },
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
        error: 'Drill not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating drill:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update drill' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const result = await db.collection('ams-drills').updateOne(
      { _id: new ObjectId(params.id) },
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
        error: 'Drill not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting drill:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete drill' 
    }, { status: 500 });
  }
}
