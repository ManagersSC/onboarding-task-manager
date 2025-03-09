// src/middleware.js
import { NextResponse } from 'next/server'

export function middleware(request) {
  const path = request.nextUrl.pathname
  const isPublic = path === '/login' || path === '/signup' || path === '/forgot-password'
  const token = request.cookies.get('user_email')?.value

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  return NextResponse.next()
}

export const condif = {
  matcher: ['/dashboard/:path*', '/api/get-tasks', '/api/complete-task'],
}