import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';

// Add helper function at the top
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { collection: string, id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection(params.collection);
    
    const data = await collection.findOne({ _id: new ObjectId(params.id) });
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error fetching document with ID: ${params.id}`, error);
    return NextResponse.json(
      { error: 'Failed to fetch document', details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { collection: string, id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection(params.collection);
    
    const data = await request.json();
    const result = await collection.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: data }
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error updating document with ID: ${params.id}`, error);
    return NextResponse.json(
      { error: 'Failed to update document', details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { collection: string, id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection(params.collection);

    console.log(`Attempting to delete document with ID: ${params.id} from collection: ${params.collection}`);
    const result = await collection.deleteOne({ id: params.id });

    if (result.deletedCount === 0) {
      console.error(`No document found with ID: ${params.id}`);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    console.log(`Successfully deleted document with ID: ${params.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Error deleting document with ID: ${params.id}`, error);
    return NextResponse.json(
      { error: 'Failed to delete document', details: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
