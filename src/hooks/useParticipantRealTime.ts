import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Question, Session } from './useSupabase';

interface UseParticipantRealTimeProps {
  sessionId: string;
  onSessionUpdate?: (session: Session) => void;
  onQuestionsUpdate?: (questions: Question[]) => void;
}

interface UseParticipantRealTimeReturn {
  approvedQuestions: Question[];
  session: Session | null;
  isConnected: boolean;
  refetch: () => Promise<void>;
}

export const useParticipantRealTime = ({
  sessionId,
  onSessionUpdate,
  onQuestionsUpdate,
}: UseParticipantRealTimeProps): UseParticipantRealTimeReturn => {
  const [approvedQuestions, setApprovedQuestions] = useState<Question[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch approved questions only (for participants)
  const fetchApprovedQuestions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'approved')
        .order('vote_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching approved questions:', error);
        return;
      }

      const transformedQuestions: Question[] = (data || []).map(q => ({
        id: q.id,
        session_id: q.session_id,
        text: q.content,
        status: q.status,
        submitter_name: q.submitter_name,
        vote_count: q.vote_count || 0,
        created_at: q.created_at
      }));

      setApprovedQuestions(transformedQuestions);
      onQuestionsUpdate?.(transformedQuestions);
    } catch (err) {
      console.error('Exception fetching approved questions:', err);
    }
  }, [sessionId, onQuestionsUpdate]);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Error fetching session:', error);
        return;
      }

      setSession(data);
      onSessionUpdate?.(data);
    } catch (err) {
      console.error('Exception fetching session:', err);
    }
  }, [sessionId, onSessionUpdate]);

  // Combined refetch function
  const refetch = useCallback(async () => {
    await Promise.all([fetchApprovedQuestions(), fetchSession()]);
  }, [fetchApprovedQuestions, fetchSession]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!sessionId) return;

    console.log('Setting up participant real-time subscriptions for session:', sessionId);

    const channel = supabase
      .channel(`participant_${sessionId}`)
      // Listen to questions table changes
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'questions',
          filter: `session_id=eq.${sessionId}`
        }, 
        (payload) => {
          console.log('Questions table changed:', payload);
          fetchApprovedQuestions();
        }
      )
      // Listen to sessions table changes
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Session updated:', payload);
          fetchSession();
        }
      )
      .subscribe((status) => {
        console.log('Participant subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to participant updates');
          // Initial fetch when connected
          refetch();
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to participant updates');
          setIsConnected(false);
        }
      });

    return () => {
      console.log('Cleaning up participant real-time subscription');
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [sessionId, fetchApprovedQuestions, fetchSession, refetch]);

  return {
    approvedQuestions,
    session,
    isConnected,
    refetch,
  };
};