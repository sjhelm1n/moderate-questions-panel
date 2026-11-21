// SPDX-License-Identifier: Apache-2.0
import { supabase } from "@/lib/supabase";
import type { SessionFeedback } from "@/types/domain";

export async function submitSessionFeedback(input: {
  sessionId: string;
  rating: number;
  comment?: string;
  clientId: string;
}): Promise<void> {
  const { error } = await supabase.rpc("submit_feedback", {
    p_session_id: input.sessionId,
    p_rating: input.rating,
    p_comment: input.comment?.trim() || null,
    p_client_id: input.clientId,
  });

  if (error) throw error;
}

export async function fetchSessionFeedback(
  moderatorId: string,
  sessionId?: string,
): Promise<SessionFeedback[]> {
  let query = supabase
    .from("session_feedback")
    .select("id,session_id,rating,comment,created_at,sessions!inner(name,moderator_id)")
    .eq("sessions.moderator_id", moderatorId)
    .order("created_at", { ascending: false });

  if (sessionId) query = query.eq("session_id", sessionId);
  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const relatedSession = row.sessions as unknown as { name?: string } | null;
    return {
      id: row.id,
      session_id: row.session_id,
      rating: row.rating,
      comment: row.comment,
      created_at: row.created_at,
      session_name: relatedSession?.name,
    };
  });
}
