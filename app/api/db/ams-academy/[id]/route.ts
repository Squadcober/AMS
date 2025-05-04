import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const academy = await db.collection('ams-academy').findOne({ 
      id: params.id 
    });

    if (!academy) {
      return NextResponse.json({
        success: false,
        error: 'Academy not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: academy
    });

  } catch (error) {
    console.error('Error fetching academy:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch academy'
    }, { status: 500 });
  }
}
