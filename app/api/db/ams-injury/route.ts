import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId, Document, UpdateFilter } from 'mongodb';

interface PdfFile {
  name: string;
  url: string;
  type: string;
}

interface InjuryDocument extends Document {
  _id: ObjectId;
  playerId: string;
  academyId: string;
  xrayImages: string[];
  prescription: string;
  pdfFiles: PdfFile[];
  createdAt: Date;
  updatedAt: Date;
  isDeleted?: boolean;
}

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

      const updateDoc: any = {
        $push: {
          pdfFiles: { $each: processedFiles }
        },
        $set: { updatedAt: new Date() }
      };

      const result = await db.collection<InjuryDocument>('ams-injuries').findOneAndUpdate(
        { _id: new ObjectId(data.injuryId) },
        updateDoc as any,
        { returnDocument: 'after' }
      );

      if (!result || !result.value) {
        return NextResponse.json({
          success: false,
          error: 'Injury not found'
        }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: {
          files: processedFiles,
          _id: result.value._id.toString()
        }
      });
    }

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

    if (data.type === 'xray' || data.type === 'prescription') {
      if (data.injuryId) {
        const updateField = data.type === 'xray' 
          ? `xrayImages.${data.imageIndex}` 
          : 'prescription';

        await db.collection<InjuryDocument>('ams-injuries').updateOne(
          { _id: new ObjectId(data.injuryId) },
          { 
            $set: { 
              [updateField]: processedFiles[0].url,
              updatedAt: new Date()
            }
          }
        );

        const updatedInjury = await db.collection<InjuryDocument>('ams-injuries').findOne(
          { _id: new ObjectId(data.injuryId) }
        );

        return NextResponse.json({
          success: true,
          data: { ...updatedInjury, files: processedFiles }
        });
      }
    } else if (data.type === 'pdf') {
      if (data.injuryId) {
        await db.collection<InjuryDocument>('ams-injuries').updateOne(
          { _id: new ObjectId(data.injuryId) },
          { 
            $push: { 
              pdfFiles: { $each: processedFiles }
            },
            $set: { updatedAt: new Date() }
          } as any // <-- Add this cast to fix the type error
        );

        return NextResponse.json({
          success: true,
          data: { files: processedFiles }
        });
      }
    }

    const newInjury: InjuryDocument = {
      ...data,
      xrayImages: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
      prescription: "/placeholder.svg",
      pdfFiles: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection<InjuryDocument>('ams-injuries').insertOne(newInjury);

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
    const injuries = await db.collection<InjuryDocument>('ams-injuries')
      .find({
        playerId,
        academyId,
        isDeleted: { $ne: true }
      })
      .sort({ createdAt: -1 })
      .toArray();

    const formattedInjuries = injuries.map(injury => ({
      ...injury,
      _id: injury._id.toString(),
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

    const result = await db.collection<InjuryDocument>('ams-injuries').findOneAndUpdate(
      { _id: new ObjectId(_id) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result || !result.value) {
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
    await db.collection<InjuryDocument>('ams-injuries').updateOne(
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
