import { getDb } from "./mongodb";
import type { CalendarToken, Task } from "./types";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const USER_ID = "default"; // Single-user MVP

async function getGoogle() {
  const { google } = await import("googleapis");
  return google;
}

async function getOAuth2Client() {
  const google = await getGoogle();
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/calendar/callback"
  );
}

export async function getAuthUrl(): Promise<string> {
  const oauth2Client = await getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = await getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
  expiryDate: number,
  email: string
) {
  const db = await getDb();
  await db.collection("calendar_tokens").updateOne(
    { userId: USER_ID },
    {
      $set: {
        userId: USER_ID,
        accessToken,
        refreshToken,
        expiryDate,
        email,
        connectedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
}

export async function getStoredTokens(): Promise<CalendarToken | null> {
  const db = await getDb();
  const token = await db
    .collection<CalendarToken>("calendar_tokens")
    .findOne({ userId: USER_ID });
  return token;
}

export async function deleteTokens() {
  const db = await getDb();
  await db.collection("calendar_tokens").deleteOne({ userId: USER_ID });
}

export async function getAuthenticatedClient() {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  const oauth2Client = await getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });

  // Handle token refresh
  oauth2Client.on("tokens", async (newTokens) => {
    if (newTokens.access_token) {
      await saveTokens(
        newTokens.access_token,
        tokens.refreshToken,
        newTokens.expiry_date || tokens.expiryDate,
        tokens.email
      );
    }
  });

  return oauth2Client;
}

export async function listUpcomingEvents(maxResults = 10) {
  const auth = await getAuthenticatedClient();
  if (!auth) return [];

  const google = await getGoogle();
  const calendar = google.calendar({ version: "v3", auth });
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: nextWeek.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  return res.data.items || [];
}

export async function createCalendarEvent(task: Task) {
  const auth = await getAuthenticatedClient();
  if (!auth || !task.dueDate) return null;

  const google = await getGoogle();
  const calendar = google.calendar({ version: "v3", auth });

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: `[RF] ${task.title}`,
      description: `Categor\u00EDa: ${task.category} / ${task.subcategory}\nFlow Score: ${task.flowScore}\nXP: ${task.xp}`,
      start: {
        dateTime: new Date(task.dueDate).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(
          new Date(task.dueDate).getTime() + 60 * 60 * 1000
        ).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      colorId: task.category === "trabajo" ? "5" : task.category === "proyectos" ? "1" : "2",
    },
  });

  return event.data.id;
}

export async function deleteCalendarEvent(eventId: string) {
  const auth = await getAuthenticatedClient();
  if (!auth) return;

  const google = await getGoogle();
  const calendar = google.calendar({ version: "v3", auth });
  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
  } catch {
    // Event may already be deleted
  }
}

export async function getUserEmail() {
  const auth = await getAuthenticatedClient();
  if (!auth) return null;

  const google = await getGoogle();
  const oauth2 = google.oauth2({ version: "v2", auth });
  const res = await oauth2.userinfo.get();
  return res.data.email;
}
