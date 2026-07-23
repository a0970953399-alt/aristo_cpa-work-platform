import { randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import { google, calendar_v3 } from 'googleapis';

initializeApp();

const db = getFirestore();
const REGION = 'asia-east1';
const GOOGLE_OAUTH_CLIENT_ID = defineSecret('GOOGLE_OAUTH_CLIENT_ID');
const GOOGLE_OAUTH_CLIENT_SECRET = defineSecret('GOOGLE_OAUTH_CLIENT_SECRET');
const BOOTSTRAP_ADMIN_EMAIL = defineSecret('BOOTSTRAP_ADMIN_EMAIL');
const APP_BASE_URL = defineString('APP_BASE_URL', {
  default: 'https://aristo-cpa-work-platform.vercel.app',
});

setGlobalOptions({ region: REGION, maxInstances: 10 });

type PlatformUser = {
  id?: string;
  name: string;
  role: 'boss' | 'supervisor' | 'intern' | 'trainee';
  isActive?: boolean;
  googleUid?: string;
  googleEmail?: string;
  googleDisplayName?: string;
};

type PlatformEvent = {
  date: string;
  type: 'shift' | 'reminder';
  title: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  googleEventId?: string;
  googleCalendarId?: string;
  googleSyncTargets?: Record<string, GoogleSyncTarget>;
};

type CalendarConnection = {
  refreshToken: string;
  calendarId: string;
  calendarName: string;
  googleEmail: string;
  platformUserId: string;
  status: 'connected' | 'disconnected';
  connectedAt: string;
};

type GoogleSyncTarget = {
  calendarId: string;
  eventId: string;
  syncedAt?: string;
};

type CalendarSyncTarget = {
  googleUid: string;
  connection: CalendarConnection;
  role: PlatformUser['role'];
};

type BindingRequest = {
  id: string;
  requestedAt: string;
  [key: string]: unknown;
};

const requireAuth = (auth: { uid: string; token: Record<string, unknown> } | undefined) => {
  if (!auth) throw new HttpsError('unauthenticated', '請先使用 Google 帳號登入');
  return auth;
};

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();

const getProfileByGoogleUid = async (uid: string) => {
  const snapshot = await db.collection('users').where('googleUid', '==', uid).limit(1).get();
  if (snapshot.empty) return null;
  const document = snapshot.docs[0];
  return { id: document.id, ...document.data() } as PlatformUser & { id: string };
};

const requireLinkedProfile = async (uid: string) => {
  const profile = await getProfileByGoogleUid(uid);
  if (!profile) throw new HttpsError('permission-denied', 'Google 帳號尚未綁定平台人員');
  if (profile.isActive === false) throw new HttpsError('permission-denied', '此帳號已停用');
  return profile;
};

const requirePrivilegedProfile = async (uid: string) => {
  const profile = await requireLinkedProfile(uid);
  if (profile.role !== 'boss' && profile.role !== 'supervisor') {
    throw new HttpsError('permission-denied', '只有主管可以審核帳號綁定');
  }
  return profile;
};

const serializeProfile = (id: string, profile: PlatformUser) => ({ id, ...profile });

export const requestAccountBinding = onCall(
  { secrets: [BOOTSTRAP_ADMIN_EMAIL] },
  async request => {
    const auth = requireAuth(request.auth);
    const profileId = String(request.data?.profileId || '').trim();
    const googleEmail = normalizeEmail(auth.token.email);
    const googleDisplayName = String(auth.token.name || '').trim();
    if (!profileId || !googleEmail) throw new HttpsError('invalid-argument', '缺少人員或 Gmail 資料');

    const profileRef = db.collection('users').doc(profileId);
    const profileSnapshot = await profileRef.get();
    if (!profileSnapshot.exists) throw new HttpsError('not-found', '找不到這位平台人員');
    const profile = profileSnapshot.data() as PlatformUser;
    if (profile.isActive === false) throw new HttpsError('permission-denied', '此帳號已停用');
    if (profile.googleUid && profile.googleUid !== auth.uid) {
      throw new HttpsError('failed-precondition', '此人員已綁定其他 Gmail');
    }
    if (profile.googleUid === auth.uid) {
      return { status: 'linked', profile: serializeProfile(profileId, profile) };
    }

    const allUsers = await db.collection('users').get();
    const conflictingUser = allUsers.docs.find(document => {
      if (document.id === profileId) return false;
      const user = document.data() as PlatformUser;
      return user.googleUid === auth.uid || normalizeEmail(user.googleEmail) === googleEmail;
    });
    if (conflictingUser) throw new HttpsError('already-exists', '這個 Gmail 已綁定其他人員');

    const hasPrivilegedBinding = allUsers.docs.some(document => {
      const user = document.data() as PlatformUser;
      return Boolean(user.googleUid) && (user.role === 'boss' || user.role === 'supervisor');
    });
    const bootstrapEmail = normalizeEmail(BOOTSTRAP_ADMIN_EMAIL.value());
    const canBootstrap = !hasPrivilegedBinding
      && (profile.role === 'boss' || profile.role === 'supervisor')
      && googleEmail === bootstrapEmail;

    if (canBootstrap) {
      const updates = { googleUid: auth.uid, googleEmail, googleDisplayName };
      await profileRef.set(updates, { merge: true });
      return { status: 'linked', profile: serializeProfile(profileId, { ...profile, ...updates }) };
    }

    await db.collection('googleBindingRequests').doc(auth.uid).set({
      profileId,
      profileName: profile.name,
      googleUid: auth.uid,
      googleEmail,
      googleDisplayName,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    });
    return { status: 'pending' };
  },
);

export const listPendingBindings = onCall(async request => {
  const auth = requireAuth(request.auth);
  await requirePrivilegedProfile(auth.uid);
  const snapshot = await db.collection('googleBindingRequests').where('status', '==', 'pending').get();
  const requests = snapshot.docs
    .map(document => ({ id: document.id, ...document.data() }) as BindingRequest)
    .sort((a, b) => String(a.requestedAt).localeCompare(String(b.requestedAt)));
  return { requests };
});

export const reviewAccountBinding = onCall(async request => {
  const auth = requireAuth(request.auth);
  const reviewer = await requirePrivilegedProfile(auth.uid);
  const requestId = String(request.data?.requestId || '').trim();
  const approve = request.data?.approve === true;
  if (!requestId) throw new HttpsError('invalid-argument', '缺少綁定申請');

  const bindingRef = db.collection('googleBindingRequests').doc(requestId);
  const bindingSnapshot = await bindingRef.get();
  if (!bindingSnapshot.exists) throw new HttpsError('not-found', '找不到綁定申請');
  const binding = bindingSnapshot.data() as Record<string, unknown>;
  if (binding.status !== 'pending') throw new HttpsError('failed-precondition', '此申請已處理');

  if (!approve) {
    await bindingRef.set({
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewer.name,
    }, { merge: true });
    return;
  }

  const profileId = String(binding.profileId || '');
  const profileRef = db.collection('users').doc(profileId);
  const profileSnapshot = await profileRef.get();
  if (!profileSnapshot.exists) throw new HttpsError('not-found', '平台人員已不存在');
  const profile = profileSnapshot.data() as PlatformUser;
  if (profile.isActive === false) throw new HttpsError('failed-precondition', '此帳號已停用');
  if (profile.googleUid && profile.googleUid !== binding.googleUid) {
    throw new HttpsError('failed-precondition', '此人員已綁定其他 Gmail');
  }

  const allUsers = await db.collection('users').get();
  const conflict = allUsers.docs.some(document => {
    if (document.id === profileId) return false;
    const user = document.data() as PlatformUser;
    return user.googleUid === binding.googleUid
      || normalizeEmail(user.googleEmail) === normalizeEmail(binding.googleEmail);
  });
  if (conflict) throw new HttpsError('already-exists', '這個 Gmail 已綁定其他人員');

  const batch = db.batch();
  batch.set(profileRef, {
    googleUid: binding.googleUid,
    googleEmail: normalizeEmail(binding.googleEmail),
    googleDisplayName: String(binding.googleDisplayName || ''),
  }, { merge: true });
  batch.set(bindingRef, {
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewer.name,
  }, { merge: true });
  await batch.commit();
});

const getRedirectUri = () => {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new Error('Missing Google Cloud project ID');
  return `https://${REGION}-${projectId}.cloudfunctions.net/googleCalendarOAuthCallback`;
};

const getOAuthClient = (refreshToken?: string) => {
  const client = new google.auth.OAuth2(
    GOOGLE_OAUTH_CLIENT_ID.value(),
    GOOGLE_OAUTH_CLIENT_SECRET.value(),
    getRedirectUri(),
  );
  if (refreshToken) client.setCredentials({ refresh_token: refreshToken });
  return client;
};

export const getCalendarAuthorizationUrl = onCall(
  { secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET] },
  async request => {
    const auth = requireAuth(request.auth);
    const profile = await requireLinkedProfile(auth.uid);
    const state = randomUUID();
    await db.collection('googleOAuthStates').doc(state).set({
      uid: auth.uid,
      platformUserId: profile.id,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
    });
    const oauthClient = getOAuthClient();
    const url = oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      login_hint: profile.googleEmail,
      scope: [
        'openid',
        'email',
        'https://www.googleapis.com/auth/calendar.app.created',
      ],
      state,
    });
    return { url };
  },
);

