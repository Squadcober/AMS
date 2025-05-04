import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');

    if (!academyId) {
      return NextResponse.json({ error: 'Academy ID is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const finances = await db
      .collection('ams-finance')
      .find({ academyId })
      .sort({ date: -1 })
      .toArray();

    return NextResponse.json(finances);
  } catch (error) {
    console.error('Error in GET /api/db/ams-finance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch finance data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { academyId, type, amount, description, date, category } = body;

    if (!academyId || !type || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const newTransaction = {
      academyId,
      type,
      amount: parseFloat(amount),
      description,
      category,
      date: date || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const result = await db.collection('ams-finance').insertOne(newTransaction);
    
    return NextResponse.json({
      id: result.insertedId,
      ...newTransaction
    });
  } catch (error) {
    console.error('Error in POST /api/db/ams-finance:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
