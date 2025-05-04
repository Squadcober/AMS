import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const academyId = searchParams.get('academyId');

    if (!academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'academyId is required' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    const gameplans = await db.collection('ams-gameplan')
      .find({ academyId, isDeleted: { $ne: true } })
      .toArray();

    return NextResponse.json({ success: true, data: gameplans });
  } catch (error) {
    console.error('Error fetching gameplans:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch gameplans'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'academyId is required' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('ams-gameplan').insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      formation: data.formation,
      positions: data.positions,
      players: data.players
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId,
        ...data
      }
    });
  } catch (error) {
    console.error('Error creating gameplan:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create gameplan'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const academyId = searchParams.get('academyId');

    if (!id || !academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db.collection('ams-gameplan').updateOne(
      { _id: new ObjectId(id), academyId },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    return NextResponse.json({ success: result.modifiedCount > 0 });
  } catch (error) {
    console.error('Error deleting gameplan:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete gameplan'
    }, { status: 500 });
  }
}
