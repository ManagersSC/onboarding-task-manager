# Server-Side Caching in Dashboard API Endpoints

## What is Server-Side Caching?
Server-side caching is a technique where the server temporarily stores ("caches") the results of expensive or frequently requested operations in memory. When a new request comes in for the same data, the server can return the cached result instantly, rather than recomputing or refetching it from a slow or rate-limited backend (like Airtable or Google Calendar).

## Why Use Server-Side Caching?
- **Performance:** Dramatically reduces response times for repeated requests.
- **Reliability:** Reduces the risk of hitting third-party API rate limits (Airtable, Google Calendar, etc.).
- **Scalability:** Handles higher traffic without overloading your backend or third-party services.
- **Cost:** Minimizes the number of external API calls, which may be rate-limited or billed.

## How Does It Work?
- Each API handler keeps a module-level cache variable (in-memory, per server instance).
- When a request comes in, the handler checks if a valid cache entry exists for the request parameters.
- If a valid cache is found (not expired), it returns the cached data immediately.
- If not, it fetches fresh data, stores it in the cache, and returns it.
- Each cache entry has a Time-To-Live (TTL), after which it is considered stale and will be refreshed on the next request.

## Which Endpoints Use Server-Side Caching?
- **Quick Metrics:** `/api/admin/dashboard/quick-metrics`
  - Caches only two dashboard metrics for 60 seconds: Active Onboardings and Tasks Due This Week.
  - Each metric is fetched as a count from a specific Airtable view (see API reference for details).
- **Resource Hub:** `/api/admin/dashboard/resource-hub`  
  Caches resource file lists for 60 seconds, keyed by search query, page, and page size.
- **Calendar:** `/api/admin/dashboard/calendar`  
  Caches calendar event lists for 60 seconds, keyed by start and end time parameters.

## Example Pattern
```js
// At the top of your API route file
let cache = {};
const CACHE_TTL = 60 * 1000; // 60 seconds

// In your handler
const cacheKey = JSON.stringify({ ...relevantParams });
const now = Date.now();
if (cache[cacheKey] && (now - cache[cacheKey].time < CACHE_TTL)) {
  return Response.json(cache[cacheKey].data);
}
// ...fetch fresh data...
cache[cacheKey] = { data: result, time: now };
return Response.json(result);
```

## Best Practices
- **Choose a sensible TTL:** 30–120 seconds is typical for dashboard data.
- **Key the cache by all relevant query parameters** to avoid serving the wrong data.
- **Do not use for POST, PATCH, DELETE, or real-time endpoints.**
- **For multi-server deployments:** Use a distributed cache (like Redis) instead of in-memory.
- **Monitor cache hit/miss rates** if you want to optimize further.

## When Not to Use
- For endpoints that mutate data or require real-time accuracy.
- For user-specific or highly dynamic data (prefer client-side caching like SWR).

## Extending This Pattern
- You can add server-side caching to any GET endpoint that is read-heavy and not user-specific.
- For more advanced needs, consider using a shared cache (Redis, Memcached) or CDN/edge caching.

---

**This pattern is now implemented in your dashboard's most important endpoints for a faster, more scalable admin experience.** 