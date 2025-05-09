import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const academyId = searchParams.get('academyId');

    if (!playerId || !academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    const db = await getDatabase();
    const achievements = await db.collection('ams-achievement')
      .find({ 
        playerId,
        academyId,
        isDeleted: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: achievements.map(achievement => ({
        ...achievement,
        _id: achievement._id.toString()
      }))
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch achievements'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const achievementData = JSON.parse(data.get('data') as string);
    const certificate = data.get('certificate') as File;

    if (!achievementData.playerId || !achievementData.academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const db = await getDatabase();
    
    let certificateUrl = '';
    if (certificate) {
      // Handle certificate file upload here
      // You would typically upload this to a storage service
      // For now, we'll just store it as a placeholder URL
      certificateUrl = `certificate_${Date.now()}.pdf`;
    }

    const achievement = {
      ...achievementData,
      certificateUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false
    };

    const result = await db.collection('ams-achievement').insertOne(achievement);

    return NextResponse.json({
      success: true,
      data: {
        ...achievement,
        _id: result.insertedId.toString()
      }
    });
  } catch (error) {
    console.error('Error creating achievement:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create achievement'
    }, { status: 500 });
  }
}
