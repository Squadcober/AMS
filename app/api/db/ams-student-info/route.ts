import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const academyId = searchParams.get('academyId');

    if (!username || !academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username and Academy ID are required' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    const studentInfo = await db.collection('ams-player-data').findOne({
      username,
      academyId
    });

    if (!studentInfo) {
      return NextResponse.json({
        success: false,
        error: 'Student not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: studentInfo
    });
  } catch (error) {
    console.error('Error fetching student info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch student info'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { username, academyId } = data;

    if (!username || !academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Username and Academy ID are required' 
      }, { status: 400 });
    }

    // Validate blood group if present
    if (data.bloodGroup && !['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(data.bloodGroup)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid blood group'
      }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('ams-player-data').updateOne(
      { username, academyId },
      { 
        $set: {
          ...data,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error updating student info:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update student info'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { _id, ...updateData } = data;

    if (!_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Student ID is required' 
      }, { status: 400 });
    }

    // Validate blood group if present
    if (updateData.bloodGroup && !['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].includes(updateData.bloodGroup)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid blood group'
      }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('ams-player-data').findOneAndUpdate(
      { _id: new ObjectId(_id) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      data: result.value
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update student'
    }, { status: 500 });
  }
}
