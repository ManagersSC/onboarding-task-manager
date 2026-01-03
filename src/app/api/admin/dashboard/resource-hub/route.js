import Airtable from "airtable";
import logger from "@/lib/utils/logger";
import { NextResponse } from "next/server";

// --- Server-side cache ---
let resourceHubCache = {};
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function GET(req){
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
        logger.error("Airtable environment variables are missing");
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
    const searchQuery = req.nextUrl.searchParams.get('query');
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '5', 10);
    const cursor = req.nextUrl.searchParams.get('cursor');

    // Cache key based on query, page, and pageSize
    const cacheKey = JSON.stringify({ searchQuery, page, pageSize, cursor });
    const now = Date.now();
    if (
        resourceHubCache[cacheKey] &&
        (now - resourceHubCache[cacheKey].time < CACHE_TTL)
    ) {
        return NextResponse.json(resourceHubCache[cacheKey].data);
    }

    try {
        let resources = [];
        let totalCount = null;
        let nextCursor = null;

        // Default options: select only required fields, sort by Created Time desc
        const selectOptions = {
            fields: ['File(s)', 'Created Time'],
            sort: [{ field: 'Created Time', direction: 'desc' }],
            pageSize: Math.min(Math.max(pageSize, 1), 50)
        };
        if (cursor) selectOptions.offset = cursor;

        if (!searchQuery) {
            // Fast path: no search, just return one Airtable page
            const pageRecords = await base("Onboarding Tasks").select(selectOptions).firstPage();
            const lastResponse = base("Onboarding Tasks")._lastResponse;
            nextCursor = lastResponse && lastResponse.offset ? lastResponse.offset : null;

            const files = [];
            pageRecords.forEach(record => {
                const attachments = record.fields['File(s)'];
                if (attachments && Array.isArray(attachments)) {
                    attachments.forEach(file => {
                        files.push({
                            id: file.id || `${record.id}_${file.filename}`,
                            title: file.filename || `Untitled Resource ${record.id}`,
                            url: file.url,
                            mimeType: file.type,
                            size: file.size,
                            type: "document",
                            updatedAt: file.createdTime || file.lastModifiedTime || record.fields['Created Time'] || null
                        });
                    });
                }
            });
            // Sort by updatedAt desc and slice to pageSize (already limited but ensure file-level limit)
            files.sort((a, b) => {
                const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                return dateB - dateA;
            });
            resources = files.slice(0, pageSize);
        } else {
            // Search path: iterate a limited number of pages to find matches by filename
            const lower = searchQuery.toLowerCase();
            const maxPages = 4; // cap pages scanned for search
            let scannedPages = 0;
            let offset = cursor || undefined;
            const matches = [];

            while (scannedPages < maxPages) {
                const opts = { ...selectOptions };
                if (offset) opts.offset = offset;
                const recs = await base("Onboarding Tasks").select(opts).firstPage();
                const lr = base("Onboarding Tasks")._lastResponse;
                offset = lr && lr.offset ? lr.offset : null;
                scannedPages++;

                recs.forEach(record => {
                    const attachments = record.fields['File(s)'];
                    if (attachments && Array.isArray(attachments)) {
                        attachments.forEach(file => {
                            const title = file.filename || "";
                            if (title.toLowerCase().includes(lower)) {
                                matches.push({
                                    id: file.id || `${record.id}_${file.filename}`,
                                    title,
                                    url: file.url,
                                    mimeType: file.type,
                                    size: file.size,
                                    type: "document",
                                    updatedAt: file.createdTime || file.lastModifiedTime || record.fields['Created Time'] || null
                                });
                            }
                        });
                    }
                });

                if (!offset) break;
                if (matches.length >= pageSize * page) break; // enough to serve requested page
            }

            matches.sort((a, b) => {
                const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                return dateB - dateA;
            });

            totalCount = matches.length; // approximate within scanned window
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            resources = matches.slice(start, end);
            nextCursor = offset; // where to continue scanning from
        }

        const responseData = {
            resources,
            totalCount,
            page,
            pageSize,
            nextCursor
        };

        // Update cache
        resourceHubCache[cacheKey] = { data: responseData, time: now };

        return NextResponse.json(responseData);

    } catch (error) {
        logger.error('Error fetching resources from Airtable:', error);
        return NextResponse.json({ error: 'Failed to fetch resources.' }, { status: 500 });
    }
}