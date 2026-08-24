import { Session } from '@supabase/supabase-js';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Linking from 'expo-linking';
import { AUTH_CALLBACK_URL, parseAuthCallbackUrl } from '@/lib/authDeepLink';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { synchronizeCloudData } from '@/storage/cloudSync';
import { registerCloudSyncTrigger } from '@/storage/cloudMetadata';

type CloudStatus = 'disabled' | 'signed-out' | 'syncing' | 'synced' | 'error';

interface AuthContextValue {
  configured: boolean;
  initializing: boolean;
  session: Session | null;
  cloudStatus: CloudStatus;
  cloudError: string | null;
  lastSyncedAt: string | null;
  workoutCount: number | null;
  dataRevision: number;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<'signed-in' | 'confirmation-required'>;
  signOut(): Promise<void>;
  syncNow(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : 'Cloud backup failed. Your data remains saved on this device.';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const syncPromiseRef = useRef<Promise<void> | null>(null);
  const syncRequestedRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initializing, setInitializing] = useState(isSupabaseConfigured);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(isSupabaseConfigured ? 'signed-out' : 'disabled');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [workoutCount, setWorkoutCount] = useState<number | null>(null);
  const [dataRevision, setDataRevision] = useState(0);

  const syncNow = useCallback(async () => {
    const userId = sessionRef.current?.user.id;
    if (!userId || !supabase) return;
    if (syncPromiseRef.current) {
      syncRequestedRef.current = true;
      return syncPromiseRef.current;
    }

    const operation = (async () => {
      setCloudStatus('syncing');
      setCloudError(null);
      try {
        const result = await synchronizeCloudData(userId);
        setLastSyncedAt(result.syncedAt);
        setWorkoutCount(result.workoutCount);
        setDataRevision((current) => current + 1);
        setCloudStatus('synced');
        if (result.pendingLocalChanges) syncRequestedRef.current = true;
      } catch (error) {
        setCloudError(messageFor(error));
        setCloudStatus('error');
      }
    })();
    syncPromiseRef.current = operation;
    try {
      await operation;
    } finally {
      syncPromiseRef.current = null;
      if (syncRequestedRef.current) {
        syncRequestedRef.current = false;
        setTimeout(() => { void syncNow(); }, 0);
      }
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const client = supabase;

    const handleAuthUrl = async (url: string) => {
      const callback = parseAuthCallbackUrl(url);
      if (callback.type === 'error') {
        setCloudError(callback.message);
        setCloudStatus('error');
      } else if (callback.type === 'session') {
        const { error } = await client.auth.setSession({
          access_token: callback.accessToken,
          refresh_token: callback.refreshToken
        });
        if (error) {
          setCloudError(error.message);
          setCloudStatus('error');
        }
      } else if (callback.type === 'code') {
        const { error } = await client.auth.exchangeCodeForSession(callback.code);
        if (error) {
          setCloudError(error.message);
          setCloudStatus('error');
        }
      }
    };

    client.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setCloudError(error.message);
        setCloudStatus('error');
        setInitializing(false);
        return;
      }
      sessionRef.current = data.session;
      setSession(data.session);
      setCloudStatus(data.session ? 'syncing' : 'signed-out');
      setInitializing(false);
      if (data.session) void syncNow();
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      sessionRef.current = nextSession;
      setSession(nextSession);
      if (nextSession) {
        void syncNow();
      } else {
        setCloudStatus('signed-out');
        setCloudError(null);
        setWorkoutCount(null);
      }
    });
    void Linking.getInitialURL().then((url) => { if (url) void handleAuthUrl(url); });
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => { void handleAuthUrl(url); });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [syncNow]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const onActive = () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => { void syncNow(); }, 400);
    };
    registerCloudSyncTrigger(onActive);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        client.auth.startAutoRefresh();
        onActive();
      } else {
        client.auth.stopAutoRefresh();
      }
    });
    return () => {
      registerCloudSyncTrigger(null);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      appStateSubscription.remove();
    };
  }, [syncNow]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Add the Supabase environment values before signing in.');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    if (!supabase) throw new Error('Add the Supabase environment values before creating an account.');
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: AUTH_CALLBACK_URL }
    });
    if (error) throw error;
    return data.session ? 'signed-in' as const : 'confirmation-required' as const;
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return <AuthContext.Provider value={{
    configured: isSupabaseConfigured,
    initializing,
    session,
    cloudStatus,
    cloudError,
    lastSyncedAt,
    workoutCount,
    dataRevision,
    signIn,
    signUp,
    signOut,
    syncNow
  }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
