import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Session } from '@/hooks/useSupabase';
import { QuestionSubmissionForm } from './QuestionSubmissionForm';
import { VotingQuestionCard } from './VotingQuestionCard';
import { SessionFeedbackForm } from './SessionFeedbackForm';
import { useApprovedQuestions } from '@/hooks/useApprovedQuestions'; // <- new

interface AudienceViewProps {
  sessionId: string;
}

export const AudienceView: React.FC<AudienceViewProps> = ({ sessionId }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const { questions, refetch } = useApprovedQuestions(sessionId); // <- approved-only realtime

  // Refresh function to pull latest data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refetch questions
      if (refetch) {
        await refetch();
      }
      // Refetch session data
      const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
      if (mountedRef.current && data) {
        setSession(data as Session);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load session once
  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      setIsLoading(true);
      const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
      if (!mountedRef.current) return;
      setSession((data as Session) || null);
      setIsLoading(false);
    };
    load();
    return () => { mountedRef.current = false; };
  }, [sessionId]);

  // Realtime session status (to flip to feedback immediately)
  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase
      .channel(`session_${sessionId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => setSession((prev) => (prev ? { ...prev, ...(payload.new as any) } : (payload.new as Session)))
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto pt-20 space-y-4">
          <div className="h-6 w-40 bg-blue-200/60 rounded animate-pulse mx-auto" />
          <div className="h-4 w-72 bg-blue-200/50 rounded animate-pulse mx-auto" />
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="h-5 w-60 bg-blue-200/60 rounded animate-pulse mb-3" />
              <div className="h-4 w-full bg-blue-200/40 rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card>
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Session Not Found</h1>
              <p className="text-gray-600">The session you’re looking for doesn’t exist or has ended.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Flip to feedback immediately when ended/closed
  if (session.status === 'ended' || session.status === 'closed') {
    return <SessionFeedbackForm sessionId={sessionId} sessionName={session.name} />;
  }

  const statusBadgeClass =
    session.status === 'live' || session.status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-2 sm:p-4">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center pt-6 sm:pt-8 pb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 px-2">{session.name}</h1>
          {session.description && (
            <p className="text-gray-600 mb-4 px-2 text-sm sm:text-base">{session.description}</p>
          )}
          <Badge className={statusBadgeClass}>
            <Users className="w-4 h-4 mr-1" />
            {session.status}
          </Badge>
        </div>

        <Card className="bg-blue-50 border-blue-200 mx-2 sm:mx-0">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
              <h2 className="text-lg sm:text-xl font-semibold text-blue-900">Welcome to the Panel Discussion</h2>
            </div>
            <p className="text-blue-800 text-sm sm:text-base">
              Submit your questions for the panelists below. All questions will be reviewed by the moderator.
            </p>
          </CardContent>
        </Card>

        <QuestionSubmissionForm sessionId={sessionId} />

        {/* Refresh Button */}
        <div className="px-2 sm:px-0">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="mb-4 bg-white hover:bg-gray-50 border-gray-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Page'}
          </Button>
          <p className="text-sm text-gray-600 mb-4">
            Refresh the page to pull the latest data
          </p>
        </div>

        {/* Approved & live-updating */}
        <div className="space-y-4 px-2 sm:px-0">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
            Questions — Vote for Your Favorites!
          </h3>
          {questions.length === 0 ? (
            <Card>
              <CardContent className="p-4 sm:p-6 text-center text-gray-500">
                <div className="text-sm sm:text-base">No questions yet. Check back soon!</div>
              </CardContent>
            </Card>
          ) : (
            questions.map((q) => (
              <VotingQuestionCard key={q.id} question={{
                id: q.id,
                session_id: q.session_id,
                text: q.text,
                status: q.status as 'submitted' | 'approved' | 'asked' | 'ignore',  // Cast to include asked
                submitter_name: q.submitter_name,
                vote_count: q.vote_count,
                created_at: q.created_at,
              }} sessionId={sessionId} />
            ))
          )}
        </div>

        <div className="h-8 sm:h-4" />
      </div>
    </div>
  );
};

export default AudienceView;