const addOneDay = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
};

const getShiftTimes = (title: string) => {
  if (title === '上午' || title === 'morning' || title === '09:30 - 12:00') return ['09:30:00', '12:00:00'];
  if (title === '下午' || title === 'afternoon' || title === '13:00 - 17:30') return ['13:00:00', '17:30:00'];
  return ['09:30:00', '17:30:00'];
};

const toGoogleEvent = (eventId: string, event: PlatformEvent): calendar_v3.Schema$Event => {
  const description = [
    event.description?.trim(),
    '此事件由碩業工作平台同步，請回到平台修改。',
  ].filter(Boolean).join('\n\n');

  if (event.type === 'shift') {
    const [startTime, endTime] = getShiftTimes(event.title);
    return {
      summary: `${event.ownerName} - ${event.title}`,
      description,
      start: { dateTime: `${event.date}T${startTime}+08:00`, timeZone: 'Asia/Taipei' },
      end: { dateTime: `${event.date}T${endTime}+08:00`, timeZone: 'Asia/Taipei' },
      extendedProperties: { private: { platformEventId: eventId, platformEventType: event.type } },
    };
  }

  return {
    summary: event.title,
    description,
    start: { date: event.date },
    end: { date: addOneDay(event.date) },
    extendedProperties: { private: { platformEventId: eventId, platformEventType: event.type } },
  };
};

