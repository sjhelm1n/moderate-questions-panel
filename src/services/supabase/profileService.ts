// SPDX-License-Identifier: Apache-2.0
import { supabase } from "@/lib/supabase";
import type { UserProfile, UserRole } from "@/types/domain";

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id,email,full_name,role,created_at,updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    role: data.role as UserRole,
  };
}
