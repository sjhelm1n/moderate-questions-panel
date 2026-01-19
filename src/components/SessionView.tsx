import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, ArrowLeft, MessageCircle, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Question, useSupabase } from '@/hooks/useSupabase';
import { QuestionSubmissionForm } from './QuestionSubmissionForm';
import { RealTimeQuestionList } from './RealTimeQuestionList';
import { LiveConnectionStatus } from './LiveConnectionStatus';
import { ModeratorDashboard } from './ModeratorDashboard';
import SignOutButton from './SignOutButton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Session } from '@/hooks/useSupabase';
import FeedbackDashboard from './FeedbackDashboard';
import { SessionFeedbackForm } from './SessionFeedbackForm';
import { useRealtimeSession } from '@/hooks/useRealtimeSession';

export const SessionView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, isModerator } = useAuth(); // Move useAuth to top
  const { questions, fetchQuestions } = useSupabase();
  const { session: realtimeSession } = useRealtimeSession(sessionId || '', { 
    approvedOnly: false,
    fetchMyVotes: false
  });
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'questions' | 'feedback'>('questions');

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setError('Session ID not provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (fetchError) {
          setError('Session not found');
        } else {
          setSession(data);
          await fetchQuestions(data.id);
        }
      } catch (err) {
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, fetchQuestions]);

  // Set up real-time subscription for session status changes
  useEffect(() => {
    if (sessionId) {
      console.log('SessionView: Setting up real-time subscription for session status');
      
      const sessionChannel = supabase
        .channel(`session_status_${sessionId}`)
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'sessions',
            filter: `id=eq.${sessionId}`
          }, 
          (payload) => {
            console.log('Session status updated in SessionView:', payload);
            // Update the session state with new status
            setSession(prev => prev ? { ...prev, status: payload.new.status } : null);
          }
        )
        .subscribe();

      return () => {
        console.log('SessionView: Cleaning up session status subscription');
        supabase.removeChannel(sessionChannel);
      };
    }
  }, [sessionId]);

  // Poll questions with reduced frequency since we have real-time updates
  useEffect(() => {
    if (!session?.id) return;
    const interval = setInterval(() => fetchQuestions(session.id), 5000); // Reduced from 3 seconds
    return () => clearInterval(interval);
  }, [session?.id, fetchQuestions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Not Found</h2>
            <p className="text-gray-600">
              {error || 'The session you are looking for does not exist or has been removed.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'ended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Is this user the moderator for this session?
  const isSessionModerator = user && isModerator && session.moderator_id === user.id;

  // Moderator console
  if (isSessionModerator) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sessions
                </Button>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                  <span className="text-lg font-bold text-gray-900">Q&A Panel</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <Badge className="bg-blue-100 text-blue-800">Moderator</Badge>
                <SignOutButton />
              </div>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="questions" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Session Questions
              </TabsTrigger>
              <TabsTrigger value="feedback" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Feedback Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questions">
              <ModeratorDashboard session={session} />
            </TabsContent>

            <TabsContent value="feedback">
              <FeedbackDashboard sessionId={session.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Audience view (participants)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Session Header */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{session.name}</CardTitle>
                  {session.description && <p className="text-gray-600">{session.description}</p>}
                </div>
                <Badge className={getStatusColor(session.status)}>
                  {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Panel Discussion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Started {new Date(session.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>{questions.length} questions submitted</span>
                  </div>
                </div>
                <LiveConnectionStatus sessionId={session.id} />
              </div>
            </CardContent>
          </Card>

          {/* Submission + Feedback */}
          {session.status === 'active' ? (
            <div className="mb-8">
              <QuestionSubmissionForm sessionId={session.id} sessionStatus={session.status} />
            </div>
          ) : (
            <>
              <Card className="mb-8">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Session {session.status === 'paused' ? 'Paused' : 'Ended'}
                  </h3>
                  <p className="text-gray-600">
                    {session.status === 'paused'
                      ? 'Question submission is temporarily paused. You can still leave feedback below.'
                      : 'This session has ended. We’d still love your feedback below.'}
                  </p>
                </CardContent>
              </Card>

              {/* Feedback prompt for participants */}
              <div className="mb-8">
                <SessionFeedbackForm sessionId={session.id} sessionName={session.name} />
              </div>
            </>
          )}

          {/* Real-time Questions with Live Voting */}
          <RealTimeQuestionList sessionId={session.id} />
        </div>
      </div>
    </div>
  );
};

export default SessionView;
