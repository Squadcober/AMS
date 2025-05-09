import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');
    const position = searchParams.get('position');

    if (!academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'academyId is required' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    const query: { 
      academyId: string; 
      isActive: boolean; 
      isDeleted: { $ne: boolean }; 
      position?: string 
    } = {
      academyId,
      isActive: true,
      isDeleted: { $ne: true }
    };

    if (position) {
      query.position = position;
    }

    const players = await db.collection('ams-player-data')
      .find(query)
      .toArray();

    return NextResponse.json({ 
      success: true, 
      data: players 
    });

  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch players'
    }, { status: 500 });
  }
}
