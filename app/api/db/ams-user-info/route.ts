import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, ...rest } = data;

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Update or create user info document
    const result = await db.collection('ams-user-info').updateOne(
      { userId },
      { 
        $set: {
          ...rest,
          updatedAt: new Date().toISOString()
        },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
          certificates: [],
          specializations: []
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('GET request received for userId:', userId);

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    const userInfo = await db.collection('ams-user-info').findOne({ userId });
    console.log('Found user info:', userInfo);

    const response = {
      success: true,
      data: userInfo || {
        userId,
        bio: "",
        address: "",
        phone: "",
        experience: "",
        photoUrl: "",
        socialLinks: {
          twitter: "",
          linkedin: "",
          website: ""
        },
        certificates: [],
        specializations: []
      }
    };
    console.log('Sending response:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in GET route:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user info'
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...updateFields } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const result = await db.collection('ams-user-info').updateOne(
      { userId },
      {
        $set: {
          ...updateFields,
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
      message: 'User info updated successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error updating user info:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user info' },
      { status: 500 }
    );
  }
}
