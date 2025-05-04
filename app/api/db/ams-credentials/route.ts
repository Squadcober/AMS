import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const academyId = searchParams.get('academyId');

    console.log('GET credentials - Query params:', { userId, academyId });

    if (!userId || !academyId) {
      console.error('Missing required parameters:', { userId, academyId });
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    const db = await getDatabase();
    
    // Update query to use exact string match for userId
    const query = { 
      userId: userId,  // Using exact string match
      academyId,
      isDeleted: { $ne: true }
    };
    console.log('Database query:', JSON.stringify(query, null, 2));

    const credentials = await db.collection('ams-credentials')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Found ${credentials.length} credentials for userId:`, userId);

    return NextResponse.json({
      success: true,
      data: credentials.map(cred => ({
        ...cred,
        _id: cred._id.toString()
      }))
    });

  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch credentials'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Received credential data:', data);

    // Validate required fields with detailed logging
    const requiredFields = ['title', 'issuer', 'date', 'userId', 'academyId'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      console.error('Validation failed: Missing fields:', missingFields, 'Data:', data);
      return NextResponse.json({ 
        success: false, 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        receivedData: data
      }, { status: 400 });
    }

    const db = await getDatabase();

    // Verify user exists in ams-users collection using the id field
    const user = await db.collection('ams-users').findOne({ id: data.userId });
    if (!user) {
      console.error('User not found:', data.userId);
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 400 });
    }

    const documentToInsert = {
      ...data,
      createdAt: new Date().toISOString(),
      isDeleted: false
    };

    console.log('Inserting credential:', documentToInsert);

    const result = await db.collection('ams-credentials').insertOne(documentToInsert);
    console.log('Credential created:', result.insertedId);

    const createdDocument = {
      _id: result.insertedId.toString(),
      ...documentToInsert
    };

    return NextResponse.json({
      success: true,
      data: createdDocument
    });

  } catch (error) {
    console.error('Error creating credential:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create credential'
    }, { status: 500 });
  }
}
