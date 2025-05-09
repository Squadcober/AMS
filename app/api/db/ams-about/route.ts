import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = false;
export const fetchCache = 'force-no-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Ensure collection exists
    if (!(await db.listCollections({ name: 'ams-about' }).hasNext())) {
      await db.createCollection('ams-about');
    }

    const query = academyId ? { academyId } : {};
    const about = await db.collection('ams-about').findOne(query);

    return NextResponse.json(about || {});
  } catch (error) {
    console.error('Error fetching about data:', error);
    return NextResponse.json({ error: 'Failed to fetch about data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const { _id, ...updateData } = data; // Exclude _id from the update payload

    // Ensure collection exists
    if (!(await db.listCollections({ name: 'ams-about' }).hasNext())) {
      await db.createCollection('ams-about');
    }

    // Check if document exists for this academy
    const existing = await db.collection('ams-about').findOne({ 
      academyId: data.academyId 
    });

    if (existing) {
      // Update existing document
      const result = await db.collection('ams-about').updateOne(
        { academyId: data.academyId },
        { 
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        }
      );
      return NextResponse.json({ success: true, _id: existing._id });
    }

    // Create new document
    const result = await db.collection('ams-about').insertOne({
      ...updateData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ success: true, _id: result.insertedId });
  } catch (error) {
    console.error('Error saving about data:', error);
    return NextResponse.json({ error: 'Failed to save about data' }, { status: 500 });
  }
}
