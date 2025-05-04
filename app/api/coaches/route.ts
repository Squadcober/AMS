import { NextResponse } from 'next/server';

// Mock data - in a real application, this would come from a database
const coaches = [
  { id: 1, name: "Mike Johnson", age: 45, license: "UEFA Pro" },
  { id: 2, name: "Sarah Brown", age: 40, license: "UEFA A" },
];

export async function GET() {
  return NextResponse.json(coaches);
}

export async function POST(req: Request) {
  const newCoach = await req.json();
  coaches.push({ ...newCoach, id: coaches.length + 1 });
  return NextResponse.json(newCoach, { status: 201 });
}

