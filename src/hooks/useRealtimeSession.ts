import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";

/** Table types (adjust to your schema if different) */
export type QuestionStatus = "submitted" | "approved" | "ignore" | "asked";
export type SessionStatus = "active" | "paused" | "ended";
export type Priority = "high" | "medium" | "low";

export interface Question {
  id: string;
  session_id: string;
  content: string;
  submitter_name: string | null;
  status: QuestionStatus;
  created_at: string;
  updated_at: string;
  priority: Priority | null;
  vote_count: number;
}

export interface SessionRow {
  id: string;
  name: string;
  description?: string | null;
  status: SessionStatus;
  created_at: string;
  moderator_id?: string | null;
}

export interface VoteRow {
  id: string;
  question_id: string | null;
  voter_id: string;
  session_id: string | null;
  created_at: string;
}

type Options = {
  /** Participant view: only approved questions (default true) */
  approvedOnly?: boolean;
  /** Coalesce rapid changes (ms). Default 120 */
  debounceMs?: number;
  /** Safety poll to heal missed events (ms). Default 60000. 0 = off */
  safetyPollMs?: number;
  /** Also fetch which questions the current user has voted for */
  fetchMyVotes?: boolean;
};

/** Toggle via RPC (optional helper). Make sure SQL function exists. */
export async function toggleVote(questionId: string, sessionId: string) {
  const { data, error } = await supabase.rpc("toggle_question_vote", {
    p_question_id: questionId,
    p_session_id: sessionId,
  });
  if (error) throw error;
  return data?.[0] as { voted: boolean; vote_count: number } | undefined;
}

export function useRealtimeSession(
  sessionId: string | undefined,
  opts: Options = {}
) {
  const {
    approvedOnly = true,
    debounceMs = 120,
    safetyPollMs = 60000,
    fetchMyVotes = true,
  } = opts;

  const [session, setSession] = useState<SessionRow | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const debouncedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQuestions = useCallback(
    async (sid: string) => {
      const base = supabase
        .from("questions")
        .select("*")
        .eq("session_id", sid)
        .order("created_at", { ascending: true });

      const query = approvedOnly ? base.eq("status", "approved") : base;
      const { data, error } = await query;
      if (error) {
        setError(error.message);
        return;
      }
      setQuestions((data as Question[]) ?? []);
    },
    [approvedOnly]
  );

  const fetchSession = useCallback(async (sid: string) => {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sid)
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setSession(data as SessionRow);
  }, []);

  const fetchMyVotesForSession = useCallback(
    async (sid: string) => {
      if (!fetchMyVotes) return;
      const { data, error } = await supabase
        .from("question_votes")
        .select("question_id")
        .eq("session_id", sid);
      if (error) {
        return;
      }
      const ids = new Set<string>();
      (data as VoteRow[] | null)?.forEach((v) => {
        if (v.question_id) ids.add(v.question_id);
      });
      setMyVotes(ids);
    },
    [fetchMyVotes]
  );

  const debouncedRefetch = useCallback(
    (sid: string, delay = debounceMs) => {
      if (debouncedTimerRef.current) clearTimeout(debouncedTimerRef.current);
      debouncedTimerRef.current = setTimeout(async () => {
        await Promise.all([
          fetchQuestions(sid),
          fetchMyVotesForSession(sid),
        ]);
      }, delay);
    },
    [debounceMs, fetchQuestions, fetchMyVotesForSession]
  );

  // Initial load
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!sessionId) {
          setError("Missing sessionId");
          setLoading(false);
          return;
        }
        await Promise.all([
          fetchSession(sessionId),
          fetchQuestions(sessionId),
          fetchMyVotesForSession(sessionId),
        ]);
        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(getErrorMessage(e, "Failed to load session"));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, fetchSession, fetchQuestions, fetchMyVotesForSession]);

  // Real-time subscriptions
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`session-${sessionId}`, {
      config: { presence: { key: sessionId } },
    });

    // Questions changes
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "questions",
        filter: `session_id=eq.${sessionId}`,
      },
      () => debouncedRefetch(sessionId)
    );

    // Session status changes
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "sessions",
        filter: `id=eq.${sessionId}`,
      },
      () => fetchSession(sessionId)
    );

    // Vote changes
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "question_votes",
        filter: `session_id=eq.${sessionId}`,
      },
      () => debouncedRefetch(sessionId, 50)
    );

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [sessionId, debouncedRefetch, fetchSession]);

  // Safety polling
  useEffect(() => {
    if (!sessionId || safetyPollMs <= 0) return;

    const interval = setInterval(() => {
      debouncedRefetch(sessionId, 0);
    }, safetyPollMs);

    safetyPollRef.current = interval;

    return () => {
      clearInterval(interval);
      safetyPollRef.current = null;
    };
  }, [sessionId, safetyPollMs, debouncedRefetch]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debouncedTimerRef.current) clearTimeout(debouncedTimerRef.current);
      if (safetyPollRef.current) clearInterval(safetyPollRef.current);
    };
  }, []);

  return {
    session,
    questions,
    myVotes,
    loading,
    error,
    refetch: () => sessionId && debouncedRefetch(sessionId, 0),
  };
}
