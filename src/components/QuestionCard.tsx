import React, { useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, MessageSquare, Clock, User, ArrowUp } from 'lucide-react';
import { Question } from '@/hooks/useSupabase';

interface QuestionCardProps {
  question: Question;
  onStatusUpdate?: (questionId: string, status: Question['status']) => void;
  showActions?: boolean;
}

// Memoized status color function
const getStatusColor = (status: Question['status']) => {
  switch (status) {
    case 'submitted': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'asked': return 'bg-blue-100 text-blue-800';
    case 'ignore': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Memoized status icon function
const getStatusIcon = (status: Question['status']) => {
  switch (status) {
    case 'submitted': return <Clock className="w-4 h-4" />;
    case 'approved': return <CheckCircle className="w-4 h-4" />;
    case 'asked': return <MessageSquare className="w-4 h-4" />;
    case 'ignore': return <XCircle className="w-4 h-4" />;
    default: return <MessageSquare className="w-4 h-4" />;
  }
};

// Memoized question metadata component
const QuestionMetadata = React.memo<{
  createdAt: string;
  submitterName?: string;
}>(({ createdAt, submitterName }) => (
  <div className="flex items-center gap-4 text-sm text-gray-500">
    <span>{new Date(createdAt).toLocaleString()}</span>
    {submitterName && (
      <div className="flex items-center gap-1">
        <User className="w-3 h-3" />
        <span>{submitterName}</span>
      </div>
    )}
  </div>
));

// Memoized vote count component
const VoteCount = React.memo<{
  voteCount: number;
}>(({ voteCount }) => (
  voteCount > 0 ? (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <ArrowUp className="w-4 h-4" />
      <span>{voteCount} {voteCount === 1 ? 'vote' : 'votes'}</span>
    </div>
  ) : null
));

// Memoized action buttons component
const ActionButtons = React.memo<{
  question: Question;
  onStatusUpdate: (questionId: string, status: Question['status']) => void;
}>(({ question, onStatusUpdate }) => {
  const handleApprove = useCallback(() => {
    console.log('QuestionCard: Status button clicked - approve', question.id);
    onStatusUpdate(question.id, 'approved');
  }, [question.id, onStatusUpdate]);

  const handleIgnore = useCallback(() => {
    console.log('QuestionCard: Status button clicked - ignore', question.id);
    onStatusUpdate(question.id, 'ignore');
  }, [question.id, onStatusUpdate]);

  const handleMarkAsked = useCallback(() => {
    console.log('QuestionCard: Status button clicked - mark as asked', question.id);
    onStatusUpdate(question.id, 'asked');
  }, [question.id, onStatusUpdate]);

  const handleBackToApproved = useCallback(() => {
    console.log('QuestionCard: Status button clicked - back to approved', question.id);
    onStatusUpdate(question.id, 'approved');
  }, [question.id, onStatusUpdate]);

  const handleBackToSubmitted = useCallback(() => {
    console.log('QuestionCard: Status button clicked - back to submitted', question.id);
    onStatusUpdate(question.id, 'submitted');
  }, [question.id, onStatusUpdate]);

  return (
    <div className="flex gap-2 flex-wrap mt-4">
      {question.status === 'submitted' && (
        <>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleApprove}
            className="text-green-600"
          >
            <CheckCircle className="w-4 h-4 mr-1" />Approve
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleIgnore}
            className="text-red-600"
          >
            <XCircle className="w-4 h-4 mr-1" />Ignore
          </Button>
        </>
      )}
      {question.status === 'approved' && (
        <Button 
          size="sm" 
          onClick={handleMarkAsked}
          className="bg-blue-600"
        >
          <MessageSquare className="w-4 h-4 mr-1" />Mark as Asked
        </Button>
      )}
      {question.status === 'asked' && (
        <>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleBackToApproved}
            className="text-green-600"
          >
            <CheckCircle className="w-4 h-4 mr-1" />Back to Approved
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleIgnore}
            className="text-red-600"
          >
            <XCircle className="w-4 h-4 mr-1" />Ignore
          </Button>
        </>
      )}
      {question.status === 'ignore' && (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleBackToSubmitted}
          className="text-yellow-600"
        >
          <Clock className="w-4 h-4 mr-1" />Back to Submitted
        </Button>
      )}
    </div>
  );
});

const QuestionCard: React.FC<QuestionCardProps> = React.memo(({ 
  question, 
  onStatusUpdate, 
  showActions = false 
}) => {
  // Memoized status badge
  const statusBadge = useMemo(() => (
    <Badge className={`${getStatusColor(question.status)} flex items-center gap-1`}>
      {getStatusIcon(question.status)}
      <span className="capitalize">{question.status}</span>
    </Badge>
  ), [question.status]);

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header with status and timestamp */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              {statusBadge}
            </div>
            <QuestionMetadata 
              createdAt={question.created_at}
              submitterName={question.submitter_name}
            />
          </div>

          {/* Question text - full width with better spacing */}
          <div className="w-full">
            <p className="text-gray-900 text-lg leading-relaxed font-medium bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
              {question.text}
            </p>
          </div>

          {/* Vote count display for moderators */}
          <VoteCount voteCount={question.vote_count} />
        </div>
        
        {showActions && onStatusUpdate && (
          <ActionButtons 
            question={question}
            onStatusUpdate={onStatusUpdate}
          />
        )}
      </CardContent>
    </Card>
  );
});

export { QuestionCard };
export default QuestionCard;