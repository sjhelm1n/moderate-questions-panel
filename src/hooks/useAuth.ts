import { useState, useEffect, useCallback, useRef } from "react";
import type { AuthError, Subscription, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";

/** Match your DB schema */
export type UserRole = "moderator" | "audience";

export interface UserProfile {
  id: string; // uuid, must match auth.users.id
  email: string;
  full_name?: string | null;
  role: UserRole;
  created_at?: string | null;
  updated_at?: string | null;
}

type SignOutResult = { error: AuthError | null };

/**
 * useAuth
 * - Loads current session/user
 * - Fetches (or creates via upsert) the user's profile row
 * - Listens for auth state changes and rehydrates
 * - Exposes role helpers and signOut
 *
 * RLS prerequisites on public.user_profiles (owner-scoped):
 *  - SELECT/UPDATE/INSERT where id = auth.uid()
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const creatingRef = useRef(false); // avoid double-creates on fast auth events

  /** Read profile (returns null if missing) */
  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id,email,full_name,role,created_at,updated_at")
      .eq("id", userId)
      .maybeSingle(); // no-row => data=null, no error
    if (error) throw error;
    return (data as UserProfile | null) ?? null;
  }, []);

  /** Create/update profile deterministically */
  const upsertUserProfile = useCallback(async (userId: string) => {
    if (creatingRef.current) return null;
    creatingRef.current = true;
    try {
      const { data: ures, error: uerr } = await supabase.auth.getUser();
      if (uerr) throw uerr;
      const u = ures.user;
      if (!u) return null;

      const payload: Partial<UserProfile> & Pick<UserProfile, "id" | "email" | "role"> = {
        id: userId,
        email: u.email ?? "",
        full_name: (u.user_metadata?.full_name as string | undefined) ?? "",
        // Default role; adjust to your flow (e.g., 'audience')
        role: "moderator",
      };

      const { data, error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "id" })
        .select("id,email,full_name,role,created_at,updated_at")
        .single();

      if (error) throw error;
      return data as UserProfile;
    } finally {
      creatingRef.current = false;
    }
  }, []);

  /** Full rehydrate: session → user → profile (create if missing) */
  const hydrate = useCallback(async () => {
    try {
      const { data: { session }, error: sErr } = await supabase.auth.getSession();
      if (sErr) {
        console.error("Session error:", sErr);
        throw sErr;
      }

      const u = session?.user ?? null;
      setUser(u);

      if (!u) {
        setProfile(null);
        setError(null);
        return;
      }

      let p = await fetchUserProfile(u.id);
      if (!p) {
        p = await upsertUserProfile(u.id);
      }
      setProfile(p);
      setError(null);
    } catch (e) {
      console.error("Auth hydrate error:", e);
      setError(getErrorMessage(e, "Failed to load authentication state"));
      // Clear auth state on error
      setUser(null);
      setProfile(null);
    }
  }, [fetchUserProfile, upsertUserProfile]);

  /** Initial load + auth change listener */
  useEffect(() => {
    let active = true;
    let authSubscription: Subscription | null = null;

    const initializeAuth = async () => {
      if (!active) return;
      
      setLoading(true);
      try {
        await hydrate();
      } finally {
        if (active) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    // Set up auth state change listener
    const setupAuthListener = () => {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!active) return;
          
          console.log("Auth state change:", event, session?.user?.id);
          
          // Prevent infinite loops by not setting loading during state changes
          try {
            // Handle different auth events
            switch (event) {
              case "SIGNED_IN":
              case "TOKEN_REFRESHED":
                if (session?.user) {
                  setUser(session.user);
                  try {
                    let p = await fetchUserProfile(session.user.id);
                    if (!p) {
                      p = await upsertUserProfile(session.user.id);
                    }
                    setProfile(p);
                    setError(null);
                  } catch (e) {
                    console.error("Profile fetch error:", e);
                    setError(getErrorMessage(e, "Failed to load user profile"));
                  }
                }
                break;
              case "SIGNED_OUT":
                setUser(null);
                setProfile(null);
                setError(null);
                break;
              case "USER_UPDATED":
                if (session?.user) {
                  setUser(session.user);
                  // Optionally refresh profile
                  try {
                    const p = await fetchUserProfile(session.user.id);
                    if (p) setProfile(p);
                  } catch (e) {
                    console.error("Profile update error:", e);
                  }
                }
                break;
              default:
                // Handle other events if needed
                break;
            }
          } catch (e) {
            console.error("Auth state change error:", e);
          }
        }
      );
      authSubscription = data.subscription;
    };

    // Initialize auth and set up listener
    initializeAuth().then(() => {
      if (active) {
        setupAuthListener();
      }
    });

    return () => {
      active = false;
      authSubscription?.unsubscribe();
    };
  }, [hydrate, fetchUserProfile, upsertUserProfile]);

  /** Sign out and reset local state */
  const signOut = useCallback(async () => {
    console.log("useAuth: Starting sign out process");
    try {
      setLoading(true);
      console.log("useAuth: Calling supabase.auth.signOut()");
      
      // Use a timeout to prevent hanging
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 5000)
      );
      
      const result = await Promise.race<SignOutResult | never>([signOutPromise, timeoutPromise]);
      console.log("useAuth: Supabase signOut result:", result);
      
      if (result && 'error' in result && result.error) {
        console.error("useAuth: Supabase signOut error:", result.error);
        throw result.error;
      }
      
      console.log("useAuth: Supabase signOut successful");
      
      // Clear local state immediately
      setUser(null);
      setProfile(null);
      setError(null);
      
      console.log("useAuth: Local state cleared, redirecting to home");
      // Force a page reload to ensure clean state
      window.location.href = "/";
    } catch (e) {
      console.error("useAuth: Sign out error:", e);
      
      // Even if signOut fails, clear local state and redirect
      setUser(null);
      setProfile(null);
      setError(null);
      
      console.log("useAuth: Forcing redirect despite error");
      window.location.href = "/";
    } finally {
      setLoading(false);
    }
  }, []);

  /** Manual refresh (exposed for consumers that want to re-pull) */
  const refresh = useCallback(() => hydrate(), [hydrate]);

  return {
    user,
    profile,
    loading,
    error,
    signOut,
    refresh,
    isAuthenticated: !!user,
    isModerator: profile?.role === "moderator",
    isAudience: profile?.role === "audience",
  };
}
