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
    const query = {
      academyId,
      playerId,
      isDeleted: { $ne: true }
    };

    const gallery = await db.collection('ams-gallery')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const formattedGallery = gallery.map(item => ({
      ...item,
      _id: item._id.toString(),
      createdAt: item.createdAt?.toISOString() || new Date().toISOString()
    }));

    return NextResponse.json({ success: true, data: formattedGallery });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch gallery items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('media') as File;
    const data = JSON.parse(formData.get('data') as string);

    if (!file || !data.playerId || !data.academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Increase file size limit to 5MB
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        success: false,
        error: `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mediaUrl = `data:${file.type};base64,${base64}`;

    const db = await getDatabase();
    const galleryItem = {
      ...data,
      mediaUrl,
      createdAt: new Date(),
      isDeleted: false,
      type: file.type,
      mediaType: file.type.startsWith('image/') ? 'image' : 'video'
    };

    const result = await db.collection('ams-gallery').insertOne(galleryItem);

    return NextResponse.json({
      success: true,
      data: {
        ...galleryItem,
        _id: result.insertedId.toString()
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to upload media',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const playerId = searchParams.get('playerId');
    const academyId = searchParams.get('academyId');

    if (!id || !playerId || !academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    const db = await getDatabase();
    
    // First verify if the media belongs to the player
    const mediaItem = await db.collection('ams-gallery').findOne({
      _id: new ObjectId(id),
      playerId,
      academyId,
      isDeleted: { $ne: true }
    });

    if (!mediaItem) {
      return NextResponse.json({
        success: false,
        error: 'Media not found or unauthorized'
      }, { status: 404 });
    }

    const result = await db.collection('ams-gallery').updateOne(
      { _id: new ObjectId(id) },
      { $set: { isDeleted: true } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete media',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
