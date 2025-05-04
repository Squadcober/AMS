import { NextResponse } from 'next/server';

export async function GET() {
  // In a real application, these would be fetched from a database
  const stats = {
    totalPlayers: 150,
    activeCoaches: 12,
    ongoingSessions: 8,
    revenueThisMonth: 15000,
  };

  return NextResponse.json(stats);
}

