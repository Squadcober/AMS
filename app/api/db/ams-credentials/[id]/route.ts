'use client'

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const db = await getDatabase();
    const result = await db.collection('ams-credentials').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Credential not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Credential deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting credential:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete credential'
    }, { status: 500 });
  }
}
