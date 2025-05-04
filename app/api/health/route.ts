import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/mongodb';

export async function GET() {
  try {
    const isConnected = await checkDatabaseConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed'
      }, { status: 503 });
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
