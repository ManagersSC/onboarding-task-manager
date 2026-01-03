import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { unsealData } from "iron-session"
import { getCached, setCached } from "@/lib/cache/dashboardCache"

// TTL cache for 60s
const CACHE_KEY = "admin-dashboard-overview"
const CACHE_TTL = 60 * 1000

// Minimal concurrency limiter
function pLimit(concurrency = 3) {
  let activeCount = 0
  const queue = []
  const next = () => {
    if (queue.length === 0 || activeCount >= concurrency) return
    const { fn, resolve, reject } = queue.shift()
    activeCount++
    Promise.resolve()
      .then(fn)
      .then((val) => {
        activeCount--
        resolve(val)
        next()
      })
      .catch((err) => {
        activeCount--
        reject(err)
        next()
      })
  }
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      next()
    })
}

export async function GET(req) {
  try {
    // Auth: admin only (reuse session)
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    if (!sealedSession) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    const session = await unsealData(sealedSession, { password: process.env.SESSION_SECRET })
    if (!session || session.userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Cache
    const cached = getCached(CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached)
    }

    const limiter = pLimit(3)
    const baseUrl = new URL(req.url).origin

    const tasks = [
      limiter(async () => {
        const res = await fetch(`${baseUrl}/api/admin/dashboard/quick-metrics`, { headers: { cookie: req.headers.get("cookie") || "" } })
        return res.ok ? await res.json() : null
      }),
      limiter(async () => {
        const res = await fetch(`${baseUrl}/api/admin/dashboard-activity?limit=15`, { headers: { cookie: req.headers.get("cookie") || "" } })
        return res.ok ? await res.json() : { activities: [] }
      }),
      limiter(async () => {
        const res = await fetch(`${baseUrl}/api/admin/dashboard/new-hires`, { headers: { cookie: req.headers.get("cookie") || "" } })
        return res.ok ? await res.json() : { newHires: [] }
      }),
      limiter(async () => {
        const res = await fetch(`${baseUrl}/api/admin/dashboard/resource-hub?page=1&pageSize=5`, { headers: { cookie: req.headers.get("cookie") || "" } })
        return res.ok ? await res.json() : { resources: [], totalCount: 0, page: 1, pageSize: 5 }
      }),
      limiter(async () => {
        const res = await fetch(`${baseUrl}/api/dashboard/tasks`, { headers: { cookie: req.headers.get("cookie") || "" } })
        return res.ok ? await res.json() : { tasks: { upcoming: [], overdue: [], flagged: [] } }
      }),
      limiter(async () => {
        const res = await fetch(`${baseUrl}/api/notifications?limit=5`, { headers: { cookie: req.headers.get("cookie") || "" } })
        return res.ok ? await res.json() : { notifications: [], totalUnread: 0 }
      }),
    ]

    const settled = await Promise.allSettled(tasks)
    const [metricsR, activityR, newHiresR, resourcesR, tasksDataR, notificationsR] = settled

    const metrics = metricsR.status === "fulfilled" ? metricsR.value : null
    const activity = activityR.status === "fulfilled" ? activityR.value : { activities: [] }
    const newHires = newHiresR.status === "fulfilled" ? newHiresR.value : { newHires: [] }
    const resources = resourcesR.status === "fulfilled" ? resourcesR.value : { resources: [], totalCount: 0, page: 1, pageSize: 5 }
    const tasksData = tasksDataR.status === "fulfilled" ? tasksDataR.value : { tasks: { upcoming: [], overdue: [], flagged: [] } }
    const notifications = notificationsR.status === "fulfilled" ? notificationsR.value : { notifications: [], totalUnread: 0 }

    const payload = {
      metrics,
      activities: activity?.activities || [],
      newHires: newHires?.newHires || [],
      resources: {
        items: resources?.resources || [],
        totalCount: resources?.totalCount ?? null,
        page: resources?.page ?? 1,
        pageSize: resources?.pageSize ?? 5,
        nextCursor: resources?.nextCursor || null,
      },
      tasks: tasksData?.tasks || { upcoming: [], overdue: [], flagged: [] },
      notificationsSummary: {
        totalUnread: notifications?.totalUnread || 0,
        latest: notifications?.notifications || [],
      },
      generatedAt: new Date().toISOString(),
    }

    setCached(CACHE_KEY, payload, CACHE_TTL)
    return NextResponse.json(payload)
  } catch (err) {
    return NextResponse.json({ error: "Failed to build overview", details: err.message }, { status: 500 })
  }
}


