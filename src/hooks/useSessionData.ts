// SPDX-License-Identifier: Apache-2.0
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { fetchQuestions } from "@/services/supabase/questionService";
import { fetchSession } from "@/services/supabase/sessionService";

export function useSessionData(sessionId: string, viewerId = "anonymous") {
  const queryClient = useQueryClient();
  const channelKey = `${sessionId}:${viewerId}`;
  const sessionQuery = useQuery({
    queryKey: queryKeys.session(sessionId),
    queryFn: () => fetchSession(sessionId),
    enabled: Boolean(sessionId),
  });

  const questionsQuery = useQuery({
    queryKey: queryKeys.questions(sessionId, viewerId),
    queryFn: () => fetchQuestions(sessionId),
    enabled: Boolean(sessionId),
  });

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-data:${sessionId}:${viewerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions", filter: `session_id=eq.${sessionId}` },
        () => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.questions(sessionId, viewerId),
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
        },
      )
      .subscribe();

    const safetyPoll = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.questions(sessionId, viewerId),
      });
    }, 60_000);

    return () => {
      window.clearInterval(safetyPoll);
      void supabase.removeChannel(channel);
    };
  }, [channelKey, queryClient, sessionId, viewerId]);

  const error = sessionQuery.error ?? questionsQuery.error;

  return {
    session: sessionQuery.data ?? null,
    questions: questionsQuery.data ?? [],
    loading: sessionQuery.isLoading || questionsQuery.isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
