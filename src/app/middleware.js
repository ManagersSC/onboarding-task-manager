// src/middleware.js (FIXED - Remove duplicate dashboard code)
import { NextResponse } from 'next/server'

export function middleware(request) {
  const path = request.nextUrl.pathname
  const isPublic = path === '/login'
  const token = request.cookies.get('user_email')?.value

  if (!isPublic && !token) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  return NextResponse.next()
}