const getConnectionForPlatformUser = async (platformUserId: string) => {
  const userSnapshot = await db.collection('users').doc(platformUserId).get();
  if (!userSnapshot.exists) return null;
  const user = userSnapshot.data() as PlatformUser;
  if (!user.googleUid || user.isActive === false) return null;
  const connectionSnapshot = await db.collection('calendarConnections').doc(user.googleUid).get();
  if (!connectionSnapshot.exists) return null;
  const connection = connectionSnapshot.data() as CalendarConnection;
  return connection.status === 'connected' ? connection : null;
};

const getCalendarSyncTargets = async (event: PlatformEvent): Promise<CalendarSyncTarget[]> => {
  const targets = new Map<string, CalendarSyncTarget>();
  const addTargetForUser = async (userId: string) => {
    const userSnapshot = await db.collection('users').doc(userId).get();
    if (!userSnapshot.exists) return;
    const user = userSnapshot.data() as PlatformUser;
    if (!user.googleUid || user.isActive === false) return;
    const connectionSnapshot = await db.collection('calendarConnections').doc(user.googleUid).get();
    if (!connectionSnapshot.exists) return;
    const connection = connectionSnapshot.data() as CalendarConnection;
    if (connection.status !== 'connected') return;
    targets.set(user.googleUid, { googleUid: user.googleUid, connection, role: user.role });
  };

  await addTargetForUser(event.ownerId);

  if (event.type === 'shift') {
    const privilegedUsers = await db.collection('users').where('role', 'in', ['boss', 'supervisor']).get();
    for (const document of privilegedUsers.docs) {
      const user = document.data() as PlatformUser;
      if (user.isActive !== false) await addTargetForUser(document.id);
    }
  }

  return [...targets.values()];
};

