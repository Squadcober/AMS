import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = cookies();
  
  // Clear all possible cookies
  const allCookies = cookieStore.getAll();
  allCookies.forEach(cookie => {
    cookies().delete(cookie.name);
  });

  return NextResponse.json(
    { message: 'Logged out successfully' },
    {
      status: 200,
      headers: {
        'Clear-Site-Data': '"cache", "cookies", "storage"',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

