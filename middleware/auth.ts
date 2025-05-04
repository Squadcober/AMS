import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verify } from 'jsonwebtoken'

export async function middleware(request: NextRequest) {
  // Skip authentication for owner dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard/Owner')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = verify(token, JWT_SECRET) as any;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-role', decoded.role);
    requestHeaders.set('x-academy-id', decoded.academyId);

    // Handle root dashboard route
    if (request.nextUrl.pathname === '/dashboard' || request.nextUrl.pathname === '/dashboard/admin') {
      const roleRedirectMap: { [key: string]: string } = {
        admin: '/dashboard/admin/about',
        coach: '/dashboard/coach/profile',
        student: '/dashboard/student/profile',
        coordinator: '/dashboard/coordinator/overview',
        owner: '/dashboard/Owner/academy-management'
      };

      const redirectUrl = roleRedirectMap[decoded.role];
      if (redirectUrl) {
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }

    // Role-based access control
    const pathRole = request.nextUrl.pathname.split('/')[2]; // Gets 'admin', 'coach', etc.
    if (pathRole && pathRole.toLowerCase() !== decoded.role.toLowerCase()) {
      const userDashboard = `/dashboard/${decoded.role.toLowerCase()}/profile`;
      return NextResponse.redirect(new URL(userDashboard, request.url));
    }

    return NextResponse.next({
      headers: requestHeaders,
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.redirect(new URL('/auth', request.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth']
};