const getExistingGoogleEventId = (
  event: PlatformEvent,
  connection: CalendarConnection,
  target?: GoogleSyncTarget,
) => {
  if (target?.calendarId === connection.calendarId) return target.eventId;
  if (event.googleCalendarId === connection.calendarId) return event.googleEventId;
  return undefined;
};

const upsertGoogleEvent = async (
  eventId: string,
  event: PlatformEvent,
  connection: CalendarConnection,
  target?: GoogleSyncTarget,
) => {
  const oauthClient = getOAuthClient(connection.refreshToken);
  const calendarApi = google.calendar({ version: 'v3', auth: oauthClient });
  const requestBody = toGoogleEvent(eventId, event);
  const existingGoogleEventId = getExistingGoogleEventId(event, connection, target);

  if (existingGoogleEventId) {
    try {
      await calendarApi.events.patch({
        calendarId: connection.calendarId,
        eventId: existingGoogleEventId,
        requestBody,
      });
      return existingGoogleEventId;
    } catch (error) {
      const status = (error as { code?: number }).code;
      if (status !== 404 && status !== 410) throw error;
    }
  }

  const created = await calendarApi.events.insert({ calendarId: connection.calendarId, requestBody });
  if (!created.data.id) throw new Error('Google Calendar did not return an event ID');
  return created.data.id;
};

const deleteGoogleEventTarget = async (connection: CalendarConnection, target: GoogleSyncTarget) => {
  const oauthClient = getOAuthClient(connection.refreshToken);
  const calendarApi = google.calendar({ version: 'v3', auth: oauthClient });
  try {
    await calendarApi.events.delete({ calendarId: target.calendarId, eventId: target.eventId });
  } catch (error) {
    const status = (error as { code?: number }).code;
    if (status !== 404 && status !== 410) throw error;
  }
};

const deleteGoogleEvent = async (event: PlatformEvent) => {
  const targets = event.googleSyncTargets || {};
  for (const [googleUid, target] of Object.entries(targets)) {
    const connectionSnapshot = await db.collection('calendarConnections').doc(googleUid).get();
    if (!connectionSnapshot.exists) continue;
    const connection = connectionSnapshot.data() as CalendarConnection;
    if (connection.status !== 'connected') continue;
    await deleteGoogleEventTarget(connection, target);
  }

  if (event.googleEventId && event.googleCalendarId) {
    const connection = await getConnectionForPlatformUser(event.ownerId);
    if (!connection) return;
    await deleteGoogleEventTarget(connection, {
      calendarId: event.googleCalendarId,
      eventId: event.googleEventId,
    });
  }
};

const syncExistingEvents = async (connection: CalendarConnection, googleUid: string) => {
  const profileSnapshot = await db.collection('users').doc(connection.platformUserId).get();
  const profile = profileSnapshot.exists ? profileSnapshot.data() as PlatformUser : null;
  const ownedEventsSnapshot = await db.collection('events').where('ownerId', '==', connection.platformUserId).get();
  const snapshots = [ownedEventsSnapshot];
  if (profile?.role === 'boss' || profile?.role === 'supervisor') {
    snapshots.push(await db.collection('events').where('type', '==', 'shift').get());
  }

  const documents = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const snapshot of snapshots) {
    for (const document of snapshot.docs) {
      documents.set(document.id, document);
    }
  }

  for (const document of documents.values()) {
    const event = document.data() as PlatformEvent;
    if (profile?.role !== 'boss' && profile?.role !== 'supervisor' && event.ownerId !== connection.platformUserId) continue;
    try {
      const googleEventId = await upsertGoogleEvent(
        document.id,
        event,
        connection,
        event.googleSyncTargets?.[googleUid],
      );
      await document.ref.set({
        googleSyncTargets: {
          [googleUid]: {
            calendarId: connection.calendarId,
            eventId: googleEventId,
            syncedAt: new Date().toISOString(),
          },
        },
        ...(event.ownerId === connection.platformUserId ? {
          googleEventId,
          googleCalendarId: connection.calendarId,
        } : {}),
        googleSyncStatus: 'synced',
        googleSyncError: FieldValue.delete(),
      }, { merge: true });
    } catch (error) {
      await document.ref.set({
        googleSyncStatus: 'error',
        googleSyncError: error instanceof Error ? error.message.slice(0, 300) : 'Unknown sync error',
      }, { merge: true });
    }
  }
};

