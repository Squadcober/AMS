import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('URI:', process.env.MONGODB_URI?.substring(0, 20) + '...');
    console.log('Database:', process.env.MONGODB_DB);
    
    const client = await clientPromise;
    console.log('Client connection established');
    
    const db = client.db(process.env.MONGODB_DB);
    console.log('Database selected:', process.env.MONGODB_DB);
    
    // Test the connection
    await db.command({ ping: 1 });
    console.log("Ping successful!");
    
    // Create test document in academy collection
    const testResult = await db.collection('ams-academy').insertOne({
      id: 'test',
      name: 'Test Academy',
      location: 'Test Location',
      contact: 'Test Contact',
      email: 'test@test.com',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('Test document created:', testResult);
    
    // Get all collections and their counts
    const collections = await db.listCollections().toArray();
    console.log('Found collections:', collections.map(c => c.name));
    
    const stats: { [key: string]: number } = {};
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      stats[collection.name] = count;
      console.log(`Collection ${collection.name} has ${count} documents`);
    }

    return NextResponse.json({ 
      status: 'Connected',
      database: process.env.MONGODB_DB,
      collections: stats,
      testInsert: testResult.acknowledged ? 'success' : 'failed'
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return NextResponse.json(
      { 
        error: 'Database connection failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
