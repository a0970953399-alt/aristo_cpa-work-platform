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

const googleProvider = new GoogleAuthProvider();

const ensurePersistence = () => setPersistence(auth, browserLocalPersistence);

export const GoogleIntegrationService = {
  observeAuth(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  getCurrentGoogleUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  async requestAccountBinding(profileId: string): Promise<BindingResult> {
    await ensurePersistence();
    if (!auth.currentUser) await signInWithPopup(auth, googleProvider);
    const requestBinding = httpsCallable<{ profileId: string }, BindingResult>(functions, 'requestAccountBinding');
    const result = await requestBinding({ profileId });
    return result.data;
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
};
