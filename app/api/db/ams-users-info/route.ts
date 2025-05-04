import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    const userInfo = await db.collection('ams-users-info').findOne({ userId });

    return NextResponse.json({
      success: true,
      data: userInfo || {}
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user info'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, academyId, ...rest } = data;

    if (!userId || !academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID and Academy ID are required' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('ams-users-info').updateOne(
      { userId, academyId },
      { 
        $set: {
          ...rest,
          updatedAt: new Date().toISOString()
        },
        $setOnInsert: {
          createdAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error updating user info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update user info'
    }, { status: 500 });
  }
}
