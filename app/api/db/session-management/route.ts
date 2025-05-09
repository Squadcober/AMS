import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const academyId = searchParams.get('academyId');
    const userId = searchParams.get('userId');

    if (!academyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'academyId is required' 
      }, { status: 400 });
    }

    const db = await getDatabase();

    switch (action) {
      case 'getSessions':
        const sessions = await db.collection('ams-sessions')
          .find({ academyId, isDeleted: { $ne: true } })
          .toArray();
        return NextResponse.json({ success: true, data: sessions });

      case 'getUserSessions':
        if (!userId) {
          return NextResponse.json({ 
            success: false, 
            error: 'userId is required' 
          }, { status: 400 });
        }
        const userSessions = await db.collection('ams-sessions')
          .find({ userId, academyId, isDeleted: { $ne: true } })
          .toArray();
        return NextResponse.json({ success: true, data: userSessions });

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Session management error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, ...data } = await request.json();
    const db = await getDatabase();

    switch (action) {
      case 'addSession':
        const result = await db.collection('ams-sessions').insertOne({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return NextResponse.json({ 
          success: true, 
          data: { ...data, _id: result.insertedId }
        });

      case 'updateStatus':
        interface SessionUpdate {
          _id: string;
          status: string;
        }
        const { sessions } = data;
        const bulkOps = sessions.map((session: SessionUpdate) => ({
          updateOne: {
            filter: { _id: new ObjectId(session._id) },
            update: { 
              $set: { 
                status: session.status, 
                updatedAt: new Date() 
              } 
            }
          }
        }));
        await db.collection('ams-sessions').bulkWrite(bulkOps);
        return NextResponse.json({ success: true });

      case 'updateMetrics':
        const { sessionId, playerId, metrics } = data;
        await db.collection('ams-sessions').updateOne(
          { _id: new ObjectId(sessionId) },
          {
            $set: {
              [`playerMetrics.${playerId}`]: metrics,
              updatedAt: new Date()
            }
          }
        );
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Session management error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
