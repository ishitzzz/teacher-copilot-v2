import { google } from 'googleapis';
import path from 'path';

// Authenticate using the service account key file
// The file 'service-account.json' must be in the project root
const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive',
];

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'service-account.json'),
    scopes: SCOPES,
});

export const calendar = google.calendar({ version: 'v3', auth });
export const docs = google.docs({ version: 'v1', auth });
export const drive = google.drive({ version: 'v3', auth });

// --- Calendar Helpers ---

export interface CalendarEvent {
    summary: string;
    description?: string;
    start: { dateTime: string };
    end: { dateTime: string };
}

export async function listUpcomingEvents(maxResults = 10) {
    try {
        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return res.data.items;
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        throw new Error('Failed to fetch calendar events. Ensure the service account has access.');
    }
}

export async function createCalendarEvent(event: CalendarEvent) {
    try {
        const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });
        return res.data;
    } catch (error) {
        console.error('Error creating calendar event:', error);
        throw new Error('Failed to create event.');
    }
}


// --- Docs Helpers ---

export async function createDocument(title: string, content: string) {
    try {
        // 1. Create a blank document
        const createRes = await docs.documents.create({
            requestBody: { title },
        });
        const documentId = createRes.data.documentId;
        if (!documentId) throw new Error("Failed to create document ID");

        // 2. Insert content
        await docs.documents.batchUpdate({
            documentId,
            requestBody: {
                requests: [
                    {
                        insertText: {
                            location: { index: 1 },
                            text: content,
                        },
                    },
                ],
            },
        });

        // 3. Make it readable/writable by anyone with the link (Optional, for easy access)
        // Or you can share it with a specific user email
        // For now, we return the URL
        return `https://docs.google.com/document/d/${documentId}/edit`;

    } catch (error) {
        console.error('Error creating Google Doc:', error);
        throw new Error('Failed to create Google Doc.');
    }
}
