import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, TrendingUp, Users } from 'lucide-react';
import { useRealtimeSession } from '@/hooks/useRealtimeSession';
import { RealTimeVotingQuestionCard } from './RealTimeVotingQuestionCard';
import { QuestionCard } from './QuestionCard';

interface RealTimeQuestionListProps {
  sessionId: string;
}

const EmptyState = React.memo(() => (
  <Card>
    <CardContent className="p-8 text-center">
      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Yet</h3>
      <p className="text-gray-600">
        Be the first to submit a question for this session!
      </p>
    </CardContent>
  </Card>
));

const LiveVotingSection = React.memo<{
  questions: any[];
  sessionId: string;
}>(({ questions, sessionId }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-600" />
        Live Voting ({questions.length})
        <div className="flex items-center gap-1 text-sm font-normal text-gray-500">
          <Users className="w-4 h-4" />
          <span>Vote for your favorites</span>
        </div>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {questions.map((question, index) => (
          <RealTimeVotingQuestionCard
            key={question.id}
            question={question}
            sessionId={sessionId}
            isVoteAnimating={false}
            rank={index + 1}
          />
        ))}
      </div>
    </CardContent>
  </Card>
));

const AskedQuestionsSection = React.memo<{
  questions: any[];
}>(({ questions }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-blue-600" />
        Recently Asked ({questions.length})
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            showActions={false}
          />
        ))}
      </div>
    </CardContent>
  </Card>
));

export const RealTimeQuestionList: React.FC<RealTimeQuestionListProps> = React.memo(({ sessionId }) => {
  const { questions } = useRealtimeSession(sessionId, { approvedOnly: true });

  // Memoize filtered questions to avoid recalculation on every render
  const { visibleQuestions, askedQuestions } = useMemo(() => {
    const visible = questions.filter(q => q.status === 'approved' || q.status === 'asked');
    const asked = questions.filter(q => q.status === 'asked');
    
    return {
      visibleQuestions: visible,
      askedQuestions: asked
    };
  }, [questions]);

  if (visibleQuestions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Live Voting Section */}
      {questions.length > 0 && (
        <LiveVotingSection
          questions={questions}
          sessionId={sessionId}
        />
      )}


      {/* Asked Questions Section */}
      {askedQuestions.length > 0 && (
        <AskedQuestionsSection questions={askedQuestions} />
      )}
    </div>
  );
});