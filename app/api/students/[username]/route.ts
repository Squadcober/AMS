import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const username = params.username;

    const player = await db.collection("ams-player-data").findOne({ username });

    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    // Calculate performance metrics
    const performanceHistory = player.performanceHistory || [];
    
    // Filter valid entries for training performance
    const trainingEntries = performanceHistory.filter((p: any) => 
      (p.type === 'training' || !p.type) && // Include both explicitly marked training entries and old entries
      (p.sessionRating > 0 || p.rating > 0) // Only include entries with valid ratings
    );

    const trainingPerformance = trainingEntries.length > 0 
      ? trainingEntries.reduce((acc: number, curr: any) => 
          acc + (curr.sessionRating || curr.rating || 0), 0) / trainingEntries.length
      : 0;

    // Calculate match performance from entries with matchPoints
    const matchEntries = performanceHistory.filter((p: any) => 
      p.type === 'match' && 
      p.stats?.matchPoints?.current > 0
    );

    const matchPerformance = matchEntries.length > 0
      ? matchEntries.reduce((acc: number, curr: any) => 
          acc + (Number(curr.stats.matchPoints.current) || 0), 0) / matchEntries.length
      : 0;

    // Aggregate match statistics
    const matchStats = performanceHistory
      .filter((p: any) => p.type === 'match')
      .reduce((acc: any, curr: any) => ({
        goals: acc.goals + (curr.stats?.goals || 0),
        assists: acc.assists + (curr.stats?.assists || 0),
        cleanSheets: acc.cleanSheets + (curr.stats?.cleanSheets || 0)
      }), { goals: 0, assists: 0, cleanSheets: 0 });

    // Calculate overall rating from current attributes
    const attributes = player.attributes || {};
    const validAttributes = Object.values(attributes).filter((val: any) => 
      typeof val === 'number' && val > 0
    );
    
    const overallRating = validAttributes.length > 0
      ? validAttributes.reduce((acc: number, val: number) => acc + val, 0) / validAttributes.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        ...player,
        calculatedMetrics: {
          overallRating: Number(overallRating.toFixed(1)),
          trainingPerformance: Number(trainingPerformance.toFixed(1)),
          matchPerformance: Number(matchPerformance.toFixed(1)),
          matchStats
        }
      }
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: "Failed to fetch player data" },
      { status: 500 }
    );
  }
}
