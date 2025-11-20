import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/config';

type RedirectRule = {
  test: (pathname: string) => boolean;
  buildTarget: (request: NextRequest, pathname: string) => string;
};

const redirectRules: RedirectRule[] = [
  {
    test: (pathname) => pathname === '/project' || pathname === '/projects',
    buildTarget: (request) => new URL('/projects', request.url).toString()
  },
  {
    // Редиректим только /project/new на /projects/create, но не /projects/create на само себя
    test: (pathname) => pathname === '/project/new',
    buildTarget: (request) => new URL('/projects/create', request.url).toString()
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
    // Редиректим /projects/[id] на /pm/projects/[id], но исключаем /projects/create
    test: (pathname) => /^\/projects\/[^/]+/.test(pathname) && pathname !== '/projects/create',
    buildTarget: (request, pathname) => {
      const suffix = pathname.replace(/^\/projects/, '');
      return new URL(`/pm/projects${suffix}`, request.url).toString();
    }
  }
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Auth protection
  const isAppRoute = pathname.startsWith('/app');
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAppRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (req.auth?.user?.role !== 'admin') {
      return NextResponse.redirect(new URL('/app/dashboard', req.url));
    }
  }

  // Existing redirects
  // Пропускаем /projects/create - это специальный маршрут, который не должен редиректиться
  if (pathname === '/projects/create') {
    return NextResponse.next();
  }

  for (const rule of redirectRules) {
    if (rule.test(pathname)) {
      return NextResponse.redirect(rule.buildTarget(req, pathname), 308);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
