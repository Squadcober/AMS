import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');

    if (!academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Academy ID is required' 
      }, { status: 400 });
    }

    console.log('Fetching batches for academy:', academyId);

    const db = await getDatabase();
    
    // First get all batches for the academy
    const batches = await db.collection('ams-batches')
      .find({ 
        academyId,
        isDeleted: { $ne: true } 
      })
      .toArray();

    console.log(`Fetched ${batches.length} batches from database:`, batches.map(batch => ({
      id: batch._id.toString(),
      name: batch.name || 'Unnamed Batch'
    })));

    // Get all coach IDs from batches
    const coachIds = new Set<string>();
    batches.forEach(batch => {
      if (batch.coachId) coachIds.add(batch.coachId);
      if (Array.isArray(batch.coachIds)) {
        batch.coachIds.forEach(id => coachIds.add(id));
      }
    });

    // Fetch all coaches in one query from users collection
    const coaches = await db.collection('ams-users')
      .find({
        $or: [
          { id: { $in: Array.from(coachIds) } },
          { _id: { $in: Array.from(coachIds).map(id => {
            try { return new ObjectId(id); } catch { return null; }
          }).filter((id): id is ObjectId => id !== null) } }
        ],
        role: 'coach'
      })
      .toArray();

    console.log(`Found ${coaches.length} coaches`);

    // Create a map for quick coach lookups
    const coachMap = new Map();
    coaches.forEach(coach => {
      const coachId = coach._id.toString();
      coachMap.set(coachId, coach.name || coach.username);
      coachMap.set(coach.id, coach.name || coach.username);
    });

    // Format batches with coach names
    const formattedBatches = batches.map(batch => {
      let coachNames: string[] = [];
      
      // Handle single coachId
      if (batch.coachId && coachMap.has(batch.coachId)) {
        coachNames.push(coachMap.get(batch.coachId));
      }
      
      // Handle coachIds array
      if (Array.isArray(batch.coachIds)) {
        const names = batch.coachIds
          .map(id => coachMap.get(id))
          .filter(Boolean);
        coachNames.push(...names);
      }

      return {
        ...batch,
        id: batch._id.toString(),
        _id: batch._id.toString(),
        name: batch.name || 'Unnamed Batch',
        coachName: coachNames.join(', ') || 'Unassigned',
        coachNames: coachNames
      };
    });

    console.log('Returning formatted batches:', formattedBatches);

    return NextResponse.json({
      success: true,
      data: formattedBatches
    });

  } catch (error) {
    console.error('Error fetching batches:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch batches'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Name and academyId are required' 
      }, { status: 400 });
    }

    const db = await getDatabase();

    // Create the batch
    const batchData = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };

    const result = await db.collection('ams-batches').insertOne(batchData);

    // Return created batch with _id
    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId,
        ...batchData
      }
    });

  } catch (error) {
    console.error('Error creating batch:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create batch',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
