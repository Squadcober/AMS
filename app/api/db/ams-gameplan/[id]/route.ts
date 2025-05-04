import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const gameplan = await db.collection('ams-gameplan').findOne({
      _id: new ObjectId(params.id)
    });

    if (!gameplan) {
      return NextResponse.json({
        success: false,
        error: 'Gameplan not found'
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: gameplan });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch gameplan'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const db = await getDatabase();

    const result = await db.collection('ams-gameplan').updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: {
          ...data,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Gameplan not found'
      }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to update gameplan'
    }, { status: 500 });
  }
}
