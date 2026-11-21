// SPDX-License-Identifier: Apache-2.0
import { supabase } from "@/lib/supabase";
import type { Session, SessionStatus } from "@/types/domain";

function asSession(row: Record<string, unknown>): Session {
  return {
    id: String(row.id),
    name: String(row.name),
    description: typeof row.description === "string" ? row.description : null,
    status: row.status as SessionStatus,
    moderator_id: String(row.moderator_id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function fetchSession(sessionId: string): Promise<Session> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id,name,description,status,moderator_id,created_at,updated_at")
    .eq("id", sessionId)
    .single();

  if (error) throw error;
  return asSession(data);
}

export async function fetchModeratorSessions(
  moderatorId: string,
  includeEnded: boolean,
): Promise<Session[]> {
  let query = supabase
    .from("sessions")
    .select("id,name,description,status,moderator_id,created_at,updated_at")
    .eq("moderator_id", moderatorId)
    .order("created_at", { ascending: false });

  query = includeEnded ? query.eq("status", "ended") : query.neq("status", "ended");
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => asSession(row));
}

export async function createSession(input: {
  name: string;
  description?: string;
  moderatorId: string;
}): Promise<Session> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      moderator_id: input.moderatorId,
    })
    .select("id,name,description,status,moderator_id,created_at,updated_at")
    .single();

  if (error) throw error;
  return asSession(data);
}

export async function endSession(sessionId: string): Promise<void> {
  const { data, error } = await supabase
    .from("sessions")
    .update({ status: "ended" })
    .eq("id", sessionId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Session could not be closed. Check moderator access.");
}
