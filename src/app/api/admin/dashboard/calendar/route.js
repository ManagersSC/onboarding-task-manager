import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_REFRESH_TOKEN,
} = process.env;

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
    return NextResponse.json(response.data.items);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const oauth2Client = getOAuth2Client();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: body,
    });
    return NextResponse.json(event.data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const { eventId, ...eventData } = body;
    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    }
    const oauth2Client = getOAuth2Client();
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const event = await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: eventData,
    });
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
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
} 