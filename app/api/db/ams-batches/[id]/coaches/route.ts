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

    // Get batch
    const batch = await db.collection('ams-batches').findOne({
      _id: new ObjectId(params.id)
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Get coach IDs from both coachId and coachIds fields
    const coachIds = [
      ...(batch.coachIds || []),
      batch.coachId
    ].filter(Boolean);

    // Fetch coaches from users collection
    const coaches = await db.collection('ams-users')
      .find({
        $or: [
          { id: { $in: coachIds } },
          { userId: { $in: coachIds } }
        ]
      })
      .toArray();

    const formattedCoaches = coaches.map(coach => ({
      ...coach,
      id: coach._id.toString(),
      name: coach.name || coach.username
    }));

    return NextResponse.json({
      success: true,
      data: formattedCoaches
    });

  } catch (error) {
    console.error('Error fetching batch coaches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch batch coaches' },
      { status: 500 }
    );
  }
}
