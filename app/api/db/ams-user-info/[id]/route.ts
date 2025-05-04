import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const userInfo = await db.collection('ams-user-info').findOne({ userId: params.id });

    if (!userInfo) {
      return NextResponse.json({
        success: false,
        error: 'User info not found'
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: userInfo });
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user info'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const result = await db.collection('ams-user-info').updateOne(
      { userId: params.id },
      { 
        $set: {
          ...updates,
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId: params.id,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    if (!result.acknowledged) {
      throw new Error('Failed to update user info');
    }

    const updatedUserInfo = await db.collection('ams-user-info').findOne({ userId: params.id });
    return NextResponse.json({ success: true, data: updatedUserInfo });

  } catch (error) {
    console.error('Error updating user info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update user info'
    }, { status: 500 });
  }
}
