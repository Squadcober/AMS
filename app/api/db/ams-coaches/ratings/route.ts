import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

    // First get the coach ratings
    const coach = await db.collection('ams-coaches').findOne({
      $or: [
        { id: coachId },
        { userId: coachId },
        { _id: ObjectId.isValid(coachId) ? new ObjectId(coachId) : null }
      ]
    });

    if (!coach?.ratings?.length) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Get all unique student IDs from ratings
    const studentIds = [...new Set(coach.ratings.map((r: any) => r.studentId))];

    // Fetch student information
    const students = await db.collection('ams-player-data')
      .find({
        $or: [
          { id: { $in: studentIds } },
          { userId: { $in: studentIds } },
          { _id: { $in: studentIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)) } }
        ]
      })
      .toArray();

    // Create a map of student info
    const studentMap = new Map(
      students.map(student => [
        student.id || student._id.toString(),
        {
          name: student.name || student.username || 'Unknown Student',
          photoUrl: student.photoUrl || '/placeholder.svg'
        }
      ])
    );

    // Combine ratings with student info
    const ratingsWithStudentInfo = coach.ratings.map((rating: any) => ({
      ...rating,
      student: studentMap.get(rating.studentId) || {
        name: 'Unknown Student',
        photoUrl: '/placeholder.svg'
      }
    }));

    return NextResponse.json({
      success: true,
      data: ratingsWithStudentInfo
    });

  } catch (error) {
    console.error('Error fetching ratings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch ratings'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { coachId, studentId, rating, academyId, date } = await request.json();

    if (!coachId || !studentId || !rating || !academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    const db = await getDatabase();

    // Get student info first
    const student = await db.collection('ams-player-data').findOne({
      $or: [
        { id: studentId },
        { userId: studentId },
        { _id: ObjectId.isValid(studentId) ? new ObjectId(studentId) : null }
      ]
    });

    const studentInfo = {
      id: student?._id.toString() || studentId,
      name: student?.name || student?.username || 'Unknown Student',
      photoUrl: student?.photoUrl || '/placeholder.svg'
    };

    // Update coach ratings
    const result = await db.collection('ams-coaches').findOneAndUpdate(
      { 
        $or: [
          { id: coachId },
          { userId: coachId },
          { _id: ObjectId.isValid(coachId) ? new ObjectId(coachId) : null }
        ]
      },
      {
        $push: {
          ratings: {
            studentId,
            studentInfo, // Store student info with the rating
            rating,
            date,
            academyId
          }
        }
      },
      { returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      data: result.value
    });

  } catch (error) {
    console.error('Error updating coach rating:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update rating'
    }, { status: 500 });
  }
}
