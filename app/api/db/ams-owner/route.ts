import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    console.log('Creating owner credentials:', { username });

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Check if the owner already exists
    const existingOwner = await db.collection('ams-owner').findOne({ username });
    if (existingOwner) {
      return NextResponse.json(
        { success: false, error: 'Owner already exists' },
        { status: 400 }
      );
    }

    // Create new owner credentials
    const ownerData = {
      id: `owner_${Date.now()}`,
      username,
      password,
      createdAt: new Date(),
    };

    await db.collection('ams-owner').insertOne(ownerData);

    return NextResponse.json({ success: true, message: 'Owner credentials created successfully' });
  } catch (error) {
    console.error('Error creating owner credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create owner credentials' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Fetch owner credentials
    const owner = await db.collection('ams-owner').findOne({ username });

    if (!owner) {
      return NextResponse.json(
        { success: false, error: 'Owner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: owner });
  } catch (error) {
    console.error('Error fetching owner credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch owner credentials' },
      { status: 500 }
    );
  }
}
