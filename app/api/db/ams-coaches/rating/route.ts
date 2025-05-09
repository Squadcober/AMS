import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId, Document, UpdateFilter } from 'mongodb';

// Define rating interface
interface Rating {
  studentId: string;
  rating: number;
  date: string;
}

// Add type definitions for query conditions
type QueryCondition = 
  | { id: string; userId?: undefined; _id?: undefined }
  | { userId: string; id?: undefined; _id?: undefined }
  | { _id: ObjectId; id?: undefined; userId?: undefined };

// Define coach document interface
interface CoachDocument extends Document {
  ratings: Rating[];
  totalRatings: number;
  ratingSum: number;
  averageRating: number;
}

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

    // Build type-safe query conditions
    const queryConditions: QueryCondition[] = [
      { id: coachId },
      { userId: coachId }
    ];

    // Only add ObjectId condition if valid
    if (ObjectId.isValid(coachId)) {
      queryConditions.push({ _id: new ObjectId(coachId) } as QueryCondition);
    }

    // Add new rating and update average
    const updateDoc: UpdateFilter<CoachDocument> = {
      $push: {
        ratings: {
          studentId,
          rating,
          date
        } as any // Use 'any' to satisfy the MongoDB driver type
      },
      $inc: {
        totalRatings: 1,
        ratingSum: rating
      }
    };

    const result = await db.collection<CoachDocument>('ams-coaches').updateOne(
      { $or: queryConditions },
      updateDoc
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Coach not found'
      }, { status: 404 });
    }

    // Update average rating using same query
    await db.collection('ams-coaches').updateOne(
      { $or: queryConditions },
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
