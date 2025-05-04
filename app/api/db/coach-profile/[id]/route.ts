import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Get coach data and include student info for ratings
    const [coachInfo, userData, sessions] = await Promise.all([
      db.collection('ams-coaches').findOne({ userId: params.id }),
      db.collection('ams-users').findOne({ id: params.id }),
      db.collection('ams-sessions').find({ 
        coachId: params.id,
        status: "Finished"
      }).toArray()
    ]);

    if (!userData && !coachInfo) {
      return NextResponse.json({ 
        success: false, 
        error: 'Coach not found' 
      }, { status: 404 });
    }

    // If there are ratings, fetch student names
    let ratings = coachInfo?.ratings || [];
    if (ratings.length > 0) {
      const studentIds = ratings.map(r => r.studentId);
      const students = await db.collection('ams-users')
        .find({ id: { $in: studentIds } })
        .toArray();

      // Map student names to ratings
      ratings = ratings.map(rating => {
        const student = students.find(s => s.id === rating.studentId);
        return {
          ...rating,
          studentName: student?.name || 'Anonymous Student'
        };
      });
    }

    const combinedData = {
      ...userData,
      ...coachInfo,
      ratings,
      sessionsCount: sessions.length,
      id: params.id
    };

    return NextResponse.json({ 
      success: true, 
      data: combinedData 
    });

  } catch (error) {
    console.error('Error fetching coach profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch coach profile'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Update coach data
    const result = await db.collection('ams-coaches').updateOne(
      { userId: params.id },
      {
        $set: {
          name: updates.name,
          age: updates.age,
          license: updates.license,
          about: updates.about,
          photoUrl: updates.photoUrl,
          ratings: updates.ratings,
          updatedAt: new Date().toISOString()
        },
        $setOnInsert: {
          userId: params.id,
          academyId: updates.academyId,
          createdAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );

    if (!result.acknowledged) {
      throw new Error('Failed to update coach data');
    }

    return NextResponse.json({ 
      success: true,
      data: {
        ...updates,
        userId: params.id
      }
    });

  } catch (error) {
    console.error('Error updating coach profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update coach profile'
    }, { status: 500 });
  }
}
