import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId');
    const academyId = searchParams.get('academyId');

    if (!parentId || !academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    const count = await db.collection('ams-sessions').countDocuments({
      parentSessionId: parseInt(parentId),
      academyId,
      isOccurrence: true
    });

    return NextResponse.json({
      success: true,
      total: count
    });

  } catch (error) {
    console.error('Error counting occurrences:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to count occurrences'
    }, { status: 500 });
  }
}
