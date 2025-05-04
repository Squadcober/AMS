import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { coachId, studentId, rating, date } = await request.json();

    if (!coachId || !studentId || !rating) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    const db = await getDatabase();

    // Add new rating and update average
    const result = await db.collection('ams-coaches').updateOne(
      { 
        $or: [
          { id: coachId },
          { userId: coachId },
          { _id: ObjectId.isValid(coachId) ? new ObjectId(coachId) : null }
        ]
      },
      {
        $push: {
          ratings: { studentId, rating, date }
        },
        $inc: { 
          totalRatings: 1,
          ratingSum: rating
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Coach not found'
      }, { status: 404 });
    }

    // Update average rating
    await db.collection('ams-coaches').updateOne(
      { 
        $or: [
          { id: coachId },
          { userId: coachId },
          { _id: ObjectId.isValid(coachId) ? new ObjectId(coachId) : null }
        ]
      },
      [{
        $set: {
          averageRating: {
            $round: [{ $divide: ["$ratingSum", "$totalRatings"] }, 1]
          }
        }
      }]
    );

    return NextResponse.json({
      success: true,
      data: { modifiedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error('Error updating coach rating:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update rating'
    }, { status: 500 });
  }
}
