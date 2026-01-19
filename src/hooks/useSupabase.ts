import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Session {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'closed' | 'ended' | 'paused';
  moderator_id: string;
  created_at: string;
}

export interface Question {
  id: string;
  session_id: string;
  text: string;
  status: 'submitted' | 'approved' | 'asked' | 'ignore';
  submitter_name?: string;
  vote_count: number;
  created_at: string;
}


export function useSupabase() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  
  // Memoized fetch sessions function
  const fetchSessions = useCallback(async (moderatorId?: string, includeClosed: boolean = false) => {
    console.log('Fetching sessions...', { moderatorId, includeClosed });
    let query = supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filter by moderator if provided
    if (moderatorId) {
      query = query.eq('moderator_id', moderatorId);
    }
    
    // Filter by status based on includeClosed parameter
    if (includeClosed) {
      query = query.eq('status', 'ended');
    } else {
      query = query.neq('status', 'ended');
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching sessions:', error);
      return;
    }
    console.log('Sessions fetched:', data?.length || 0);
    setSessions(data || []);
  }, []);

  // Memoized question transformation
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

  // Optimized fetch questions function
  const fetchQuestions = useCallback(async (sessionId: string) => {
    console.log('Fetching questions for session:', sessionId);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
    
    const transformedQuestions = transformQuestions(data);
    console.log('Questions fetched and transformed:', transformedQuestions.length);
    setQuestions(transformedQuestions);
    return transformedQuestions;
  }, [transformQuestions]);

  // Optimized create session function
  const createSession = useCallback(async (name: string, description?: string) => {
    console.log('Creating session with name:', name, 'description:', description);
    
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user?.id || 'No user');
    
    if (!user) {
      console.error('No authenticated user found');
      return null;
    }

    const sessionData = { 
      name, 
      description, 
      moderator_id: user.id,
      status: 'active' as const
    };
    
    console.log('Inserting session data:', sessionData);

    const { data, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating session:', error);
      return null;
    }
    
    console.log('Session created successfully:', data);
    await fetchSessions();
    return data;
  }, [fetchSessions]);

  // Optimized submit question function
  const submitQuestion = useCallback(async (sessionId: string, content: string, submitterName?: string) => {
    console.log('Submitting question:', { sessionId, content, submitterName });
    
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert([{ 
          session_id: sessionId, 
          content, 
          submitter_name: submitterName,
          status: 'submitted'
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error submitting question:', error);
        return null;
      }
      
      console.log('Question submitted successfully:', data);
      await fetchQuestions(sessionId);
      return data;
    } catch (err) {
      console.error('Exception submitting question:', err);
      return null;
    }
  }, [fetchQuestions]);

  // Optimized update question status function
  const updateQuestionStatus = useCallback(async (questionId: string, status: Question['status']) => {
    console.log('Updating question status:', questionId, status);
    const { error } = await supabase
      .from('questions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', questionId);
    
    if (error) {
      console.error('Error updating question status:', error);
      return false;
    }
    console.log('Question status updated successfully');
    return true;
  }, []);

  // Optimized close session function with moderator check
  const closeSession = useCallback(async (sessionId: string) => {
    console.log('Closing session:', sessionId);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    // First verify the user is the moderator of this session
    const { data: session, error: fetchError } = await supabase
      .from('sessions')
      .select('moderator_id')
      .eq('id', sessionId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching session:', fetchError);
      return false;
    }
    
    if (session.moderator_id !== user.id) {
      console.error('User is not the moderator of this session');
      return false;
    }

    // Now close the session
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'ended', updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('moderator_id', user.id); // Double check with moderator_id in the update
    
    if (error) {
      console.error('Error closing session:', error);
      return false;
    }
    console.log('Session closed successfully');
    await fetchSessions();
    return true;
  }, [fetchSessions]);

  // Optimized vote function
  const voteOnQuestion = useCallback(async (
    questionId: string,
    sessionId: string,
    voterId: string
  ): Promise<{ ok: boolean; count?: number; error?: any }> => {
    console.log('=== VOTING WITH RPC START ===');
    console.log('Question ID:', questionId);
    console.log('Session ID:', sessionId);
    console.log('Voter ID:', voterId);
    
    try {
      const { data, error } = await supabase.rpc('cast_vote', {
        p_question_id: questionId,
        p_session_id: sessionId,
        p_voter_id: voterId,
      });

      if (error) {
        console.error('RPC cast_vote error:', error);
        return { ok: false, error };
      }
      
      const newCount = Array.isArray(data) ? data[0]?.vote_count : undefined;
      console.log('Vote cast successfully, new count:', newCount);
      console.log('=== VOTING WITH RPC END ===');
      
      return { ok: true, count: newCount };
    } catch (error) {
      console.error('Exception in voteOnQuestion RPC:', error);
      return { ok: false, error };
    }
  }, []);

  // Optimized real-time subscription
  const subscribeToVotes = useCallback((sessionId: string) => {
    console.log('Setting up real-time subscription for votes in session:', sessionId);
    
    // Clean up existing channel
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }

    const channel = supabase
      .channel(`votes_${sessionId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'question_votes',
          filter: `session_id=eq.${sessionId}`
        }, 
        (payload) => {
          console.log('New vote detected:', payload);
          fetchQuestions(sessionId);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public', 
          table: 'questions',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Question updated (vote count):', payload);
          setQuestions(prev => prev.map(q => 
            q.id === payload.new.id 
              ? { ...q, vote_count: payload.new.vote_count || 0 }
              : q
          ));
        }
      )
      .subscribe((status) => {
        console.log('Vote subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to vote changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to vote changes');
        }
      });

    setRealtimeChannel(channel);
    return channel;
  }, [realtimeChannel, fetchQuestions]);

  // Optimized unsubscribe function
  const unsubscribeFromVotes = useCallback(() => {
    if (realtimeChannel) {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(realtimeChannel);
      setRealtimeChannel(null);
    }
  }, [realtimeChannel]);

  // Optimized submit feedback function
  const submitFeedback = useCallback(async (sessionId: string, rating: number, comment: string = '') => {
    console.log('Submitting feedback:', { sessionId, rating, comment });
    
    try {
      const { data, error } = await supabase
        .from('session_feedback')
        .insert([{ 
          session_id: sessionId, 
          rating,
          comment: comment.trim() || null
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error submitting feedback:', error);
        return false;
      }
      
      console.log('Feedback submitted successfully:', data);
      return true;
    } catch (err) {
      console.error('Exception submitting feedback:', err);
      return false;
    }
  }, []);

  // Optimized fetch session feedback function
  const fetchSessionFeedback = useCallback(async (moderatorId: string, sessionId?: string) => {
    console.log('Fetching session feedback for moderator:', moderatorId, 'sessionId:', sessionId);
    
    try {
      let query = supabase
        .from('session_feedback')
        .select(`
          *,
          sessions!inner(name, moderator_id)
        `)
        .eq('sessions.moderator_id', moderatorId);
      
      // If sessionId is provided, filter by specific session
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching session feedback:', error);
        return [];
      }
      
      const transformedFeedback = (data || []).map(f => ({
        id: f.id,
        session_id: f.session_id,
        rating: f.rating,
        comment: f.comment,
        created_at: f.created_at,
        session_name: f.sessions?.name
      }));
      
      console.log('Session feedback fetched:', transformedFeedback.length);
      return transformedFeedback;
    } catch (err) {
      console.error('Exception fetching session feedback:', err);
      return [];
    }
  }, []);

  // Real-time subscription for sessions with optimization
  useEffect(() => {
    const channel = supabase
      .channel('sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        console.log('Sessions table changed, refreshing...');
        fetchSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSessions]);

  // Initial fetch with optimization
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Memoized return value
  return useMemo(() => ({
    sessions,
    questions,
    loading,
    fetchSessions,
    fetchQuestions,
    createSession,
    submitQuestion,
    updateQuestionStatus,
    closeSession,
    voteOnQuestion,
    subscribeToVotes,
    unsubscribeFromVotes,
    submitFeedback,
    fetchSessionFeedback,
    setLoading
  }), [
    sessions,
    questions,
    loading,
    fetchSessions,
    fetchQuestions,
    createSession,
    submitQuestion,
    updateQuestionStatus,
    closeSession,
    voteOnQuestion,
    subscribeToVotes,
    unsubscribeFromVotes,
    submitFeedback,
    fetchSessionFeedback
  ]);
}
