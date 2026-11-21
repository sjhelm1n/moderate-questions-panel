// SPDX-License-Identifier: Apache-2.0
// Generated from the canonical Supabase schema. Regenerate after migrations.

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: string;
          moderator_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: string;
          moderator_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          session_id: string;
          content: string;
          submitter_name: string | null;
          status: string;
          priority: string;
          vote_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          content: string;
          submitter_name?: string | null;
          status?: string;
          priority?: string;
          vote_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          priority?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      question_votes: {
        Row: {
          id: string;
          question_id: string;
          session_id: string;
          voter_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          session_id: string;
          voter_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "question_votes_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_votes_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      session_feedback: {
        Row: {
          id: string;
          session_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "session_feedback_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cast_vote: {
        Args: {
          p_question_id: string;
          p_session_id: string;
          p_voter_id: string;
        };
        Returns: { vote_count: number }[];
      };
      submit_question: {
        Args: {
          p_session_id: string;
          p_content: string;
          p_submitter_name?: string | null;
          p_client_id?: string | null;
        };
        Returns: string;
      };
      submit_feedback: {
        Args: {
          p_session_id: string;
          p_rating: number;
          p_comment: string | null;
          p_client_id: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
