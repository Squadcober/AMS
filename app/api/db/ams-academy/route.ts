import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb'; // Change to getClientPromise

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url, `http://${request.headers.get('host')}`);
    const academyId = url.searchParams.get('academyId');

    console.log('Fetching academies with academyId:', academyId);

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);
    
    console.log('Connected to database:', process.env.MONGODB_DB);

    if (academyId) {
      console.log('Fetching specific academy:', academyId);
      const academy = await db.collection('ams-academy').findOne({ 
        id: academyId 
      });
      console.log('Found academy:', academy);

      if (!academy) {
        return NextResponse.json(
          { success: false, error: 'Academy not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: academy });
    }

    console.log('Fetching all academies');
    const academies = await db.collection('ams-academy')
      .find({})
      .toArray();
    
    console.log('Found academies count:', academies.length);
    console.log('Academies:', academies);

    return NextResponse.json({ 
      success: true, 
      data: academies,
      count: academies.length 
    });

  } catch (error) {
    console.error('Detailed error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch academies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

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

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url, `http://${request.headers.get('host')}`);
    const academyId = url.searchParams.get('id');

    if (!academyId) {
      return NextResponse.json(
        { success: false, error: 'Academy ID is required' },
        { status: 400 }
      );
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    const result = await db.collection('ams-academy').deleteOne({ id: academyId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Academy not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Academy ${academyId} deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting academy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete academy' },
      { status: 500 }
    );
  }
}
