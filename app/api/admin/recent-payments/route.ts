import { NextResponse } from 'next/server';

export async function GET() {
  // In a real application, these would be fetched from a database
  const recentPayments = [
    { id: 1, player: "John Doe", amount: 500, date: "2023-07-01", status: "Paid" },
    { id: 2, player: "Jane Smith", amount: 500, date: "2023-07-02", status: "Pending" },
    { id: 3, player: "Mike Johnson", amount: 500, date: "2023-07-03", status: "Paid" },
  ];

  return NextResponse.json(recentPayments);
}

