import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface ApprovedQuestion {
  id: string;
  session_id: string;
  text: string;            // maps from content
  status: 'approved' | 'asked';  // Now includes both approved and asked
  submitter_name?: string;
  vote_count: number;
  created_at: string;
}

interface ApprovedQuestionRow {
  id: string;
  session_id: string;
  content: string;
  status: 'approved' | 'asked';
  submitter_name?: string | null;
  vote_count?: number | null;
  created_at: string;
}

function sortByVotesThenTime(list: ApprovedQuestion[]) {
  return [...list].sort((a, b) => {
    if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    return bt - at;
  });
}

export function useApprovedQuestions(sessionId: string) {
  const [questions, setQuestions] = useState<ApprovedQuestion[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const mounted = useRef(true);
  const channelRefs = useRef<RealtimeChannel[]>([]);

  const fetchApprovedAndAsked = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('id, session_id, content, status, submitter_name, vote_count, created_at')
        .eq('session_id', sessionId)
        .in('status', ['approved', 'asked'])  // Fetch both approved and asked
        .order('vote_count', { ascending: false });

      if (error) {
        console.error('fetchApprovedAndAsked error', error);
        return;
      }
      
      if (!mounted.current) return;

      const mapped = ((data as ApprovedQuestionRow[] | null) || []).map((q) => ({
        id: q.id,
        session_id: q.session_id,
        text: q.content,
        status: q.status as 'approved' | 'asked',  // Preserve actual status
        submitter_name: q.submitter_name ?? undefined,
        vote_count: q.vote_count ?? 0,
        created_at: q.created_at,
      }));

      setQuestions(sortByVotesThenTime(mapped));
    } catch (error) {
      console.error('Exception in fetchApprovedAndAsked:', error);
    }
  }, [sessionId]);

  const cleanupChannels = useCallback(() => {
    channelRefs.current.forEach(channel => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    });
    channelRefs.current = [];
  }, []);

  useEffect(() => {
    mounted.current = true;
    fetchApprovedAndAsked();
    return () => { 
      mounted.current = false; 
      cleanupChannels();
    };
  }, [fetchApprovedAndAsked, cleanupChannels]);

  // Enhanced real-time subscriptions with connection monitoring
  useEffect(() => {
    if (!sessionId) return;

    cleanupChannels();
    setConnectionStatus('connecting');
    // 1) Listen for both approved and asked questions
    const chApprovedAndAsked = supabase
      .channel(`audience_questions_approved_asked_${sessionId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'questions', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (!mounted.current) return;
          const q = payload.new as ApprovedQuestionRow;
          
          // Only handle approved and asked questions
          if (q.status === 'approved' || q.status === 'asked') {
            setQuestions(prev => {
              const next = prev.some(x => x.id === q.id)
                ? prev.map(x => x.id === q.id ? {
                    id: q.id,
                    session_id: q.session_id,
                    text: q.content,
                    status: q.status as 'approved' | 'asked',
                    submitter_name: q.submitter_name ?? undefined,
                    vote_count: q.vote_count ?? 0,
                    created_at: q.created_at,
                  } : x)
                : [...prev, {
                    id: q.id,
                    session_id: q.session_id,
                    text: q.content,
                    status: q.status as 'approved' | 'asked',
                    submitter_name: q.submitter_name ?? undefined,
                    vote_count: q.vote_count ?? 0,
                    created_at: q.created_at,
                  }];
              return sortByVotesThenTime(next);
            });
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'questions', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (!mounted.current) return;
          const oldRow = payload.old as ApprovedQuestionRow;
          const newRow = payload.new as ApprovedQuestionRow;

          // Handle transitions to/from approved/asked
          if (newRow.status === 'approved' || newRow.status === 'asked') {
            // Add or update question in list
            setQuestions(prev => {
              const exists = prev.some(x => x.id === newRow.id);
              const next = exists
                ? prev.map(x => x.id === newRow.id ? {
                    id: newRow.id,
                    session_id: newRow.session_id,
                    text: newRow.content,
                    status: newRow.status as 'approved' | 'asked',
                    submitter_name: newRow.submitter_name ?? undefined,
                    vote_count: newRow.vote_count ?? 0,
                    created_at: newRow.created_at,
                  } : x)
                : [...prev, {
                    id: newRow.id,
                    session_id: newRow.session_id,
                    text: newRow.content,
                    status: newRow.status as 'approved' | 'asked',
                    submitter_name: newRow.submitter_name ?? undefined,
                    vote_count: newRow.vote_count ?? 0,
                    created_at: newRow.created_at,
                  }];
              return sortByVotesThenTime(next);
            });
          } else if ((oldRow?.status === 'approved' || oldRow?.status === 'asked') && 
                     (newRow.status !== 'approved' && newRow.status !== 'asked')) {
            // Remove question from list if it moved away from approved/asked
            setQuestions(prev => prev.filter(q => q.id !== newRow.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });

    channelRefs.current = [chApprovedAndAsked];

    return () => cleanupChannels();
  }, [sessionId, cleanupChannels]);

  const refetch = useCallback(() => {
    fetchApprovedAndAsked();
  }, [fetchApprovedAndAsked]);

  return useMemo(() => ({
    questions,
    connectionStatus,
    refetch,
    loading: false
  }), [questions, connectionStatus, refetch]);
}
