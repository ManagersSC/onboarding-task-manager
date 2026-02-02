"use client"

import { useEffect, useMemo, useRef, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card"
import { Button } from "@components/ui/button"
import { Input } from "@components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select"
import { Skeleton } from "@components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { CustomCalendar } from "@components/dashboard/subComponents/custom-calendar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { Download, Filter, Calendar as CalendarIcon } from "lucide-react"

function useQueryState() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const setParams = (entries) => {
    const sp = new URLSearchParams(Array.from(searchParams.entries()))
    Object.entries(entries || {}).forEach(([k, v]) => {
      if (v == null || v === "") sp.delete(k)
      else sp.set(k, String(v))
    })
    router.replace(`/admin/audit-logs?${sp.toString()}`)
  }
  const setParam = (k, v) => setParams({ [k]: v })
  return { searchParams, setParam, setParams }
}

function maskIp(ip) {
  if (!ip) return ""
  const parts = ip.split(".")
  if (parts.length !== 4) return ip
  return `${parts[0]}.${parts[1]}.***.***`
}

function parseUaSummary(ua) {
  if (!ua) return ""
  const isChrome = ua.includes("Chrome") && !ua.includes("Edg")
  const isEdge = ua.includes("Edg")
  const isFirefox = ua.includes("Firefox")
  const isSafari = ua.includes("Safari") && !ua.includes("Chrome")
  const os = ua.includes("Windows") ? "Windows" : ua.includes("Mac OS") ? "macOS" : ua.includes("Linux") ? "Linux" : ""
  const browser = isChrome ? "Chrome" : isEdge ? "Edge" : isFirefox ? "Firefox" : isSafari ? "Safari" : "Other"
  return [browser, os].filter(Boolean).join(" on ")
}

function formatTimestamp(ts) {
  try {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return ts
    return d.toLocaleString()
  } catch {
    return ts
  }
}

function toLocalDatetimeInput(iso) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    const pad = (n) => String(n).padStart(2, "0")
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
  } catch {
    return ""
  }
}

function fromLocalDatetimeInput(val) {
  const d = new Date(val)
  return Number.isNaN(d.getTime()) ? "" : d.toISOString()
}

function composeIso(dateObj, hours, minutes) {
  if (!dateObj) return ""
  const d = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    Number(hours) || 0,
    Number(minutes) || 0,
    0,
    0,
  )
  return d.toISOString()
}

function extractLocalParts(iso) {
  if (!iso) {
    const now = new Date()
    return { date: now, hours: String(now.getHours()).padStart(2, "0"), minutes: String(now.getMinutes()).padStart(2, "0") }
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    const now = new Date()
    return { date: now, hours: String(now.getHours()).padStart(2, "0"), minutes: String(now.getMinutes()).padStart(2, "0") }
  }
  return {
    date: d,
    hours: String(d.getHours()).padStart(2, "0"),
    minutes: String(d.getMinutes()).padStart(2, "0"),
  }
}

