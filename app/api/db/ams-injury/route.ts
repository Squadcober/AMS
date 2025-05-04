import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');
    const data = JSON.parse(formData.get('data') as string);

    if (!data.playerId || !data.academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const db = await getDatabase();

    if (data.type === 'pdf') {
      const processedFiles = await Promise.all(
        (files as File[]).map(async (file) => {
          const buffer = await file.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          return {
            name: file.name,
            url: `data:application/pdf;base64,${base64}`,
            type: 'pdf'
          };
        })
      );

      // Update injury with new PDF files
      const result = await db.collection('ams-injuries').findOneAndUpdate(
        { _id: new ObjectId(data.injuryId) },
        {
          $push: { pdfFiles: { $each: processedFiles } },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );

      return NextResponse.json({
        success: true,
        data: {
          files: processedFiles,
          _id: result.value._id.toString()
        }
      });
    }

    // Process files
    const processedFiles = await Promise.all(
      (files as File[]).map(async (file) => {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return {
          name: file.name,
          type: file.type,
          url: `data:${file.type};base64,${base64}`
        };
      })
    );

    // Handle different types of uploads
    if (data.type === 'xray' || data.type === 'prescription') {
      // Update existing injury
      if (data.injuryId) {
        const updateField = data.type === 'xray' 
          ? `xrayImages.${data.imageIndex}` 
          : 'prescription';

        await db.collection('ams-injuries').updateOne(
          { _id: new ObjectId(data.injuryId) },
          { 
            $set: { 
              [updateField]: processedFiles[0].url,
              updatedAt: new Date()
            }
          }
        );

        const updatedInjury = await db.collection('ams-injuries').findOne(
          { _id: new ObjectId(data.injuryId) }
        );

        return NextResponse.json({
          success: true,
          data: { ...updatedInjury, files: processedFiles }
        });
      }
    } else if (data.type === 'pdf') {
      // Add PDFs to existing injury
      if (data.injuryId) {
        await db.collection('ams-injuries').updateOne(
          { _id: new ObjectId(data.injuryId) },
          { 
            $push: { 
              pdfFiles: { $each: processedFiles }
            },
            $set: { updatedAt: new Date() }
          }
        );

        return NextResponse.json({
          success: true,
          data: { files: processedFiles }
        });
      }
    }

    // Create new injury if no injuryId provided
    const newInjury = {
      ...data,
      xrayImages: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
      prescription: "/placeholder.svg",
      pdfFiles: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('ams-injuries').insertOne(newInjury);

    return NextResponse.json({
      success: true,
      data: { 
        ...newInjury, 
        _id: result.insertedId.toString(),
        files: processedFiles 
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process injury data'
    }, { status: 500 });
  }
}

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
    const injuries = await db.collection('ams-injuries')
      .find({
        playerId,
        academyId,
        isDeleted: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Format the response to handle both certificate URL formats
    const formattedInjuries = injuries.map(injury => ({
      ...injury,
      _id: injury._id.toString(),
      // Combine both certificate URL fields into one
      certificationUrl: injury.certificateUrl || injury.certificationUrl || null
    }));

    return NextResponse.json({
      success: true,
      data: formattedInjuries
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch injuries'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();

    if (!data._id || !data.playerId || !data.academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const db = await getDatabase();
    const { _id, ...updateData } = data;

    const result = await db.collection('ams-injuries').findOneAndUpdate(
      { _id: new ObjectId(_id) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return NextResponse.json({
        success: false,
        error: 'Injury not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...result.value, _id: result.value._id.toString() }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update injury'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection('ams-injuries').updateOne(
      { _id: new ObjectId(id) },
      { $set: { isDeleted: true } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete injury'
    }, { status: 500 });
  }
}
