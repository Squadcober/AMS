import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId, Filter, Document, UpdateFilter } from 'mongodb';

interface Rating {
  studentId: string;
  studentInfo: {
    id: string;
    name: string;
    photoUrl: string;
  };
  rating: number;
  date: string;
  academyId: string;
}

interface CoachDocument extends Document {
  ratings: Rating[];
}

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

    // Create base query conditions
    const queryConditions: Filter<Document>['$or'] = [
      { id: coachId },
      { userId: coachId }
    ];

    // Only add ObjectId condition if valid
    if (ObjectId.isValid(coachId)) {
      queryConditions.push({ _id: new ObjectId(coachId) });
    }

    // Find coach with properly typed query
    const coach = await db.collection('ams-coaches').findOne({
      $or: queryConditions
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
          { _id: { $in: studentIds.filter((id): id is string => typeof id === 'string' && ObjectId.isValid(id)).map(id => new ObjectId(id)) } }
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
    const queryConditions: Filter<Document>[] = [
      { id: studentId },
      { userId: studentId }
    ];
    
    if (ObjectId.isValid(studentId)) {
      queryConditions.push({ _id: new ObjectId(studentId) });
    }

    const student = await db.collection('ams-player-data').findOne({
      $or: queryConditions
    });

    const studentInfo = {
      id: student?._id.toString() || studentId,
      name: student?.name || student?.username || 'Unknown Student',
      photoUrl: student?.photoUrl || '/placeholder.svg'
    };

    // Build query conditions
    const coachQueryConditions: Filter<Document>[] = [
      { id: coachId },
      { userId: coachId }
    ];

    // Only add ObjectId condition if valid
    if (ObjectId.isValid(coachId)) {
      coachQueryConditions.push({ _id: new ObjectId(coachId) });
    }

    const updateDoc: UpdateFilter<CoachDocument> = {
          $push: {
            ratings: {
              studentId,
              studentInfo,
              rating,
              date,
              academyId
            } as any // Use 'any' to satisfy the MongoDB driver type
          },
          $inc: {
            totalRatings: 1,
            ratingSum: rating
          }
        };

    // Update coach ratings with properly typed query
    const result = await db.collection<CoachDocument>('ams-coaches').findOneAndUpdate(
      { $or: coachQueryConditions },
      updateDoc,
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update rating'
      }, { status: 500 });
    }

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