function DateTimePicker({ label, value, onChange }) {
  const { date, hours: initH, minutes: initM } = extractLocalParts(value)
  const [open, setOpen] = useState(false)
  const [pickedDate, setPickedDate] = useState(date)
  const [hh, setHh] = useState(initH)
  const [mm, setMm] = useState(initM)

  useEffect(() => {
    const { date: d, hours, minutes } = extractLocalParts(value)
    setPickedDate(d)
    setHh(hours)
    setMm(minutes)
  }, [value])

  const display = value ? pickedDate.toLocaleDateString() + " " + `${hh}:${mm}` : label
  const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"))
  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[220px] justify-start text-left font-normal bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 h-9"
          onClick={() => setOpen(true)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {display}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto flex-col space-y-2 p-2 pointer-events-auto z-50">
        <div className="rounded-md border">
          <CustomCalendar selected={pickedDate} onSelect={(d) => d && setPickedDate(d)} />
        </div>
        <div className="flex items-center gap-2">
          <Select value={hh} onValueChange={(v) => setHh(v)}>
            <SelectTrigger className="w-[90px]"><SelectValue placeholder="HH" /></SelectTrigger>
            <SelectContent>
              {hourOptions.map((h) => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm">:</span>
          <Select value={mm} onValueChange={(v) => setMm(v)}>
            <SelectTrigger className="w-[90px]"><SelectValue placeholder="MM" /></SelectTrigger>
            <SelectContent>
              {minuteOptions.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              const iso = composeIso(pickedDate, hh, mm)
              onChange(iso)
              setOpen(false)
            }}
            className="h-9"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AuditLogsClient() {
  const { searchParams, setParam, setParams } = useQueryState()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(Number(searchParams.get("page") || 1))
  const [pageSize, setPageSize] = useState(Number(searchParams.get("pageSize") || 25))
  const [aggregates, setAggregates] = useState({ byType: {}, failures: 0 })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState("json")
  const [exportLimit, setExportLimit] = useState("250")

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const q = searchParams.get("q") || ""
  const sortBy = "timestamp" // Fixed to timestamp
  const sortOrder = "desc" // Fixed to descending

  const spEventType = (searchParams.get("eventType") || "").split(",").filter(Boolean)
  const spStatus = (searchParams.get("status") || "").split(",").filter(Boolean)
  const [eventTypes, setEventTypes] = useState(spEventType)
  const [statuses, setStatuses] = useState(spStatus)
  const [range, setRange] = useState(searchParams.get("_range") || "7d")
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "")
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "")
  const fromRef = useRef(null)

  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      setLoading(true)
      const url = new URL("/api/admin/audit-logs", window.location.origin)
      url.searchParams.set("page", String(page))
      url.searchParams.set("pageSize", String(pageSize))
      url.searchParams.set("sortBy", sortBy)
      url.searchParams.set("sortOrder", sortOrder)
      if (q) url.searchParams.set("q", q)
      if (eventTypes.length) url.searchParams.set("eventType", eventTypes.join(","))
      if (statuses.length) url.searchParams.set("status", statuses.join(","))
      if (dateFrom) url.searchParams.set("dateFrom", dateFrom)
      if (dateTo) url.searchParams.set("dateTo", dateTo)
      const res = await fetch(url.toString())
      if (res.ok) {
        const json = await res.json()
        if (!isMounted) return
        setData(json.data || [])
        setTotal(json.total || 0)
        setAggregates(json.aggregates || { byType: {}, failures: 0 })
      }
      setLoading(false)
    }
    fetchData()
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortBy, sortOrder, q, eventTypes.join(","), statuses.join(","), dateFrom, dateTo])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  // Keep input in sync if URL q changes (e.g., via back/forward or clear filters)
  useEffect(() => {
    setSearchQuery(q)
  }, [q])


  // Debounced search: apply after user stops typing, but keep Enter-to-search for immediacy
  useEffect(() => {
    const currentQ = searchParams.get("q") || ""
    if (searchQuery === currentQ) return
    const handle = setTimeout(() => {
      setParams({ q: searchQuery, page: 1 })
    }, 500)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const doExport = async (format) => {
    const url = new URL("/api/admin/audit-logs/export", window.location.origin)
    if (q) url.searchParams.set("q", q)
    if (eventTypes.length) url.searchParams.set("eventType", eventTypes.join(","))
    if (statuses.length) url.searchParams.set("status", statuses.join(","))
    if (dateFrom) url.searchParams.set("dateFrom", dateFrom)
    if (dateTo) url.searchParams.set("dateTo", dateTo)
    url.searchParams.set("format", format)
    url.searchParams.set("limit", "500")
    const res = await fetch(url.toString())
    if (!res.ok) return
    const blob = await res.blob()
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download =
      res.headers.get("Content-Disposition")?.split("filename=")?.[1]?.replaceAll('"', "") || `audit-logs.${format}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setEventTypes([])
    setStatuses([])
    setRange("7d")
    setDateFrom("")
    setDateTo("")
    setParams({ q: "", eventType: "", status: "", _range: "7d", dateFrom: "", dateTo: "", page: 1 })
  }

  const hasActiveFilters = q || eventTypes.length > 0 || statuses.length > 0 || dateFrom || dateTo

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Logs</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => { setExportFormat("json"); setExportDialogOpen(true) }} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button onClick={() => { setExportFormat("csv"); setExportDialogOpen(true) }} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[300px]">
                <Input
                  placeholder="Search by name, message, user ID, or user agent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setParams({ q: searchQuery, page: 1 })
                    }
                  }}
                  className="w-full"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Filter className="h-4 w-4" />
                    Event Type
                    {eventTypes.length > 0 && (
                      <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {eventTypes.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Filter by event type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {[
                    "Sign Up",
                    "Login",
                    "Logout",
                    "Task Complete",
                    "Task Created",
                    "Task Assigned",
                    "Task Update",
                    "Quiz Completed",
                    "Server",
                  ].map((t) => (
                    <DropdownMenuCheckboxItem
                      key={t}
                      checked={eventTypes.includes(t)}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? Array.from(new Set([...eventTypes, t]))
                          : eventTypes.filter((x) => x !== t)
                        setEventTypes(next)
                        setParams({ eventType: next.join(","), page: 1 })
                      }}
                    >
                      {t}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-transparent">
                    <Filter className="h-4 w-4" />
                    Status
                    {statuses.length > 0 && (
                      <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {statuses.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {["Success", "Failure", "Error", "Partial Success"].map((s) => (
                    <DropdownMenuCheckboxItem
                      key={s}
                      checked={statuses.includes(s)}
                      onCheckedChange={(checked) => {
                        const next = checked ? Array.from(new Set([...statuses, s])) : statuses.filter((x) => x !== s)
                        setStatuses(next)
                        setParams({ status: next.join(","), page: 1 })
                      }}
                    >
                      {s}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Select
                value={range}
                onValueChange={(v) => {
                  setRange(v)
                  const now = new Date()
                  if (v === "24h" || v === "7d" || v === "30d") {
                    const from = new Date(now)
                    if (v === "24h") from.setDate(now.getDate() - 1)
                    if (v === "7d") from.setDate(now.getDate() - 7)
                    if (v === "30d") from.setDate(now.getDate() - 30)
                    const fromIso = from.toISOString()
                    const toIso = now.toISOString()
                    setDateFrom(fromIso)
                    setDateTo(toIso)
                    setParams({ dateFrom: fromIso, dateTo: toIso, _range: v, page: 1 })
                  } else if (v === "custom") {
                    setParams({ _range: v })
                    setDateFrom("")
                    setDateTo("")
                    setTimeout(() => fromRef.current?.focus(), 0)
                  }
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>

            {range === "custom" && (
              <div className="flex items-center gap-3 pl-1">
                <span className="text-sm text-muted-foreground">From:</span>
                <DateTimePicker
                  label="Select from"
                  value={dateFrom}
                  onChange={(iso) => { setDateFrom(iso); setParams({ dateFrom: iso, page: 1 }) }}
                />
                <span className="text-sm text-muted-foreground">To:</span>
                <DateTimePicker
                  label="Select to"
                  value={dateTo}
                  onChange={(iso) => { setDateTo(iso); setParams({ dateTo: iso, page: 1 }) }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground border-y py-3">
            <div>
              <span className="font-medium text-foreground">{total}</span> total logs
            </div>
            <div>
              <span className="font-medium text-error">{aggregates.failures}</span> failures
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span>Show</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v))
                  setParams({ pageSize: v, page: 1 })
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium bg-muted/50">
              <div className="col-span-2">Timestamp</div>
              <div className="col-span-2">Event Type</div>
              <div>Status</div>
              <div>Role</div>
              <div className="col-span-2">Name</div>
              <div className="col-span-2">User ID</div>
              <div className="col-span-2">Device</div>
            </div>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-4 py-3 border-t">
                  <Skeleton className="h-4 col-span-2" />
                  <Skeleton className="h-4 col-span-2" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4 col-span-2" />
                  <Skeleton className="h-4 col-span-2" />
                  <Skeleton className="h-4 col-span-2" />
                </div>
              ))
            ) : data.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground border-t">
                No audit logs found matching your filters.
              </div>
            ) : (
              data.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 border-t text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => {
                    setSelected(row)
                    setDrawerOpen(true)
                  }}
                >
                  <div className="col-span-2 truncate" title={row.timestamp}>
                    {formatTimestamp(row.timestamp)}
                  </div>
                  <div className="col-span-2 truncate" title={row.eventType}>
                    {row.eventType}
                  </div>
                  <div className="truncate" title={row.status}>
                    <span
                      className={
                        row.status === "Success"
                          ? "text-success"
                          : row.status === "Failure" || row.status === "Error"
                            ? "text-error"
                            : ""
                      }
                    >
                      {row.status}
                    </span>
                  </div>
                  <div className="truncate" title={row.role}>
                    {row.role}
                  </div>
                  <div className="col-span-2 truncate" title={row.name || ""}>
                    {row.name || "—"}
                  </div>
                  <div className="col-span-2 truncate" title={row.userIdentifier || ""}>
                    {row.userIdentifier || "—"}
                  </div>
                  <div className="col-span-2 truncate" title={row.ua || ""}>
                    {parseUaSummary(row.ua) || "—"}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              Showing {data.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of{" "}
              {total} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                disabled={page <= 1}
                onClick={() => {
                  setPage((p) => p - 1)
                  setParam("page", Math.max(1, page - 1))
                }}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <div className="text-sm px-3">
                Page {page} of {totalPages}
              </div>
              <Button
                disabled={page >= totalPages}
                onClick={() => {
                  setPage((p) => p + 1)
                  setParam("page", Math.min(totalPages, page + 1))
                }}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export {exportFormat.toUpperCase()}</DialogTitle>
            <DialogDescription>Select how many recent records to include.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3">
            <Select value={exportLimit} onValueChange={(v) => setExportLimit(v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Limit" /></SelectTrigger>
              <SelectContent>
                {[50, 100, 250, 500, 1000].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setExportDialogOpen(false); doExport(exportFormat, Number(exportLimit)) }}>Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[600px] max-w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Audit Log Details</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Timestamp</div>
                <div className="text-sm">{formatTimestamp(selected.timestamp)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Event Type</div>
                <div className="text-sm font-medium">{selected.eventType}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Status</div>
                <div className="text-sm">
                  <span
                    className={
                      selected.status === "Success"
                        ? "text-success font-medium"
                        : selected.status === "Failure" || selected.status === "Error"
                          ? "text-error font-medium"
                          : ""
                    }
                  >
                    {selected.status}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Role</div>
                <div className="text-sm">{selected.role}</div>
              </div>
              {selected.name && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Name</div>
                  <div className="text-sm">{selected.name}</div>
                </div>
              )}
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">User Identifier</div>
                <div className="flex items-center gap-2">
                  <div className="text-sm break-all flex-1">{selected.userIdentifier || "—"}</div>
                  {selected.userIdentifier && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(selected.userIdentifier || "")}
                    >
                      Copy
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">IP Address</div>
                <div className="flex items-center gap-2">
                  <div className="text-sm">{selected.ip || "—"}</div>
                  {selected.ip && (
                    <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(selected.ip || "")}>
                      Copy
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">User Agent</div>
                <div className="flex items-start gap-2">
                  <div className="text-sm break-all flex-1">{selected.ua || "—"}</div>
                  {selected.ua && (
                    <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(selected.ua || "")}>
                      Copy
                    </Button>
                  )}
                </div>
              </div>
              {selected.message && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Message</div>
                  <div className="text-sm break-all bg-muted/50 p-3 rounded-md">{selected.message}</div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default function AuditLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <AuditLogsClient />
    </Suspense>
  )
}
