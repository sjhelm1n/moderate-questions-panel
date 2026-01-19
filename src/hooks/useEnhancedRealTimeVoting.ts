import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Question } from './useSupabase';
import { useOptimisticVoting } from './useOptimisticVoting';

interface VoteUpdate {
  questionId: string;
  newVoteCount: number;
  timestamp: number;
  source: 'server' | 'optimistic';
}

export function useEnhancedRealTimeVoting(sessionId: string) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [voteUpdates, setVoteUpdates] = useState<Map<string, VoteUpdate>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  const channelRef = useRef<any>(null);
  const animationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const heartbeatInterval = useRef<NodeJS.Timeout>();
  
  const {
    voteStates,
    initializeVoteState,
    updateServerCount,
    castVote,
    hasUserVoted,
    queueLength
  } = useOptimisticVoting(sessionId);

  // Enhanced question transformation with vote state integration
  const transformQuestions = useCallback((data: any[]) => {
    return (data || []).map(q => {
      const voteState = voteStates.get(q.id);
      return {
        id: q.id,
        session_id: q.session_id,
        text: q.content,
        status: q.status || 'submitted',
        submitter_name: q.submitter_name,
        vote_count: voteState?.optimisticCount ?? q.vote_count ?? 0,
        created_at: q.created_at
      };
    });
  }, [voteStates]);

  // Enhanced sorting with stability
  const sortQuestionsByVotes = useCallback((questions: Question[]) => {
    return [...questions].sort((a, b) => {
      if (b.vote_count !== a.vote_count) {
        return b.vote_count - a.vote_count;
      }
      // Secondary sort by creation time for stability
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, []);

  // Enhanced fetch with vote state initialization
  const fetchQuestions = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('session_id', sessionId)
        .order('vote_count', { ascending: false });

      if (error) {
        console.error('Error fetching questions:', error);
        return;
      }

      // Initialize vote states for all questions
      data?.forEach(q => {
        initializeVoteState(q.id, q.vote_count || 0);
      });

      const transformedQuestions = transformQuestions(data);
      setQuestions(sortQuestionsByVotes(transformedQuestions));
    } catch (error) {
      console.error('Exception fetching questions:', error);
    }
  }, [sessionId, transformQuestions, sortQuestionsByVotes, initializeVoteState]);

  // Enhanced vote update handler with conflict resolution
  const handleVoteUpdate = useCallback((payload: any) => {
    const questionId = payload.new.id;
    const serverVoteCount = payload.new.vote_count || 0;
    
    // Update server count in optimistic voting system
    updateServerCount(questionId, serverVoteCount);
    
    // Update questions with server data
    setQuestions(prev => {
      const updated = prev.map(q => {
        if (q.id === questionId) {
          const voteState = voteStates.get(questionId);
          return {
            ...q,
            vote_count: voteState?.optimisticCount ?? serverVoteCount
          };
        }
        return q;
      });
      return sortQuestionsByVotes(updated);
    });

    // Track update for animation
    setVoteUpdates(prev => {
      const newMap = new Map(prev);
      newMap.set(questionId, {
        questionId,
        newVoteCount: serverVoteCount,
        timestamp: Date.now(),
        source: 'server'
      });
      return newMap;
    });

    // Clear animation after delay
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
    }, 3000);

    animationTimeouts.current.set(questionId, newTimeout);
  }, [updateServerCount, voteStates, sortQuestionsByVotes]);

  // Connection health monitoring
  const setupHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    
    heartbeatInterval.current = setInterval(() => {
      if (channelRef.current?.state === 'joined') {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    }, 5000);
  }, []);

  // Enhanced real-time subscription with reconnection
  const setupRealtimeSubscription = useCallback(() => {
    if (!sessionId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    setConnectionStatus('connecting');

    const channel = supabase
      .channel(`enhanced_voting_${sessionId}`)
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
      }, () => {
        // Refresh questions when new votes are inserted
        setTimeout(() => fetchQuestions(), 500);
      })
      .subscribe((status) => {
        console.log('Enhanced voting subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          setupHeartbeat();
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          
          // Schedule reconnection
          if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
          }
          
          reconnectTimeout.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            setupRealtimeSubscription();
          }, 3000);
        }
      });

    channelRef.current = channel;
  }, [sessionId, handleVoteUpdate, fetchQuestions, setupHeartbeat]);

  // Enhanced vote function with optimistic updates
  const handleVote = useCallback(async (questionId: string) => {
    const success = await castVote(questionId);
    
    if (success) {
      // Add optimistic animation
      setVoteUpdates(prev => {
        const newMap = new Map(prev);
        const voteState = voteStates.get(questionId);
        newMap.set(questionId, {
          questionId,
          newVoteCount: voteState?.optimisticCount ?? 0,
          timestamp: Date.now(),
          source: 'optimistic'
        });
        return newMap;
      });
      
      // Update questions immediately with optimistic count
      setQuestions(prev => {
        const voteState = voteStates.get(questionId);
        const updated = prev.map(q => 
          q.id === questionId 
            ? { ...q, vote_count: voteState?.optimisticCount ?? q.vote_count }
            : q
        );
        return sortQuestionsByVotes(updated);
      });
    }
    
    return success;
  }, [castVote, voteStates, sortQuestionsByVotes]);

  // Setup subscription
  useEffect(() => {
    setupRealtimeSubscription();
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
      animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      animationTimeouts.current.clear();
    };
  }, [setupRealtimeSubscription]);

  // Initial fetch
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Memoized return value
  return useMemo(() => ({
    questions,
    voteUpdates,
    connectionStatus,
    voteStates,
    queueLength,
    refetch: fetchQuestions,
    vote: handleVote,
    hasUserVoted
  }), [
    questions,
    voteUpdates,
    connectionStatus,
    voteStates,
    queueLength,
    fetchQuestions,
    handleVote,
    hasUserVoted
  ]);
}