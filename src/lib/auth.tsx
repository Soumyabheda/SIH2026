import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  full_name: string;
  role: 'farmer' | 'buyer';
  phone: string | null;
  state: string | null;
  district: string | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  verification_doc_type: string | null;
  verification_doc_number: string | null;
  verification_notes: string | null;
  verified_at: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: 'farmer' | 'buyer') => Promise<{ error: string | null; created: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('id, full_name, role, phone, state, district, verification_status, verification_doc_type, verification_doc_number, verification_notes, verified_at').eq('id', userId).maybeSingle();
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      if (active) setLoading(false);
    };
    void initialize();
    const { data: listener } = supabase.auth.onAuthStateChange((_, nextSession) => {
      void (async () => {
        if (!active) return;
        setSession(nextSession);
        if (nextSession?.user) await loadProfile(nextSession.user.id);
        else setProfile(null);
        setLoading(false);
      })();
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    profile,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    signUp: async (email, password, fullName, role) => {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role } } });
      return { error: error?.message ?? null, created: Boolean(data.user) };
    },
    signOut: async () => { await supabase.auth.signOut(); },
    refreshProfile: async () => { if (session?.user) await loadProfile(session.user.id); },
  }), [loading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
