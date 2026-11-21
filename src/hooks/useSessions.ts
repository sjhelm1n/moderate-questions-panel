// SPDX-License-Identifier: Apache-2.0
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  createSession,
  endSession,
  fetchModeratorSessions,
} from "@/services/supabase/sessionService";

export function useSessions(moderatorId: string | undefined, includeEnded: boolean) {
  const queryClient = useQueryClient();
  const ownerId = moderatorId ?? "";
  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions(ownerId, includeEnded),
    queryFn: () => fetchModeratorSessions(ownerId, includeEnded),
    enabled: Boolean(moderatorId),
  });

  const createMutation = useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      createSession({ ...input, moderatorId: ownerId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions", ownerId] });
    },
  });

  const endMutation = useMutation({
    mutationFn: endSession,
    onSuccess: async (_data, sessionId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sessions", ownerId] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) }),
      ]);
    },
  });

  return {
    sessions: sessionsQuery.data ?? [],
    loading: sessionsQuery.isLoading,
    error: sessionsQuery.error,
    createSession: createMutation.mutateAsync,
    creating: createMutation.isPending,
    endSession: endMutation.mutateAsync,
    ending: endMutation.isPending,
  };
}
