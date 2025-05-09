import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.academyId || !data.coachId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Create the batch
    const result = await db.collection('ams-batches').insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Fetch the created batch with populated data
    const createdBatch = await db.collection('ams-batches').findOne({
      _id: result.insertedId
    });

    if (!createdBatch) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch created batch'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...createdBatch,
        id: createdBatch._id.toString(),
        _id: createdBatch._id.toString()
      }
    });

  } catch (error) {
    console.error('Error creating batch:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create batch'
    }, { status: 500 });
  }
}
