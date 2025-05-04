import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const coach = await db.collection('ams-coaches').findOne(
      { userId: params.id }
    );

    if (!coach) {
      return NextResponse.json({ rating: 0 });
    }

    return NextResponse.json(coach);
  } catch (error) {
    console.error('Error fetching coach rating:', error);
    return NextResponse.json({ error: 'Failed to fetch coach data' }, { status: 500 });
  }
}
