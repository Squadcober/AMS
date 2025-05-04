import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow access to all dashboard routes without authentication
  return NextResponse.next()
}

export const config = {
  matcher: '/dashboard/:path*',
}

