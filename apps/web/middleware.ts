import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/base-config';
import { decodeDemoSession, DEMO_SESSION_COOKIE, isDemoAdminEmail } from '@/lib/auth/demo-session';
type AuthenticatedRequest = NextRequest & { auth?: { user?: { role?: string } } | null };

type RedirectRule = {
  test: (pathname: string) => boolean;
  buildTarget: (request: NextRequest, pathname: string) => string;
};

const redirectRules: RedirectRule[] = [
  {
    // Редиректим /project (единственное число) на /pm/projects
    test: (pathname) => pathname === '/project',
    buildTarget: (request) => new URL('/pm/projects', request.url).toString()
  },
  {
    // Редиректим /project/new на /pm/projects/create
    test: (pathname) => pathname === '/project/new',
    buildTarget: (request) => new URL('/pm/projects/create', request.url).toString()
  },
  {
    // Редиректим /project/[id] на /pm/projects/[id]
    test: (pathname) => /^\/project\/[^/]+/.test(pathname) && pathname !== '/project/new',
    buildTarget: (request, pathname) => {
      const suffix = pathname.replace(/^\/project/, '');
      return new URL(`/pm/projects${suffix}`, request.url).toString();
    }
  },
  {
    // Редиректим /projects на /pm/projects (включая /projects/create)
    test: (pathname) => pathname === '/projects' || pathname.startsWith('/projects/'),
    buildTarget: (request, pathname) => {
      const suffix = pathname.replace(/^\/projects/, '');
      return new URL(`/pm/projects${suffix}`, request.url).toString();
    }
  }
];

// Helper function to get demo session from request (Edge runtime compatible)
function getDemoSessionFromRequest(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const cookies = Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [key, ...rest] = part.split('=');
        return [key, rest.join('=')];
      })
  );

  const sessionCookie = cookies[DEMO_SESSION_COOKIE];
  if (!sessionCookie) {
    return null;
  }

  return decodeDemoSession(sessionCookie);
}

// Helper function to check if user is admin (checks both NextAuth and demo session)
function isAdminUser(req: AuthenticatedRequest): boolean {
  // Check NextAuth session
  if (req.auth?.user?.role === 'admin') {
    return true;
  }

  // Check demo session
  const demoSession = getDemoSessionFromRequest(req);
  if (demoSession) {
    return demoSession.role === 'admin' || isDemoAdminEmail(demoSession.email);
  }

  return false;
}

// Helper function to check if user is logged in (checks both NextAuth and demo session)
function isLoggedIn(req: AuthenticatedRequest): boolean {
  // Check NextAuth session
  if (req.auth) {
    return true;
  }

  // Check demo session
  const demoSession = getDemoSessionFromRequest(req);
  return demoSession !== null;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  
  const loggedIn = isLoggedIn(req);

  // Auth protection
  const isAppRoute = pathname.startsWith('/app');
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAppRoute && !loggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAdminRoute) {
    if (!loggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (!isAdminUser(req)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // Apply redirect rules
  for (const rule of redirectRules) {
    if (rule.test(pathname)) {
      const target = rule.buildTarget(req, pathname);
      const targetUrl = new URL(target);
      // Дополнительная проверка: не редиректим на тот же путь
      // Сравниваем только pathname, игнорируя query параметры
      if (targetUrl.pathname !== pathname) {
        return NextResponse.redirect(target, 308);
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - _vercel (Vercel internal routes)
     */
    '/((?!api|_next/static|_next/image|_vercel|favicon.ico).*)'
  ]
};
