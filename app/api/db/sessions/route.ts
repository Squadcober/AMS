'use server'


import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
    try {
        const db = await getDatabase();
        
        // Fetch all sessions from the database
        const sessions = await db.collection('ams-sessions').find({}).toArray();
        
        console.log('Fetched sessions:', sessions);
        
        return NextResponse.json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch sessions' },
            { status: 500 }
        );
    }
}