export const googleCalendarOAuthCallback = onRequest(
  { secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET] },
  async (request, response) => {
    const appUrl = APP_BASE_URL.value().replace(/\/$/, '');
    const redirectWithStatus = (status: 'connected' | 'error' | 'account_mismatch') => response.redirect(`${appUrl}/?calendar=${status}`);
    try {
      const code = String(request.query.code || '');
      const state = String(request.query.state || '');
      if (!code || !state) return redirectWithStatus('error');

      const stateRef = db.collection('googleOAuthStates').doc(state);
      const stateSnapshot = await stateRef.get();
      if (!stateSnapshot.exists) return redirectWithStatus('error');
      const stateData = stateSnapshot.data() as { uid: string; platformUserId: string; expiresAt: Timestamp };
      if (stateData.expiresAt.toMillis() < Date.now()) {
        await stateRef.delete();
        return redirectWithStatus('error');
      }

      const oauthClient = getOAuthClient();
      const tokenResult = await oauthClient.getToken(code);
      const existingConnectionSnapshot = await db.collection('calendarConnections').doc(stateData.uid).get();
      const existingConnection = existingConnectionSnapshot.exists
        ? existingConnectionSnapshot.data() as CalendarConnection
        : null;
      const refreshToken = tokenResult.tokens.refresh_token || existingConnection?.refreshToken;
      if (!refreshToken) throw new Error('Google did not return a refresh token');
      oauthClient.setCredentials({ ...tokenResult.tokens, refresh_token: refreshToken });

      const profile = await requireLinkedProfile(stateData.uid);
      if (!tokenResult.tokens.id_token) throw new Error('Google did not return an ID token');
      const identity = await oauthClient.verifyIdToken({
        idToken: tokenResult.tokens.id_token,
        audience: GOOGLE_OAUTH_CLIENT_ID.value(),
      });
      const calendarGoogleEmail = normalizeEmail(identity.getPayload()?.email);
      if (!calendarGoogleEmail || calendarGoogleEmail !== normalizeEmail(profile.googleEmail)) {
        await stateRef.delete();
        return redirectWithStatus('account_mismatch');
      }

      const calendarApi = google.calendar({ version: 'v3', auth: oauthClient });
      let calendarId = existingConnection?.calendarId;
      if (calendarId) {
        try {
          await calendarApi.calendars.get({ calendarId });
        } catch {
          calendarId = undefined;
        }
      }
      if (!calendarId) {
        const createdCalendar = await calendarApi.calendars.insert({
          requestBody: {
            summary: '碩業工作平台',
            description: '由碩業工作平台建立並單向同步的排班與提醒。',
            timeZone: 'Asia/Taipei',
          },
        });
        calendarId = createdCalendar.data.id || undefined;
      }
      if (!calendarId) throw new Error('Unable to create Google Calendar');

      const connection: CalendarConnection = {
        refreshToken,
        calendarId,
        calendarName: '碩業工作平台',
        googleEmail: calendarGoogleEmail,
        platformUserId: stateData.platformUserId,
        status: 'connected',
        connectedAt: existingConnection?.connectedAt || new Date().toISOString(),
      };
      await db.collection('calendarConnections').doc(stateData.uid).set({
        ...connection,
        updatedAt: new Date().toISOString(),
      });
      await stateRef.delete();
      await syncExistingEvents(connection, stateData.uid);
      return redirectWithStatus('connected');
    } catch (error) {
      console.error('Google Calendar OAuth callback failed', error);
      return redirectWithStatus('error');
    }
  },
);

