import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';

// Add error handling utility
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { collection: string } }
) {
  try {
    const client = await getClientPromise();
    console.log('Attempting to connect to database:', process.env.MONGODB_DB);
    
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection(params.collection);
    
    const searchParams = request.nextUrl.searchParams;
    const filter = Object.fromEntries(searchParams.entries());
    
    console.log('Querying collection:', params.collection, 'with filter:', filter);
    const data = await collection.find(filter).toArray();
    console.log('Found documents:', data.length);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Database operation failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { collection: string } }
) {
  try {
    console.log('Starting POST operation for collection:', params.collection);
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection(params.collection);
    
    const data = await request.json();
    console.log('Received data:', data);
    
    // For academies, ensure required fields and add timestamps
    if (params.collection === 'ams-academy') {
      if (!data.id || !data.name) {
        console.error('Missing required fields for academy');
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }
      
      data.createdAt = new Date();
      data.updatedAt = new Date();
    }
    
    const result = await collection.insertOne(data);
    console.log('Insert result:', result);
    
    if (!result.acknowledged) {
      throw new Error('Insert operation not acknowledged by MongoDB');
    }
    
    return NextResponse.json({ 
      success: true, 
      _id: result.insertedId,
      ...data 
    });
  } catch (error) {
    console.error('Failed to create document:', error);
    return NextResponse.json(
      { error: 'Failed to create document', details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
