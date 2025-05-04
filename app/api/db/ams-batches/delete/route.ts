import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { batchIds } = await request.json();
    
    if (!Array.isArray(batchIds)) {
      return NextResponse.json(
        { error: 'Invalid batch IDs' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Convert strings to ObjectIds
    const objectIds = batchIds.map(id => new ObjectId(id));

    const result = await db.collection('ams-batches').deleteMany({
      _id: { $in: objectIds }
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error deleting batches:', error);
    return NextResponse.json(
      { error: 'Failed to delete batches' },
      { status: 500 }
    );
  }
}
