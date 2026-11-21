// SPDX-License-Identifier: Apache-2.0

export type SessionStatus = "active" | "paused" | "ended";
export type QuestionStatus = "submitted" | "approved" | "asked" | "ignore";
export type QuestionPriority = "high" | "medium" | "low";
export type UserRole = "moderator" | "audience";

export interface Session {
  id: string;
  name: string;
  description: string | null;
  status: SessionStatus;
  moderator_id: string;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  session_id: string;
  text: string;
  submitter_name: string | null;
  status: QuestionStatus;
  priority: QuestionPriority;
  vote_count: number;
  created_at: string;
  updated_at: string;
}

export interface SessionFeedback {
  id: string;
  session_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  session_name?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}
