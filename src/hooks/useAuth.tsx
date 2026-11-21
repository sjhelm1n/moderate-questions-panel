// SPDX-License-Identifier: Apache-2.0
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import { fetchUserProfile } from "@/services/supabase/profileService";
import type { UserProfile } from "@/types/domain";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isModerator: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const profileUserIdRef = useRef<string | null>(null);
  const hydrationGenerationRef = useRef(0);

  const hydrateProfile = useCallback(async (nextUser: User | null, force = false) => {
    setUser(nextUser);
    if (!nextUser) {
      hydrationGenerationRef.current += 1;
      profileUserIdRef.current = null;
      setProfile(null);
      setError(null);
      return;
    }

    if (!force && profileUserIdRef.current === nextUser.id) return;
    const generation = ++hydrationGenerationRef.current;
    profileUserIdRef.current = nextUser.id;

    try {
      const nextProfile = await fetchUserProfile(nextUser.id);
      if (generation !== hydrationGenerationRef.current) return;
      setProfile(nextProfile);
      setError(
        nextProfile
          ? null
          : "Your moderator profile is not available. Ask the project operator to apply the latest database migrations.",
      );
    } catch (profileError) {
      if (generation !== hydrationGenerationRef.current) return;
      profileUserIdRef.current = null;
      setProfile(null);
      setError(getErrorMessage(profileError, "Failed to load your moderator profile"));
    }
  }, []);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      setLoading(true);
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (active) await hydrateProfile(data.session?.user ?? null);
      } catch (initializationError) {
        if (active) {
          setError(getErrorMessage(initializationError, "Failed to load authentication state"));
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void initialize();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      queueMicrotask(() => {
        if (!active) return;

        if (event === "TOKEN_REFRESHED") {
          setUser(session?.user ?? null);
          return;
        }

        void hydrateProfile(session?.user ?? null, event === "USER_UPDATED");
      });
    });

    return () => {
      active = false;
      hydrationGenerationRef.current += 1;
      profileUserIdRef.current = null;
      data.subscription.unsubscribe();
    };
  }, [hydrateProfile]);

  const signOut = useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    await hydrateProfile(null);
  }, [hydrateProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      error,
      signOut,
      isAuthenticated: Boolean(user),
      isModerator: Boolean(user && profile?.role === "moderator"),
    }),
    [error, loading, profile, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

