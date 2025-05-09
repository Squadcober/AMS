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

    // First try to get user info
    const userInfo = await db.collection('ams-userinfo').findOne({
      userId: params.id
    });

    // Get base user data
    const userData = await db.collection('ams-users').findOne({
      $or: [
        { _id: new ObjectId(params.id) },
        { id: params.id }
      ]
    });

    if (!userData) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Combine the data
    const combinedData = {
      ...userData,
      ...userInfo,
      userId: params.id
    };

    return NextResponse.json({
      success: true,
      data: combinedData
    });

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

    // Split updates between collections
    const userInfoUpdates = {
      bio: updates.bio,
      phone: updates.phone,
      address: updates.address,
      experience: updates.experience,
      photoUrl: updates.photoUrl,
      qualifications: updates.qualifications,
      specializations: updates.specializations,
      updatedAt: new Date()
    };

    const userUpdates = {
      name: updates.name,
      email: updates.email,
      updatedAt: new Date()
    };

    // Update ams-userinfo collection
    await db.collection('ams-userinfo').updateOne(
      { userId: params.id },
      {
        $set: userInfoUpdates,
        $setOnInsert: {
          userId: params.id,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    // Update ams-users collection
    await db.collection('ams-users').updateOne(
      { $or: [{ _id: new ObjectId(params.id) }, { id: params.id }] },
      { $set: userUpdates }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating user info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update user info'
    }, { status: 500 });
  }
}
