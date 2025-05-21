import Airtable from "airtable";
import logger from "@/lib/utils/logger";
import { NextResponse } from "next/server";

export async function GET(req){
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
        logger.error("Airtable environment variables are missing");
        return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
    const searchQuery = req.nextUrl.searchParams.get('query');
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(req.nextUrl.searchParams.get('pageSize') || '5', 10);

    try {
        let allRecords = [];
        await base("Onboarding Tasks")
            .select({})
            .eachPage((records, fetchNextPage) => {
                allRecords = allRecords.concat(records);
                fetchNextPage();
            });

        let filteredResources = allRecords;

        if (searchQuery) {
            const lowerCaseSearchQuery = searchQuery.toLowerCase();
            filteredResources = allRecords.filter(record => {
                const files = record.fields['File(s)'];
                if (!files || !Array.isArray(files)) {
                    return false; // No files attached or not in expected format
                }
                // Check if any file's filename contains the search query (case-insensitive)
                return files.some(file => 
                    file.filename && file.filename.toLowerCase().includes(lowerCaseSearchQuery)
                );
            });
        }

        // Flatten all files from all records into individual resources
        let allFiles = [];
        filteredResources.forEach(record => {
            const files = record.fields['File(s)'];
            if (files && Array.isArray(files) && files.length > 0) {
                files.forEach(file => {
                    allFiles.push({
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
        // Sort by updatedAt descending (most recent first)
        allFiles.sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA;
        });
        // Filter by search query on file title
        let filteredFiles = allFiles;
        if (searchQuery) {
            const lowerCaseSearchQuery = searchQuery.toLowerCase();
            filteredFiles = allFiles.filter(file =>
                file.title && file.title.toLowerCase().includes(lowerCaseSearchQuery)
            );
        }
        // Limit to 5 files
        // Pagination logic
        const totalCount = filteredFiles.length;
        const startIdx = (page - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const resources = filteredFiles.slice(startIdx, endIdx);

        return NextResponse.json({
            resources,
            totalCount,
            page,
            pageSize
        });

    } catch (error) {
        logger.error('Error fetching resources from Airtable:', error);
        return NextResponse.json({ error: 'Failed to fetch resources.' }, { status: 500 });
    }
}