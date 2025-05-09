import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');
    const coachId = searchParams.get('coachId');

    console.log('🔍 Drills API - Request params:', { academyId, coachId });

    if (!academyId || !coachId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Academy ID and Coach ID are required' 
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Query for drills matching both academyId and coachId
    const query = { 
      academyId,
      coachId,
      isDeleted: { $ne: true }  // Exclude deleted drills
    };

    console.log('🔍 Executing MongoDB query:', JSON.stringify(query));

    const drills = await db.collection('ams-drills')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`✅ Found ${drills.length} drills for coach ${coachId}`);

    return NextResponse.json({
      success: true,
      data: drills.map(drill => ({
        ...drill,
        id: drill._id.toString(),
        _id: drill._id.toString(),
        assignedPlayers: drill.assignedPlayers || [],
        playersAssigned: drill.playersAssigned || []
      }))
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch drills',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('🔍 Creating drill with data:', data);

    if (!data.name || !data.academyId || !data.coachId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, academyId, or coachId',
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    const drillData = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    const result = await db.collection('ams-drills').insertOne(drillData);

    if (!result.insertedId) {
      throw new Error('Failed to insert drill into the database');
    }

    console.log('✅ Drill created successfully:', result.insertedId);

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        ...drillData,
      },
    });
  } catch (error) {
    console.error('❌ Error creating drill:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create drill',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
