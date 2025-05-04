import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

// Helper function to generate unique ID
function generateUniqueId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
}

// Add this helper function
const createRoleSpecificData = async (db: any, userData: any, userId: string) => {
  try {
    switch (userData.role) {
      case 'student':
        const playerCollection = db.collection('ams-player-data');
        const playerId = generateUniqueId('player');
        const playerData = {
          id: playerId,
          userId: userId,
          username: userData.username,
          password: userData.password,
          name: userData.name,
          email: userData.email,
          academyId: userData.academyId,
          role: 'student',
          position: "",
          playingStyle: "",
          photoUrl: "",
          attributes: {
            shooting: 0,
            pace: 0,
            positioning: 0,
            passing: 0,
            ballControl: 0,
            crossing: 0,
            overall: 0,
            averagePerformance: 0,
            stamina: 0
          },
          performanceHistory: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await playerCollection.insertOne(playerData);
        break;

      case 'coach':
        const coachCollection = db.collection('ams-coaches');
        const coachData = {
          id: generateUniqueId('coach'),
          userId: userId,
          username: userData.username,
          password: userData.password,
          name: userData.name,
          email: userData.email,
          academyId: userData.academyId,
          role: 'coach',
          specialization: "",
          experience: "",
          assignedBatches: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await coachCollection.insertOne(coachData);
        break;

      case 'admin':
        const adminCollection = db.collection('ams-admins');
        const adminData = {
          id: generateUniqueId('admin'),
          userId: userId,
          username: userData.username,
          password: userData.password,
          name: userData.name,
          email: userData.email,
          academyId: userData.academyId,
          role: 'admin',
          permissions: ['manage_users', 'manage_sessions', 'manage_batches'],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await adminCollection.insertOne(adminData);
        break;

      case 'coordinator':
        const coordinatorCollection = db.collection('ams-coordinators');
        const coordinatorData = {
          id: generateUniqueId('coordinator'),
          userId: userId,
          username: userData.username,
          password: userData.password,
          name: userData.name,
          email: userData.email,
          academyId: userData.academyId,
          role: 'coordinator',
          assignedAreas: [],
          responsibilities: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await coordinatorCollection.insertOne(coordinatorData);
        break;
    }
  } catch (error) {
    console.error('Error creating role-specific data:', error);
    throw error;
  }
};

export async function POST(request: NextRequest) {
  try {
    let data;
    try {
      data = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { username, password, email, name, role, academyId } = data;

    if (!username || !password || !email || !name || !role || !academyId) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Check if the user already exists
    const existingUser = await db.collection("ams-users").findOne({ username });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Username already exists" },
        { status: 400 }
      );
    }

    // Generate user ID using the same format
    const timestamp = Date.now();
    const userId = `user_${Math.random().toString(36).substr(2, 8)}_${timestamp}`;
    const currentDate = new Date(timestamp);

    // Create the new user
    const newUser = {
      username,
      password, // Note: Password should be hashed in production
      email,
      name,
      role,
      academyId,
      createdAt: currentDate,
      status: "active",
      id: userId,
      updatedAt: currentDate,
    };

    const result = await db.collection("ams-users").insertOne(newUser);

    try {
      // Create role-specific data with the generated userId
      await createRoleSpecificData(db, data, userId);
    } catch (error) {
      // If role-specific creation fails, delete the user
      await db.collection("ams-users").deleteOne({ _id: result.insertedId });
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: newUser,
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error("Error in signup route:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create user" 
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

