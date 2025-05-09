import { NextRequest, NextResponse } from 'next/server';
import { getClientPromise } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const calculateMatchStatus = (match: any) => {
  const now = new Date();
  const matchDate = new Date(match.date);
  const [startHour, startMinute] = match.startTime.split(':').map(Number);
  const [endHour, endMinute] = match.endTime.split(':').map(Number);
  
  const matchStart = new Date(matchDate);
  matchStart.setHours(startHour, startMinute, 0);
  
  const matchEnd = new Date(matchDate);
  matchEnd.setHours(endHour, endMinute, 0);

  if (now < matchStart) {
    return "Upcoming";
  } else if (now >= matchStart && now <= matchEnd) {
    return "On-going";
  } else {
    return "Finished";
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');

    if (!academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Academy ID is required',
        data: [] 
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    const matches = await db.collection('ams-match-day')
      .find({ academyId })
      .sort({ date: 1 })
      .toArray();

    // Format matches to ensure consistent date and time format
    const formattedMatches = matches.map(match => {
      const matchDate = new Date(match.date);
      return {
        ...match,
        _id: match._id.toString(),
        date: matchDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
        startTime: match.startTime || '00:00',
        endTime: match.endTime || '00:00',
        name: match.name || `Match vs ${match.opponent || 'TBD'}`,
        venue: match.venue || 'TBD',
        opponent: match.opponent || 'TBD',
        status: calculateMatchStatus(match)
      };
    });

    console.log(`Found ${formattedMatches.length} matches for academy ${academyId}`);

    return NextResponse.json({
      success: true,
      data: formattedMatches,
      error: null
    });

  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch matches',
      data: []
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.academyId) {
      return NextResponse.json({ error: 'Academy ID is required' }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Ensure collection exists
    if (!(await db.listCollections({ name: 'ams-match-day' }).hasNext())) {
      await db.createCollection('ams-match-day');
    }

    // Create new match
    const result = await db.collection('ams-match-day').insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      success: true, 
      _id: result.insertedId,
      ...data 
    });
  } catch (error) {
    console.error('Error creating match:', error);
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const data = await request.json();

    if (!matchId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match ID is required',
        data: null 
      }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DB);

    // Log the update operation
    console.log('Updating match:', matchId, 'with data:', data);

    // Update the match
    const result = await db.collection('ams-match-day').updateOne(
      { _id: new ObjectId(matchId) },
      {
        $set: {
          ...data,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Match not found or no changes made',
        data: null 
      }, { status: 404 });
    }

    // Get updated match
    const updatedMatch = await db.collection('ams-match-day')
      .findOne({ _id: new ObjectId(matchId) });

    return NextResponse.json({
      success: true,
      data: updatedMatch,
      error: null
    });

  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update match',
      data: null
    }, { status: 500 });
  }
}
