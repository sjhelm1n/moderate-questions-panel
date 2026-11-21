// SPDX-License-Identifier: Apache-2.0
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  fetchSessionFeedback,
  submitSessionFeedback,
} from "@/services/supabase/feedbackService";
import { getOrCreateVoterId } from "@/lib/voterStorage";

export function useFeedback(moderatorId: string | undefined, sessionId?: string) {
  const ownerId = moderatorId ?? "";
  return useQuery({
    queryKey: queryKeys.feedback(ownerId, sessionId),
    queryFn: () => fetchSessionFeedback(ownerId, sessionId),
    enabled: Boolean(moderatorId),
  });
}

export function useSubmitFeedback(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rating: number; comment?: string }) =>
      submitSessionFeedback({
        sessionId,
        clientId: getOrCreateVoterId(sessionId),
        ...input,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
  });
}
