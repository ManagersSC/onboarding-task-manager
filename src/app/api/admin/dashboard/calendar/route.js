import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_REFRESH_TOKEN,
} = process.env;

// --- Server-side cache ---
let calendarCache = {};
const CALENDAR_CACHE_TTL = 60 * 1000; // 60 seconds

function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return oauth2Client;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const timeMin = searchParams.get('start') || new Date().toISOString();
    const timeMax = searchParams.get('end');
    // Cache key based on timeMin and timeMax
    const cacheKey = JSON.stringify({ timeMin, timeMax });
    const now = Date.now();
    if (
      calendarCache[cacheKey] &&
      (now - calendarCache[cacheKey].time < CALENDAR_CACHE_TTL)
    ) {
      return NextResponse.json(calendarCache[cacheKey].data);
    }
    const oauth2Client = getOAuth2Client();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const params = {
      calendarId: 'primary',
      timeMin,
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime',
    };
    if (timeMax) params.timeMax = timeMax;
    const response = await calendar.events.list(params);
    // Update cache
    calendarCache[cacheKey] = { data: response.data.items, time: now };
    return NextResponse.json(response.data.items);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { createMeet, ...eventBody } = body;
    const eventType = (body.type || '').toLowerCase();
    if ((eventType === 'meeting' || eventType === 'appointment')) {
      if (!Array.isArray(eventBody.attendees) || eventBody.attendees.length === 0) {
        return NextResponse.json({ error: 'At least one attendee is required for this event type.' }, { status: 400 });
      }
    }
    if (createMeet) {
      eventBody.conferenceData = {
        createRequest: {
          requestId: Math.random().toString(36).substring(2),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      };
    }
    const oauth2Client = getOAuth2Client();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const insertParams = {
      calendarId: 'primary',
      requestBody: eventBody,
    };
    if (createMeet) insertParams.conferenceDataVersion = 1;
    if (eventBody.attendees && eventBody.attendees.length > 0) insertParams.sendUpdates = 'all';
    const event = await calendar.events.insert(insertParams);
    // Invalidate cache so subsequent GET reflects the new event immediately
    calendarCache = {};
    return NextResponse.json(event.data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { eventId, createMeet, ...eventData } = body;
    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    }
    const eventType = (eventData.type || '').toLowerCase();
    if ((eventType === 'meeting' || eventType === 'appointment')) {
      if (!Array.isArray(eventData.attendees) || eventData.attendees.length === 0) {
        return NextResponse.json({ error: 'At least one attendee is required for this event type.' }, { status: 400 });
      }
    }
    if (createMeet) {
      eventData.conferenceData = {
        createRequest: {
          requestId: Math.random().toString(36).substring(2),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      };
    }
    const oauth2Client = getOAuth2Client();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const patchParams = {
      calendarId: 'primary',
      eventId,
      requestBody: eventData,
    };
    if (createMeet) patchParams.conferenceDataVersion = 1;
    if (eventData.attendees && eventData.attendees.length > 0) patchParams.sendUpdates = 'all';
    const event = await calendar.events.patch(patchParams);
    // Invalidate cache after update
    calendarCache = {};
    return NextResponse.json(event.data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    }
    const oauth2Client = getOAuth2Client();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.events.delete({ calendarId: 'primary', eventId });
    // Invalidate cache after deletion
    calendarCache = {};
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
} 