import { NextResponse } from 'next/server';

// Simple in-memory store for rate limiting
const rateLimitStore = new Map();

// Cleanup interval in milliseconds (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Last cleanup timestamp
let lastCleanup = Date.now();

// Rate limiter middleware
export function rateLimiter(limit = 5, windowMs = 60 * 1000) {
  return (req) => {
    // VULN-H8: Use x-real-ip (Vercel-provided, non-spoofable), fallback to first IP from forwarded-for
    const realIp = req.headers.get('x-real-ip');
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1');
    const now = Date.now();
    const windowStart = now - windowMs;

    // Perform cleanup if enough time has passed
    if (now - lastCleanup >= CLEANUP_INTERVAL) {
      for (const [key, timestamps] of rateLimitStore.entries()) {
        const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
        if (validTimestamps.length === 0) {
          rateLimitStore.delete(key);
        } else {
          rateLimitStore.set(key, validTimestamps);
        }
      }
      lastCleanup = now;
    }

    // Get or initialize the request timestamps for this IP
    const timestamps = rateLimitStore.get(ip) || [];
    
    // Remove timestamps outside the current window
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
    
    // Check if we've exceeded the limit
    if (validTimestamps.length >= limit) {
      // Calculate time until reset
      const oldestTimestamp = validTimestamps[0];
      const resetTime = oldestTimestamp + windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      return NextResponse.json(
        { 
          error: 'Too many requests, please try again later.',
          retryAfter
        },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      );
    }

    // Add the current timestamp
    validTimestamps.push(now);
    rateLimitStore.set(ip, validTimestamps);

    // Return null to indicate request should proceed through middleware
    return null;
  };
} 