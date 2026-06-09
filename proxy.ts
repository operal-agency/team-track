import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/apply']

// Routes that bypass proxy checks completely
const BYPASS_ROUTES = ['/_next', '/static', '/favicon.ico', '/media']

// Employee-only routes (restricted access)
const EMPLOYEE_ROUTES = ['/profile']

// Dashboard routes (admin/manager only)
const DASHBOARD_ROUTES = [
  '/',
  '/users',
  '/payroll',
  '/leaves',
  '/inventory',
  '/expenses',
  '/applicants',
  '/calendar',
  '/admin',
]

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const user = req.auth?.user

  // Bypass proxy checks for static assets
  if (BYPASS_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    // If already logged in and accessing login page, redirect to appropriate dashboard
    if (isLoggedIn && pathname === '/login') {
      const role = (user as any)?.role?.name
      const redirectPath = role === 'employee' ? '/profile' : '/'
      return NextResponse.redirect(new URL(redirectPath, req.url))
    }
    return NextResponse.next()
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based access control
  const role = (user as any)?.role?.name as 'admin' | 'manager' | 'employee' | undefined

  // Employee trying to access dashboard routes
  if (role === 'employee') {
    const isDashboardRoute = DASHBOARD_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/'),
    )
    if (isDashboardRoute) {
      return NextResponse.redirect(new URL('/profile', req.url))
    }
  }

  // Admin/Manager trying to access employee-only routes
  if (role === 'admin' || role === 'manager') {
    const isEmployeeRoute = EMPLOYEE_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + '/'),
    )
    if (isEmployeeRoute) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
