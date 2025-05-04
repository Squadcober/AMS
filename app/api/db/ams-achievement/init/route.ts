import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    await db.createCollection('ams-achievement', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['playerId', 'academyId', 'title', 'type', 'date'],
          properties: {
            playerId: { bsonType: 'string' },
            academyId: { bsonType: 'string' },
            title: { bsonType: 'string' },
            description: { bsonType: 'string' },
            type: {
              enum: ['Tournament', 'Award', 'Milestone', 'Certification', 'Other']
            },
            date: { bsonType: 'string' },
            location: { bsonType: 'string' },
            result: { bsonType: 'string' },
            position: { bsonType: 'string' },
            mediaUrls: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            },
            certificationUrl: { bsonType: 'string' },
            isVerified: { bsonType: 'bool' },
            verifiedBy: { bsonType: 'string' },
            verificationDate: { bsonType: 'date' },
            tags: {
              bsonType: 'array',
              items: { bsonType: 'string' }
            },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' }
          }
        }
      }
    });

    // Create indexes
    await db.collection('ams-achievement').createIndexes([
      { key: { playerId: 1 } },
      { key: { academyId: 1 } },
      { key: { date: -1 } },
      { key: { type: 1 } },
      { key: { isVerified: 1 } }
    ]);

    return NextResponse.json({ 
      success: true, 
      message: 'Achievement collection initialized' 
    });
  } catch (error) {
    console.error('Error initializing achievement collection:', error);
    return NextResponse.json(
      { error: 'Failed to initialize achievement collection' },
      { status: 500 }
    );
  }
}
