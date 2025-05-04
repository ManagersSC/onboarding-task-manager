import { NextResponse } from 'next/server';

// Simple in-memory store for rate limiting
const rateLimitStore = new Map();

// Rate limiter middleware
export function rateLimiter(limit = 5, windowMs = 60 * 1000) {
  return (req) => {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or initialize the request timestamps for this IP
    const timestamps = rateLimitStore.get(ip) || [];
    
    // Remove timestamps outside the current window
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
    
    // Check if we've exceeded the limit
    if (validTimestamps.length >= limit) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later.' },
        { status: 429 }
      );
    }

    // Add the current timestamp
    validTimestamps.push(now);
    rateLimitStore.set(ip, validTimestamps);

    // Clean up old entries periodically (every 5 minutes)
    if (now % (5 * 60 * 1000) === 0) {
      for (const [key, timestamps] of rateLimitStore.entries()) {
        const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
        if (validTimestamps.length === 0) {
          rateLimitStore.delete(key);
        } else {
          rateLimitStore.set(key, validTimestamps);
        }
      }
    }

    return null;
  };
} 