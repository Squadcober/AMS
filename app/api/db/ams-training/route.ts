import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');
    const playerId = searchParams.get('playerId');
    
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    
    const query = {
      ...(academyId && { academyId }),
      ...(playerId && { playerId })
    };
    
    const trainingData = await db.collection('ams-training').find(query).toArray();
    return NextResponse.json(trainingData);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch training data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    
    const result = await db.collection('ams-training').insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return NextResponse.json({ success: true, _id: result.insertedId });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save training data' },
      { status: 500 }
    );
  }
}
