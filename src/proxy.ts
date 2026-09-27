/**
 * Route guard. Named proxy.ts since Next.js 16, which deprecated middleware.ts;
 * the default export still works. Pages and actions check again themselves —
 * this is the first gate, not the only one.
 */
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin pages guard
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: ['/portal/:path*', '/admin/:path*'],
};
