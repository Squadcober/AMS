import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const academyId = searchParams.get('academyId');

    if (!playerId || !academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters',
      }, { status: 400 });
    }

    const db = await getDatabase();
    const query = {
      playerId,
      academyId,
      isDeleted: { $ne: true }, // Exclude deleted achievements
    };

    const achievements = await db.collection('ams-achievement')
      .find(query)
      .sort({ createdAt: -1 }) // Sort by creation date
      .toArray();

    return NextResponse.json({
      success: true,
      data: achievements.map(achievement => ({
        ...achievement,
        _id: achievement._id.toString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch achievements',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dataString = formData.get('data') as string;
    console.log('Received form data string:', dataString);

    const data = JSON.parse(dataString);
    console.log('Parsed achievement data:', data);
    
    const certificateFile = formData.get('certificate') as File | null;
    console.log('Certificate file present:', !!certificateFile);

    // Validate required fields
    if (!data.playerId || !data.academyId || !data.title || !data.type || !data.date) {
      console.error('Missing required fields:', { 
        playerId: !!data.playerId,
        academyId: !!data.academyId,
        title: !!data.title,
        type: !!data.type,
        date: !!data.date
      });
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields',
        details: 'playerId, academyId, title, type, and date are required'
      }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Find player data using username
    console.log('Looking up player with:', { username: data.playerId, academyId: data.academyId });
    const playerData = await db.collection('ams-player-data').findOne({
      username: data.playerId,
      academyId: data.academyId
    });

    console.log('Found player data:', playerData);

    if (!playerData) {
      return NextResponse.json({
        success: false,
        error: 'Player not found',
        details: `No player found with username: ${data.playerId}`
      }, { status: 404 });
    }
    
    let certificateUrl = '';
    if (certificateFile) {
      const buffer = await certificateFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      certificateUrl = `data:${certificateFile.type};base64,${base64}`;
    }

    const achievement = {
      ...data,
      playerId: playerData.id || data.playerId, // Use player ID from database
      certificateUrl: certificateUrl || data.certificationUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false
    };

    console.log('Saving achievement:', achievement);

    const result = await db.collection('ams-achievement').insertOne(achievement);
    console.log('Achievement saved with ID:', result.insertedId);

    const savedAchievement = {
      ...achievement,
      _id: result.insertedId.toString()
    };

    console.log('Returning saved achievement:', savedAchievement);

    return NextResponse.json({
      success: true,
      data: savedAchievement
    });

  } catch (error) {
    console.error('Error creating achievement:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create achievement',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
