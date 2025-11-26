import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/base-config';
import { decodeDemoSession, DEMO_SESSION_COOKIE, isDemoAdminEmail } from '@/lib/auth/demo-session';

type RedirectRule = {
  test: (pathname: string) => boolean;
  buildTarget: (request: NextRequest, pathname: string) => string;
};

const redirectRules: RedirectRule[] = [
  {
    // Редиректим только /project (единственное число) на /projects (множественное число)
    // НЕ редиректим /projects на само себя
    test: (pathname) => pathname === '/project',
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
function isAdminUser(req: NextRequest & { auth?: any }): boolean {
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
function isLoggedIn(req: NextRequest & { auth?: any }): boolean {
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
  
  // CRITICAL: Пропускаем /projects и /projects/create ПЕРЕД любыми другими проверками
  // Это предотвращает редиректы и бесконечные циклы
  // Также исключаем эти пути из правил редиректов
  // Также пропускаем RSC prefetch запросы (они имеют заголовок RSC)
  // Next.js uses various headers for prefetch: RSC, Next-Router-Prefetch, x-middleware-prefetch
  const isRscPrefetch = 
    req.headers.get('RSC') === '1' || 
    req.headers.get('Next-Router-Prefetch') === '1' ||
    req.headers.get('x-middleware-prefetch') === '1' ||
    req.headers.get('purpose') === 'prefetch' ||
    req.headers.get('x-nextjs-data') === '1';
  
  if (pathname === '/projects' || pathname === '/projects/create') {
    // Для RSC prefetch запросов просто пропускаем без проверок
    // Это предотвращает redirect loops во время prefetch
    if (isRscPrefetch) {
      return NextResponse.next();
    }
    
    const loggedIn = isLoggedIn(req);
    
    // Проверяем авторизацию для /projects
    if (!loggedIn) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    // Разрешаем доступ без редиректов - НЕ применяем правила редиректов
    return NextResponse.next();
  }
  
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

  // Existing redirects - применяем только если путь не /projects или /projects/create
  // (это уже проверено выше, но на всякий случай)
  if (pathname !== '/projects' && pathname !== '/projects/create') {
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
