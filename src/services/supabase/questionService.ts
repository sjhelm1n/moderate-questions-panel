// SPDX-License-Identifier: Apache-2.0
import { supabase } from "@/lib/supabase";
import type { Question, QuestionPriority, QuestionStatus } from "@/types/domain";

function asQuestion(row: Record<string, unknown>): Question {
  return {
    id: String(row.id),
    session_id: String(row.session_id),
    text: String(row.content),
    submitter_name: typeof row.submitter_name === "string" ? row.submitter_name : null,
    status: row.status as QuestionStatus,
    priority: row.priority as QuestionPriority,
    vote_count: Number(row.vote_count ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function fetchQuestions(sessionId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("id,session_id,content,submitter_name,status,priority,vote_count,created_at,updated_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => asQuestion(row));
}

export async function submitQuestion(input: {
  sessionId: string;
  content: string;
  submitterName?: string;
  clientId: string;
}): Promise<void> {
  const { error } = await supabase.rpc("submit_question", {
    p_session_id: input.sessionId,
    p_content: input.content,
    p_submitter_name: input.submitterName ?? null,
    p_client_id: input.clientId,
  });

  if (error) throw error;
}

export async function updateQuestionStatus(
  questionId: string,
  status: QuestionStatus,
): Promise<void> {
  const { data, error } = await supabase
    .from("questions")
    .update({ status })
    .eq("id", questionId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Question could not be updated. Check moderator access.");
}

export async function castVote(input: {
  questionId: string;
  sessionId: string;
  voterId: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc("cast_vote", {
    p_question_id: input.questionId,
    p_session_id: input.sessionId,
    p_voter_id: input.voterId,
  });

  if (error) throw error;
  return data?.[0]?.vote_count ?? 0;
}
