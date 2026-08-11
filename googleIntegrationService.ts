import {
  GoogleAuthProvider,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from './firebase';
import type { CalendarConnectionStatus, GoogleBindingRequest, User } from './types';

type BindingResult = {
  status: 'linked' | 'pending';
  profile?: User;
};

const ensurePersistence = () => setPersistence(auth, browserLocalPersistence);

const createAuthError = (code: string, message: string) =>
  Object.assign(new Error(message), { code });

export const GoogleIntegrationService = {
  observeAuth(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentGoogleUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  async requestAccountBinding(profileId: string, expectedGoogleUid?: string): Promise<BindingResult> {
    await ensurePersistence();

    if (auth.currentUser && auth.currentUser.uid !== expectedGoogleUid) {
      await signOut(auth);
    }

    if (!auth.currentUser) {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    }

    if (expectedGoogleUid && auth.currentUser?.uid !== expectedGoogleUid) {
      await signOut(auth);
      throw createAuthError('auth/account-mismatch', '目前選擇的 Google 帳號與平台人員不符');
    }

    try {
      const requestBinding = httpsCallable<{ profileId: string }, BindingResult>(functions, 'requestAccountBinding');
      const result = await requestBinding({ profileId });
      return result.data;
    } catch (error) {
      await signOut(auth);
      throw error;
    }
  },

  async signOut(): Promise<void> {
    await signOut(auth);
  },

  async listPendingBindings(): Promise<GoogleBindingRequest[]> {
    const listBindings = httpsCallable<void, { requests: GoogleBindingRequest[] }>(functions, 'listPendingBindings');
    const result = await listBindings();
    return result.data.requests;
  },

  async reviewBinding(requestId: string, approve: boolean): Promise<void> {
    const review = httpsCallable<{ requestId: string; approve: boolean }, void>(functions, 'reviewAccountBinding');
    await review({ requestId, approve });
  },

  async getCalendarStatus(): Promise<CalendarConnectionStatus> {
    const getStatus = httpsCallable<void, CalendarConnectionStatus>(functions, 'getCalendarConnectionStatus');
    const result = await getStatus();
    return result.data;
  },

  async startCalendarConnection(): Promise<void> {
    const getUrl = httpsCallable<void, { url: string }>(functions, 'getCalendarAuthorizationUrl');
    const result = await getUrl();
    window.location.assign(result.data.url);
  },

  async disconnectCalendar(): Promise<void> {
    const disconnect = httpsCallable<void, void>(functions, 'disconnectGoogleCalendar');
    await disconnect();
  },

  async unlinkOwnGoogleAccount(): Promise<void> {
    const unlink = httpsCallable<void, void>(functions, 'unlinkOwnGoogleAccount');
    await unlink();
    await signOut(auth);
  },
};
