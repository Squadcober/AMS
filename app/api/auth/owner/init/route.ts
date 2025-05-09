import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Check if owner already exists
    const ownerExists = await db.collection('ams-owner').findOne({ 
      username: process.env.OWNER_USERNAME 
    });

    if (ownerExists) {
      return NextResponse.json({ 
        success: false, 
        message: 'Owner account already exists' 
      });
    }

    // Create owner account
    const result = await db.collection('ams-owner').insertOne({
      username: process.env.OWNER_USERNAME,
      password: process.env.OWNER_PASSWORD, // In production, use hashed password
      email: process.env.OWNER_EMAIL,
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Owner account initialized successfully'
    });

  } catch (error) {
    console.error('Failed to initialize owner account:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize owner account'
    }, { status: 500 });
  }
}
