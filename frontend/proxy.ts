import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Route guard proxy — enforces authentication and role-based access
 * at the Next.js edge before any page renders.
 *
 * Reads `auth_role` cookie set by persistAuthSession() on login.
 * Cleared by clearAuthCookies() on logout / 401 / 403.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Debug logging
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    console.log(`[Proxy] ${pathname} - cookies:`, {
      auth_role: request.cookies.get('auth_role')?.value,
      allCookies: request.cookies.getAll().map(c => c.name)
    })
  }

  // Public routes that never require auth
  const publicPrefixes = ['/login', '/register', '/onboarding', '/_next', '/api', '/favicon']
  if (publicPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Role from client cookie (set on login, cleared on logout)
  const role = request.cookies.get('auth_role')?.value

  // Dashboard routes require authentication
  if (pathname.startsWith('/dashboard')) {
    if (!role) {
      console.log(`[Proxy] Redirecting ${pathname} to /login - no auth_role cookie`)
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Admin/Manager only routes
    const adminRoutes = ['/dashboard/organization']
    if (adminRoutes.some((r) => pathname.startsWith(r))) {
      if (role === 'DRIVER') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
