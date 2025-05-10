import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';

export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    // Get the absolute URL from the request
    const url = new URL(request.url, `http://${request.headers.get('host')}`);
    const id = params.id;

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    const academy = await db.collection('ams-academy').findOne({ 
      id: id 
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    const result = await db.collection('ams-academy').deleteOne({ id });

    if (result.deletedCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Academy not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Academy ${id} deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting academy:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete academy'
    }, { status: 500 });
  }
}
