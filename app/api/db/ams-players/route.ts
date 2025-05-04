import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

// Add server-side caching
const CACHE = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentIds = searchParams.get('studentIds')?.split(',');

    if (!studentIds?.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Student IDs are required' 
      }, { status: 400 });
    }

    // Check cache for each student ID
    const now = Date.now();
    const uncachedIds = studentIds.filter(id => {
      const cached = CACHE.get(id);
      return !cached || (now - cached.timestamp > CACHE_DURATION);
    });

    if (uncachedIds.length === 0) {
      // All students are in cache
      const cachedData = studentIds.map(id => CACHE.get(id)?.data);
      return NextResponse.json({
        success: true,
        data: cachedData,
        fromCache: true
      });
    }

    // Fetch uncached student data
    const db = await getDatabase();
    const students = await db.collection('ams-users')
      .find({ id: { $in: uncachedIds } })
      .project({ id: 1, name: 1, photoUrl: 1 })
      .toArray();

    // Update cache
    students.forEach(student => {
      CACHE.set(student.id, {
        data: {
          id: student.id,
          name: student.name,
          photoUrl: student.photoUrl
        },
        timestamp: now
      });
    });

    // Combine cached and new data
    const allData = studentIds.map(id => CACHE.get(id)?.data);

    return NextResponse.json({
      success: true,
      data: allData
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch students'
    }, { status: 500 });
  }
}
