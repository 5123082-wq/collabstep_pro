import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
    test: (pathname) => pathname === '/project/new' || pathname === '/projects/create',
    buildTarget: (request) => new URL('/projects/create', request.url).toString()
  },
  {
    test: (pathname) => /^\/project\/[^/]+/.test(pathname),
    buildTarget: (request, pathname) => {
      const suffix = pathname.replace(/^\/project/, '');
      return new URL(`/pm/projects${suffix}`, request.url).toString();
    }
  },
  {
    test: (pathname) => /^\/projects\/[^/]+/.test(pathname),
    buildTarget: (request, pathname) => {
      const suffix = pathname.replace(/^\/projects/, '');
      return new URL(`/pm/projects${suffix}`, request.url).toString();
    }
  }
];

export function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);
  for (const rule of redirectRules) {
    if (rule.test(pathname)) {
      return NextResponse.redirect(rule.buildTarget(request, pathname), 308);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/project/:path*', '/projects/:path*']
};
