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
    // Support both JSON and multipart/form-data
    let data: any = {};
    let files: File[] = [];

    // Detect if the request is multipart/form-data (for file uploads)
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      // Fix: getAll returns (File | string)[], filter for File only
      files = formData.getAll('files').filter(f => typeof f !== "string") as File[];
      data = JSON.parse(formData.get('data') as string);
    } else {
      // Handle JSON body for normal injury creation/update
      data = await request.json();
    }

    if (!data.playerId || !data.academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const db = await getDatabase();

    // Handle PDF upload
    if (data.type === 'pdf' && files.length > 0) {
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          // Fix: Use Buffer.from(new Uint8Array(await file.arrayBuffer()))
          const buffer = Buffer.from(new Uint8Array(await file.arrayBuffer()));
          const base64 = buffer.toString('base64');
          return {
            name: file.name,
            url: `data:application/pdf;base64,${base64}`,
            type: 'pdf'
          };
        })
      );

      // Ensure injuryId is provided
      if (!data.injuryId) {
        return NextResponse.json({
          success: false,
          error: 'Injury ID is required for PDF upload'
        }, { status: 400 });
      }

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

    // Handle xray/prescription image upload
    if ((data.type === 'xray' || data.type === 'prescription') && files.length > 0) {
      if (data.injuryId) {
        const processedFiles = await Promise.all(
          files.map(async (file) => {
            const buffer = await file.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            return {
              name: file.name,
              type: file.type,
              url: `data:${file.type};base64,${base64}`
            };
          })
        );
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
    }

    // Handle new injury creation (JSON body, not multipart)
    if (!data._id) {
      // New injury
      const newInjury: InjuryDocument = {
        ...data,
        xrayImages: data.xrayImages && data.xrayImages.length === 3
          ? data.xrayImages
          : ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
        prescription: data.prescription || "/placeholder.svg",
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
        }
      });
    } else {
      // Update existing injury (PUT-like behavior)
      const { _id, ...updateData } = data;

      // Remove _id from updateData to avoid MongoDB immutable field error
      if (updateData._id) delete updateData._id;

      // Ensure updatedAt is always set
      updateData.updatedAt = new Date();

      // Only update fields that are present in updateData
      const result = await db.collection<InjuryDocument>('ams-injuries').findOneAndUpdate(
        { _id: new ObjectId(_id) },
        { $set: updateData },
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
    }
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

    // Fix: Accept both string and ObjectId for _id, and ensure _id is a valid ObjectId string
    if (!data._id || !data.playerId || !data.academyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    const db = await getDatabase();
    const { _id, ...updateData } = data;

    // Remove _id from updateData to avoid immutable field error
    if (updateData._id) delete updateData._id;

    // Always update updatedAt
    updateData.updatedAt = new Date();

    // Fix: Ensure _id is a valid ObjectId string
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(_id);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid injury _id'
      }, { status: 400 });
    }

    // Only update fields that are present in updateData
    const result = await db.collection<InjuryDocument>('ams-injuries').findOneAndUpdate(
      { _id: objectId },
      { $set: updateData },
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
