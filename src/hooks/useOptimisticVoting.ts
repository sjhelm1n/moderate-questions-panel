import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface VoteState {
  questionId: string;
  optimisticCount: number;
  serverCount: number;
  isVoting: boolean;
  hasVoted: boolean;
  error?: string;
  retryCount: number;
}

interface VoteQueue {
  questionId: string;
  sessionId: string;
  voterId: string;
  timestamp: number;
  attempts: number;
}

export function useOptimisticVoting(sessionId: string) {
  const [voteStates, setVoteStates] = useState<Map<string, VoteState>>(new Map());
  const [voteQueue, setVoteQueue] = useState<VoteQueue[]>([]);
  const processingQueue = useRef(false);
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Get voter ID with persistence
  const getVoterId = useCallback(() => {
    const key = `voter_${sessionId}`;
    let voterId = localStorage.getItem(key);
    if (!voterId) {
      voterId = `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(key, voterId);
    }
    return voterId;
  }, [sessionId]);

  // Check if user has voted
  const hasUserVoted = useCallback((questionId: string) => {
    const voterId = getVoterId();
    const voteKey = `voted_${sessionId}_${questionId}_${voterId}`;
    return localStorage.getItem(voteKey) === 'true';
  }, [sessionId, getVoterId]);

  // Initialize vote state for a question
  const initializeVoteState = useCallback((questionId: string, initialCount: number) => {
    setVoteStates(prev => {
      if (prev.has(questionId)) return prev;
      const newMap = new Map(prev);
      newMap.set(questionId, {
        questionId,
        optimisticCount: initialCount,
        serverCount: initialCount,
        isVoting: false,
        hasVoted: hasUserVoted(questionId),
        retryCount: 0
      });
      return newMap;
    });
  }, [hasUserVoted]);

  // Update server count (from real-time updates)
  const updateServerCount = useCallback((questionId: string, serverCount: number) => {
    setVoteStates(prev => {
      const current = prev.get(questionId);
      if (!current) return prev;
      
      const newMap = new Map(prev);
      newMap.set(questionId, {
        ...current,
        serverCount,
        optimisticCount: Math.max(current.optimisticCount, serverCount),
        error: undefined
      });
      return newMap;
    });
  }, []);

  // Process vote queue
  const processVoteQueue = useCallback(async () => {
    if (processingQueue.current || voteQueue.length === 0) return;
    
    processingQueue.current = true;
    const currentQueue = [...voteQueue];
    
    for (const vote of currentQueue) {
      try {
        const { data, error } = await supabase.rpc('cast_vote', {
          p_question_id: vote.questionId,
          p_session_id: vote.sessionId,
          p_voter_id: vote.voterId,
        });

        if (error) {
          throw error;
        }

        // Success - remove from queue and update state
        setVoteQueue(prev => prev.filter(v => 
          !(v.questionId === vote.questionId && v.timestamp === vote.timestamp)
        ));

        setVoteStates(prev => {
          const current = prev.get(vote.questionId);
          if (!current) return prev;
          
          const newMap = new Map(prev);
          const serverCount = Array.isArray(data) ? data[0]?.vote_count : current.serverCount + 1;
          
          newMap.set(vote.questionId, {
            ...current,
            serverCount,
            optimisticCount: serverCount,
            isVoting: false,
            hasVoted: true,
            error: undefined,
            retryCount: 0
          });
          return newMap;
        });

        // Mark as voted in localStorage
        const voteKey = `voted_${vote.sessionId}_${vote.questionId}_${vote.voterId}`;
        localStorage.setItem(voteKey, 'true');

      } catch (error) {
        console.error('Vote failed:', error);
        
        // Handle retry logic
        if (vote.attempts < 3) {
          setVoteQueue(prev => prev.map(v => 
            v.questionId === vote.questionId && v.timestamp === vote.timestamp
              ? { ...v, attempts: v.attempts + 1 }
              : v
          ));
          
          // Schedule retry
          const timeout = setTimeout(() => processVoteQueue(), 2000 * vote.attempts);
          retryTimeouts.current.set(vote.questionId, timeout);
        } else {
          // Max retries reached - remove from queue and show error
          setVoteQueue(prev => prev.filter(v => 
            !(v.questionId === vote.questionId && v.timestamp === vote.timestamp)
          ));
          
          setVoteStates(prev => {
            const current = prev.get(vote.questionId);
            if (!current) return prev;
            
            const newMap = new Map(prev);
            newMap.set(vote.questionId, {
              ...current,
              optimisticCount: current.serverCount, // Revert optimistic update
              isVoting: false,
              error: 'Failed to save vote after multiple attempts',
              retryCount: current.retryCount + 1
            });
            return newMap;
          });
        }
      }
    }
    
    processingQueue.current = false;
  }, [voteQueue]);

  // Cast vote with optimistic update
  const castVote = useCallback(async (questionId: string) => {
    const voterId = getVoterId();
    const voteState = voteStates.get(questionId);
    
    if (!voteState || voteState.hasVoted || voteState.isVoting) {
      return false;
    }

    // Optimistic update
    setVoteStates(prev => {
      const current = prev.get(questionId);
      if (!current) return prev;
      
      const newMap = new Map(prev);
      newMap.set(questionId, {
        ...current,
        optimisticCount: current.optimisticCount + 1,
        isVoting: true,
        hasVoted: true,
        error: undefined
      });
      return newMap;
    });

    // Add to queue
    const voteItem: VoteQueue = {
      questionId,
      sessionId,
      voterId,
      timestamp: Date.now(),
      attempts: 0
    };

    setVoteQueue(prev => [...prev, voteItem]);
    
    // Process queue
    setTimeout(() => processVoteQueue(), 100);
    
    return true;
  }, [sessionId, getVoterId, voteStates, processVoteQueue]);

  // Process queue when it changes
  useEffect(() => {
    if (voteQueue.length > 0) {
      processVoteQueue();
    }
  }, [voteQueue.length, processVoteQueue]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
      retryTimeouts.current.clear();
    };
  }, []);

  return {
    voteStates,
    initializeVoteState,
    updateServerCount,
    castVote,
    hasUserVoted,
    queueLength: voteQueue.length
  };
}