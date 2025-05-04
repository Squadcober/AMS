import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/app/lib/mongodb'; // Ensure correct import path

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');
    const date = searchParams.get('date');
    const type = searchParams.get('type');

    if (!academyId) {
      return NextResponse.json({ error: 'Academy ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const query: any = { academyId };
    if (date) query.date = date;
    if (type) query.type = type;

    const records = await db.collection('ams-attendance').find(query).toArray();
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error in GET /api/db/ams-attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { academyId, userId, date, status, type, markedBy } = data;

    if (!academyId || !userId || !date || !status || !type || !markedBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const existingRecord = await db.collection('ams-attendance').findOne({
      academyId,
      userId,
      date,
      type
    });

    const timestamp = new Date().toISOString();
    let result;

    if (existingRecord) {
      result = await db.collection('ams-attendance').updateOne(
        { _id: existingRecord._id },
        {
          $set: {
            status,
            markedBy,
            updatedAt: timestamp
          }
        }
      );
    } else {
      result = await db.collection('ams-attendance').insertOne({
        academyId,
        userId,
        date,
        status,
        type,
        markedBy,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }

    const updatedRecord = await db.collection('ams-attendance').findOne({
      academyId,
      userId,
      date,
      type
    });

    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error('Error in POST /api/db/ams-attendance:', error);
    return NextResponse.json(
      { error: 'Failed to save attendance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
