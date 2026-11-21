import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  Clock,
  Users,
  Download,
  ThumbsUp,
} from 'lucide-react';
import { useUpdateQuestionStatus } from '@/hooks/useQuestionMutations';
import { useSessions } from '@/hooks/useSessions';
import { serializeCsvRow } from '@/lib/csv';
import type { Question, Session } from '@/types/domain';
import QuestionCard from './QuestionCard';
import QRCodeDisplay from './QRCodeDisplay';

interface ModeratorDashboardProps {
  session: Session;
  questions: Question[];
  viewerId: string;
}

export const ModeratorDashboard: React.FC<ModeratorDashboardProps> = ({
  session,
  questions,
  viewerId,
}) => {
  const navigate = useNavigate();
  const updateQuestion = useUpdateQuestionStatus(session.id, viewerId);
  const { endSession, ending } = useSessions(viewerId, false);

  const [filter, setFilter] = useState<'all' | 'submitted' | 'approved' | 'asked' | 'ignore'>('all');

  const handleStatusUpdate = async (questionId: string, status: Question['status']) => {
    try {
      await updateQuestion.mutateAsync({ questionId, status });
    } catch (error) {
      console.error('Failed to update question status', error);
      window.alert('Failed to update the question. Please try again.');
    }
  };

  // Sort: approved questions by vote count (descending), others by recency
  const sortedQuestions = [...questions].sort((a, b) => {
    // If both are approved, sort by vote count (highest first)
    if (a.status === 'approved' && b.status === 'approved') {
      return (b.vote_count ?? 0) - (a.vote_count ?? 0);
    }
    
    // Asked questions sink to bottom
    if (a.status === 'asked' && b.status !== 'asked') return 1;
    if (a.status !== 'asked' && b.status === 'asked') return -1;
    
    // For non-approved questions, sort by recency
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const filteredQuestions = sortedQuestions.filter(q => filter === 'all' || q.status === filter);

  const counts = {
    total: questions.length,
    submitted: questions.filter(q => q.status === 'submitted').length,
    approved: questions.filter(q => q.status === 'approved').length,
    asked: questions.filter(q => q.status === 'asked').length,
    ignore: questions.filter(q => q.status === 'ignore').length,
    approvedVotes: questions
      .filter(q => q.status === 'approved')
      .reduce((sum, q) => sum + (q.vote_count ?? 0), 0) // <-- cumulative upvotes for approved
  };

  const handleCloseSession = async () => {
    if (!confirm('Are you sure you want to close this session? This action cannot be undone.')) return;
    try {
      await endSession(session.id);
      navigate('/');
    } catch (error) {
      console.error('Failed to end session', error);
      window.alert('Failed to end the session. Please try again.');
    }
  };

  const downloadQuestionsCSV = () => {
    if (questions.length === 0) {
      alert('No questions to download.');
      return;
    }
    const csvHeader = serializeCsvRow(['Question', 'Author', 'Status', 'Votes', 'Created At']);
    const csvContent = questions
      .map(q => {
        return serializeCsvRow([
          q.text,
          q.submitter_name || 'Anonymous',
          q.status,
          q.vote_count ?? 0,
          new Date(q.created_at).toLocaleString(),
        ]);
      })
      .join('\n');

    const blob = new Blob([`${csvHeader}\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `session-questions-${session.name.replace(/[^a-z0-9]/gi, '-')}-${new Date()
        .toISOString()
        .split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const audienceUrl = `${window.location.origin}/session/${session.id}?view=audience`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Moderator Dashboard</h2>
          <p className="text-gray-600">Session: {session.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={session.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            {session.status}
          </Badge>
          {session.status === 'active' && (
            <Button variant="destructive" size="sm" onClick={handleCloseSession} disabled={ending}>
              {ending ? 'Ending…' : 'End Session'}
            </Button>
          )}
        </div>
      </div>
      {/* Stats and QR Code Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{counts.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                <div className="text-2xl font-bold">{counts.submitted}</div>
                <div className="text-sm text-gray-600">Submitted</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{counts.approved}</div>
                <div className="text-sm text-gray-600">Approved</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{counts.asked}</div>
                <div className="text-sm text-gray-600">Asked</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <XCircle className="w-6 h-6 mx-auto mb-2 text-red-600" />
                <div className="text-2xl font-bold">{counts.ignore}</div>
                <div className="text-sm text-gray-600">Ignored</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <ThumbsUp className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                <div className="text-2xl font-bold">{counts.approvedVotes}</div>
                <div className="text-sm text-gray-600">Approved Votes</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col justify-center">
          <QRCodeDisplay
            value={audienceUrl}
            title="Session Access"
            description="Scan QR code or copy URL to join"
            size={200}
          />
        </div>
      </div>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Questions</CardTitle>
            {questions.length > 0 && (
              <Button variant="outline" size="sm" onClick={downloadQuestionsCSV}>
                <Download className="w-4 h-4 mr-2" />
                Download All Questions CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as 'all' | 'submitted' | 'approved' | 'asked' | 'ignore')}
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All ({counts.total})</TabsTrigger>
              <TabsTrigger value="submitted">Submitted ({counts.submitted})</TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({counts.approved}){/* – {counts.approvedVotes} votes */}
              </TabsTrigger>
              <TabsTrigger value="asked">Asked ({counts.asked})</TabsTrigger>
              <TabsTrigger value="ignore">Ignored ({counts.ignore})</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-4">
              <div className="space-y-4">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No questions found for this filter.</div>
                ) : (
                  filteredQuestions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      onStatusUpdate={handleStatusUpdate}
                      showActions={true}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


    </div>
  );
};
