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

    // Fetch user settings from both collections
    const [userBasic, userInfo] = await Promise.all([
      db.collection('ams-users').findOne({ _id: new ObjectId(params.id) }),
      db.collection('ams-user-info').findOne({ userId: params.id })
    ]);

    if (!userBasic) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...userBasic,
        ...userInfo
      }
    });

  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    );
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

    // Split updates between basic user info and extended info
    const { name, email, role, ...extendedInfo } = updates;

    // Update basic user info
    const basicResult = await db.collection('ams-users').updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: { 
          name,
          email,
          role,
          updatedAt: new Date()
        } 
      }
    );

    // Update or insert extended user info
    const infoResult = await db.collection('ams-user-info').updateOne(
      { userId: params.id },
      { 
        $set: {
          ...extendedInfo,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    if (basicResult.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch and return updated user data
    const [updatedBasic, updatedInfo] = await Promise.all([
      db.collection('ams-users').findOne({ _id: new ObjectId(params.id) }),
      db.collection('ams-user-info').findOne({ userId: params.id })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...updatedBasic,
        ...updatedInfo
      }
    });

  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update user settings' },
      { status: 500 }
    );
  }
}
