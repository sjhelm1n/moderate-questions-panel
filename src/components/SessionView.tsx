import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, ArrowLeft, MessageCircle, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionSubmissionForm } from './QuestionSubmissionForm';
import { RealTimeQuestionList } from './RealTimeQuestionList';
import { ModeratorDashboard } from './ModeratorDashboard';
import SignOutButton from './SignOutButton';
import { useAuth } from '@/hooks/useAuth';
import FeedbackDashboard from './FeedbackDashboard';
import { SessionFeedbackForm } from './SessionFeedbackForm';
import { useSessionData } from '@/hooks/useSessionData';

const SessionView: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, isModerator } = useAuth();
  const {
    session,
    questions,
    loading,
    error,
  } = useSessionData(sessionId || '', user?.id ?? 'anonymous');
  const [activeTab, setActiveTab] = useState<'questions' | 'feedback'>('questions');

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
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'questions' | 'feedback')}
            className="space-y-6"
          >
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
              <ModeratorDashboard session={session} questions={questions} viewerId={user.id} />
            </TabsContent>

            <TabsContent value="feedback">
              <FeedbackDashboard sessionId={session.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  if (session.status === 'ended') {
    return <SessionFeedbackForm sessionId={session.id} sessionName={session.name} />;
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
              <div className="flex items-center">
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
              </div>
            </CardContent>
          </Card>

          {/* Submission */}
          {session.status === 'active' ? (
            <div className="mb-8">
              <QuestionSubmissionForm sessionId={session.id} sessionStatus={session.status} />
            </div>
          ) : (
            <Card className="mb-8">
              <CardContent className="p-6 text-center">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Session Paused
                </h3>
                <p className="text-gray-600">
                  Question submission is temporarily paused.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Real-time Questions with Live Voting */}
          <RealTimeQuestionList sessionId={session.id} questions={questions} />
        </div>
      </div>
    </div>
  );
};

export default SessionView;
