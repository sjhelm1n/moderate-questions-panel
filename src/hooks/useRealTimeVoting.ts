import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Question } from './useSupabase';

interface VoteUpdate {
  questionId: string;
  newVoteCount: number;
  timestamp: number;
}

export function useRealTimeVoting(sessionId: string) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [voteUpdates, setVoteUpdates] = useState<Map<string, VoteUpdate>>(new Map());
  const channelRef = useRef<any>(null);
  const animationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Memoized question transformation function
  const transformQuestions = useCallback((data: any[]) => {
    return (data || []).map(q => ({
      id: q.id,
      session_id: q.session_id,
      text: q.content,
      status: q.status || 'submitted',
      submitter_name: q.submitter_name,
      vote_count: q.vote_count || 0,
      created_at: q.created_at
    }));
  }, []);

  // Optimized question sorting function
  const sortQuestionsByVotes = useCallback((questions: Question[]) => {
    return [...questions].sort((a, b) => b.vote_count - a.vote_count);
  }, []);

  // Fetch initial questions with memoization
  const fetchQuestions = useCallback(async () => {
    if (!sessionId) return;

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('vote_count', { ascending: false });

    if (error) {
      console.error('Error fetching questions:', error);
      return;
    }

    const transformedQuestions = transformQuestions(data);
    setQuestions(transformedQuestions);
  }, [sessionId, transformQuestions]);

  // Optimized vote update handler
  const handleVoteUpdate = useCallback((payload: any) => {
    console.log('Real-time vote update:', payload);
    const questionId = payload.new.id;
    const newVoteCount = payload.new.vote_count || 0;

    // Update questions with new vote count and sort
    setQuestions(prev => {
      const updated = prev.map(q => 
        q.id === questionId 
          ? { ...q, vote_count: newVoteCount }
          : q
      );
      return sortQuestionsByVotes(updated);
    });

    // Track vote update for animation
    setVoteUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(questionId, {
        questionId,
        newVoteCount,
        timestamp: Date.now()
      });
      return newMap;
    });

    // Clear animation after delay with cleanup
    const existingTimeout = animationTimeouts.current.get(questionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const newTimeout = setTimeout(() => {
      setVoteUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(questionId);
        return newMap;
      });
      animationTimeouts.current.delete(questionId);
    }, 2000);

    animationTimeouts.current.set(questionId, newTimeout);
  }, [sortQuestionsByVotes]);

  // Optimized new vote handler
  const handleNewVote = useCallback(() => {
    console.log('New vote inserted');
    // Debounced refresh to avoid too many calls
    fetchQuestions();
  }, [fetchQuestions]);

  // Set up real-time subscription with cleanup
  useEffect(() => {
    if (!sessionId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`realtime_voting_${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'questions',
        filter: `session_id=eq.${sessionId}`
      }, handleVoteUpdate)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'question_votes',
        filter: `session_id=eq.${sessionId}`
      }, handleNewVote)
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      // Clear all timeouts
      animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      animationTimeouts.current.clear();
    };
  }, [sessionId, handleVoteUpdate, handleNewVote]);

  // Initial fetch with dependency optimization
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Memoized return value to prevent unnecessary re-renders
  return useMemo(() => ({
    questions,
    voteUpdates,
    refetch: fetchQuestions
  }), [questions, voteUpdates, fetchQuestions]);
}