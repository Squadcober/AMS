
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');

    const db = await getDatabase();

    if (academyId) {
      // Fetch a specific academy by ID
      const academy = await db.collection('ams-academy').findOne({ id: academyId });
      if (!academy) {
        return NextResponse.json(
          { success: false, error: 'Academy not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: academy });
    }

    // Fetch all academies if no ID is provided
    const academies = await db.collection('ams-academy').find({}).toArray();
    return NextResponse.json({ success: true, data: academies });
  } catch (error) {
    console.error('Error fetching academies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch academies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: 'Academy ID and name are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if the academy already exists
    const existingAcademy = await db.collection('ams-academy').findOne({ id });
    if (existingAcademy) {
      return NextResponse.json(
        { success: false, error: 'Academy with this ID already exists' },
        { status: 400 }
      );
    }

    // Insert the new academy
    const result = await db.collection('ams-academy').insertOne({ id, name });

    return NextResponse.json({ success: true, data: { id, name } });
  } catch (error) {
    console.error('Error saving academy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save academy' },
      { status: 500 }
    );
  }
}
