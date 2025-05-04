import { NextResponse, NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const academyId = searchParams.get('academyId');

    if (!academyId) {
      return NextResponse.json({ success: false, error: 'Academy ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    const sessions = await db.collection('ams-sessions').find({ academyId }).toArray();

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ success: false, error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionData = await req.json();
    const db = await getDatabase();
    const result = await db.collection('ams-sessions').insertOne(sessionData);

    return NextResponse.json({ success: true, data: { ...sessionData, _id: result.insertedId } }, { status: 201 });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json({ success: false, error: 'Failed to create session' }, { status: 500 });
  }
}

