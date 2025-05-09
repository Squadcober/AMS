import { NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';

export async function POST() {
  try {
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Create collection with validation
    await db.createCollection('ams-match-day', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'date', 'team1', 'team2', 'startTime', 'endTime', 'venue', 'academyId'],
          properties: {
            id: { bsonType: 'string' },
            date: { bsonType: 'string' },
            team1: { bsonType: 'string' },
            team2: { bsonType: 'string' },
            team1Score: { bsonType: ['int', 'null'] },
            team2Score: { bsonType: ['int', 'null'] },
            startTime: { bsonType: 'string' },
            endTime: { bsonType: 'string' },
            venue: { bsonType: 'string' },
            academyId: { bsonType: 'string' },
            tournamentName: { bsonType: ['string', 'null'] },
            format: { bsonType: ['string', 'null'] },
            gameStatus: {
              enum: ['Not Started', 'In Progress', 'Completed', null]
            },
            winner: { bsonType: ['string', 'null'] },
            loser: { bsonType: ['string', 'null'] },
            extraTime: { bsonType: ['int', 'null'] }
          }
        }
      }
    });

    // Create indexes
    await db.collection('ams-match-day').createIndexes([
      { key: { academyId: 1 } },
      { key: { date: 1 } },
      { key: { gameStatus: 1 } }
    ]);

    return NextResponse.json({ success: true, message: 'Match day collection initialized' });
  } catch (error) {
    console.error('Error initializing match day collection:', error);
    return NextResponse.json(
      { error: 'Failed to initialize match day collection' },
      { status: 500 }
    );
  }
}
