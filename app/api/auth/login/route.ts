import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { sign } from "jsonwebtoken";
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required" },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle owner login
    if (username === 'ownerams' && password === 'pass5key') {
      const token = sign({ username, role: 'owner' }, JWT_SECRET);
      cookies().set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });

      return NextResponse.json({
        success: true,
        user: {
          id: 'owner-id',
          username: 'ownerams',
          role: 'owner',
          name: 'Owner'
        },
        token
      }, { headers: { 'Content-Type': 'application/json' } });
    }

    const db = await getDatabase();
    const user = await db.collection('ams-users').findOne({ username, password });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = sign({ username: user.username, role: user.role }, JWT_SECRET);
    cookies().set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        academyId: user.academyId
      },
      token
    }, { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

