import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');
    const id = searchParams.get('id');

    // If querying for a specific coach
    if (id) {
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB);

      const orConditions: Record<string, any>[] = [
        { id: id },
        { userId: id },
        { username: id },
        { coachId: id }
      ];
      if (ObjectId.isValid(id)) {
        orConditions.push({ _id: new ObjectId(id) });
      }

      const coach = await db.collection('ams-coaches').findOne({
        $or: orConditions
      });

      return NextResponse.json({
        success: true,
        data: coach ? {
          ...coach,
          id: coach._id.toString(),
          _id: coach._id.toString()
        } : null
      });
    }

    // If querying all coaches by academy
    if (!academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Academy ID is required when not querying by coach ID' 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const coaches = await db
      .collection('ams-coaches')
      .find({ academyId })
      .toArray();

    return NextResponse.json({
      success: true,
      data: coaches.map(coach => ({
        ...coach,
        id: coach._id.toString(),
        _id: coach._id.toString()
      }))
    });

  } catch (error) {
    console.error('Error fetching coaches:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch coaches',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
