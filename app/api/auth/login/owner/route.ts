'use server'


import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    console.log('Owner Login attempt with username:', username);

    if (username === 'ownerams' && password === 'pass5key') {
      const token = sign({
        id: 'owner-id',
        username: 'ownerams',
        role: 'owner',
      }, JWT_SECRET, { expiresIn: '24h' });

      const response = NextResponse.json({
        success: true,
        user: {
          id: 'owner-id',
          username: 'ownerams',
          role: 'owner',
        },
      });

      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 86400
      });

      return response;
    } else {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
  } catch (error) {
    console.error('Owner Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
