import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coachId');
    
    if (!coachId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Coach ID is required' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Get ratings from the ams-coaches collection
    const coach = await db.collection('ams-coaches').findOne({ userId: coachId });
    const ratings = coach?.ratings || [];

    // Also fetch student names for the ratings
    const studentIds = ratings.map((r: any) => r.studentId);
    const students = await db.collection('ams-users')
      .find({ id: { $in: studentIds } })
      .toArray();

    // Merge student names with ratings
    const ratingsWithNames = ratings.map((rating: any) => {
      const student = students.find(s => s.id === rating.studentId);
      return {
        ...rating,
        studentName: student?.name || 'Anonymous Student'
      };
    });

    return NextResponse.json({
      success: true,
      data: ratingsWithNames
    });

  } catch (error) {
    console.error('Error fetching coach ratings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch ratings'
    }, { status: 500 });
  }
}
