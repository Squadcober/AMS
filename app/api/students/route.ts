import { NextResponse } from 'next/server';

// Mock data - in a real application, this would come from a database
const students = [
  { id: 1, name: "John Doe", age: 20, position: "Forward" },
  { id: 2, name: "Jane Smith", age: 22, position: "Midfielder" },
];

export async function GET() {
  return NextResponse.json(students);
}

export async function POST(req: Request) {
  const newStudent = await req.json();
  students.push({ ...newStudent, id: students.length + 1 });
  return NextResponse.json(newStudent, { status: 201 });
}