export const getCalendarConnectionStatus = onCall(async request => {
  const auth = requireAuth(request.auth);
  await requireLinkedProfile(auth.uid);
  const snapshot = await db.collection('calendarConnections').doc(auth.uid).get();
  if (!snapshot.exists || snapshot.data()?.status !== 'connected') return { connected: false };
  const connection = snapshot.data() as CalendarConnection;
  return {
    connected: true,
    calendarName: connection.calendarName,
    googleEmail: connection.googleEmail,
    connectedAt: connection.connectedAt,
  };
});

export const disconnectGoogleCalendar = onCall(async request => {
  const auth = requireAuth(request.auth);
  await requireLinkedProfile(auth.uid);
  await db.collection('calendarConnections').doc(auth.uid).delete();
});

const calendarFieldsChanged = (before: PlatformEvent, after: PlatformEvent) =>
  before.date !== after.date
  || before.type !== after.type
  || before.title !== after.title
  || before.description !== after.description
  || before.ownerId !== after.ownerId
  || before.ownerName !== after.ownerName;

export const syncPlatformEventToGoogle = onDocumentWritten(
  { document: 'events/{eventId}', secrets: [GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET] },
  async event => {
    const eventId = event.params.eventId;
    const beforeExists = event.data?.before.exists || false;
    const afterExists = event.data?.after.exists || false;
    const before = beforeExists ? event.data?.before.data() as PlatformEvent : null;
    const after = afterExists ? event.data?.after.data() as PlatformEvent : null;

    if (!after && before) {
      await deleteGoogleEvent(before);
      return;
    }
    if (!after) return;
    if (before && !calendarFieldsChanged(before, after)) return;

    try {
      if (before && before.ownerId !== after.ownerId) await deleteGoogleEvent(before);
      const eventForSync = before?.ownerId !== after.ownerId
        ? {
          ...after,
          googleEventId: undefined,
          googleCalendarId: undefined,
          googleSyncTargets: {},
        }
        : after;
      const targets = await getCalendarSyncTargets(eventForSync);
      if (targets.length === 0) {
        await event.data?.after.ref.set({ googleSyncStatus: 'not_connected' }, { merge: true });
        return;
      }

      const updatePayload: Record<string, unknown> = {
        googleSyncStatus: 'synced',
        googleSyncError: FieldValue.delete(),
      };
      const desiredGoogleUids = new Set(targets.map(target => target.googleUid));
      const existingTargets = eventForSync.googleSyncTargets || {};
      for (const [googleUid, target] of Object.entries(existingTargets)) {
        if (desiredGoogleUids.has(googleUid)) continue;
        const connectionSnapshot = await db.collection('calendarConnections').doc(googleUid).get();
        if (connectionSnapshot.exists) {
          const connection = connectionSnapshot.data() as CalendarConnection;
          if (connection.status === 'connected') await deleteGoogleEventTarget(connection, target);
        }
        updatePayload[`googleSyncTargets.${googleUid}`] = FieldValue.delete();
      }

      for (const target of targets) {
        const googleEventId = await upsertGoogleEvent(
          eventId,
          eventForSync,
          target.connection,
          existingTargets[target.googleUid],
        );
        updatePayload[`googleSyncTargets.${target.googleUid}`] = {
          calendarId: target.connection.calendarId,
          eventId: googleEventId,
          syncedAt: new Date().toISOString(),
        };
        if (target.connection.platformUserId === after.ownerId) {
          updatePayload.googleEventId = googleEventId;
          updatePayload.googleCalendarId = target.connection.calendarId;
        }
      }

      await event.data?.after.ref.update(updatePayload);
    } catch (error) {
      console.error(`Failed to sync platform event ${eventId}`, error);
      await event.data?.after.ref.set({
        googleSyncStatus: 'error',
        googleSyncError: error instanceof Error ? error.message.slice(0, 300) : 'Unknown sync error',
      }, { merge: true });
    }
  },
);
