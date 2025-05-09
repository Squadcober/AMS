import { NextRequest, NextResponse } from 'next/server';
import clientPromise, { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface User {
  _id?: string;
  username: string;
  password: string;
  email: string;
  name: string;
  role: 'admin' | 'coach' | 'student';
  academyId: string;
  createdAt: string;
  status: 'active' | 'inactive';
  id: string;
  updatedAt: string;
  photoUrl?: string;
  phone?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const username = searchParams.get('username');

    console.log('Fetching user with:', { userId, username });

    if (!userId && !username) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID or username is required' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    const query = userId ? { id: userId } : { username: username };
    
    console.log('Database query:', query);

    const user = await db.collection('ams-users').findOne(query);
    console.log('Found user:', user);

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Ensure id field is present and correct
    const userData = {
      ...user,
      id: user.id || user._id.toString(),
      _id: user._id.toString()
    };

    console.log('Returning user data:', userData);

    return NextResponse.json({
      success: true,
      data: userData
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, email, name, role, academyId } = body;

    // Validate required fields
    if (!username || !password || !email || !name || !role || !academyId) {
      console.error('Missing fields:', { username, email, name, role, academyId });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Check if username or email already exists
    const existingUser = await db.collection('ams-users').findOne({
      $or: [
        { username },
        { email }
      ],
      academyId // Add academyId to check within the same academy only
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username or email already exists in this academy' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newUser = {
      ...body,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      id: `user_${Math.random().toString(36).substr(2)}_${Date.now()}`
    };

    const result = await db.collection('ams-users').insertOne(newUser);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = newUser;
    return NextResponse.json({
      success: true,
      data: userWithoutPassword
    });

  } catch (error) {
    console.error('Error in POST /api/db/ams-users:', error);
    return NextResponse.json(
      { error: 'Failed to create user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
