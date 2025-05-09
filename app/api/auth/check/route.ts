import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getClientPromise } from '@/lib/mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    const token = cookies().get('token')?.value;

    if (!token) {
      console.log('No token found in cookies.');
      return NextResponse.json({ user: null }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = verify(token, JWT_SECRET) as any;
      console.log('Decoded token:', decodedToken);
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return NextResponse.json({ user: null }, { status: 401 });
    }

    if (!decodedToken) {
      console.log('Decoded token is null.');
      return NextResponse.json({ user: null }, { status: 401 });
    }

    let user = null; // Initialize user to null

    if (decodedToken.role === 'owner' && decodedToken.username === 'ownerams') {
      // Handle hardcoded owner credentials
      user = {
        id: 'owner-id',
        username: 'ownerams',
        role: 'owner',
      };
      return NextResponse.json({ user });
    } else {
      const client = await getClientPromise();
      const db = client.db(process.env.MONGODB_DB);
      // Fetch user from ams-users collection
      const amsUser = await db.collection('ams-users').findOne({
        $or: [
          { username: decodedToken.username },
          { email: decodedToken.email }
        ]
      });

      if (amsUser) {
        user = {
          id: amsUser.id,
          username: amsUser.username,
          email: amsUser.email,
          role: amsUser.role,
          academyId: amsUser.academyId,
          name: amsUser.name
        };
        return NextResponse.json({ user });
      } else {
        console.log('User not found in database.');
        return NextResponse.json({ user: null }, { status: 404 });
      }
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
