// SPDX-License-Identifier: Apache-2.0
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import {
  submitQuestion,
  updateQuestionStatus,
} from "@/services/supabase/questionService";
import { getOrCreateVoterId } from "@/lib/voterStorage";
import type { QuestionStatus } from "@/types/domain";

export function useSubmitQuestion(sessionId: string, viewerId = "anonymous") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { content: string; submitterName?: string }) =>
      submitQuestion({
        sessionId,
        clientId: getOrCreateVoterId(sessionId),
        ...input,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.questions(sessionId, viewerId),
      });
    },
  });
}

export function useUpdateQuestionStatus(sessionId: string, viewerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { questionId: string; status: QuestionStatus }) =>
      updateQuestionStatus(input.questionId, input.status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.questions(sessionId, viewerId),
      });
    },
  });
}
