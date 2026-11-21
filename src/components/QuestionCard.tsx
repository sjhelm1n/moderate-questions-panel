import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, MessageSquare, Clock, User, ArrowUp } from 'lucide-react';
import type { Question } from '@/types/domain';

interface QuestionCardProps {
  question: Question;
  onStatusUpdate?: (questionId: string, status: Question['status']) => void;
  showActions?: boolean;
}

const getStatusColor = (status: Question['status']) => {
  switch (status) {
    case 'submitted': return 'bg-yellow-100 text-yellow-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'asked': return 'bg-blue-100 text-blue-800';
    case 'ignore': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: Question['status']): ReactNode => {
  switch (status) {
    case 'submitted': return <Clock className="w-4 h-4" />;
    case 'approved': return <CheckCircle className="w-4 h-4" />;
    case 'asked': return <MessageSquare className="w-4 h-4" />;
    case 'ignore': return <XCircle className="w-4 h-4" />;
    default: return <MessageSquare className="w-4 h-4" />;
  }
};

const QuestionMetadata = ({
  createdAt,
  submitterName,
}: {
  createdAt: string;
  submitterName: string | null;
}) => (
  <div className="flex items-center gap-4 text-sm text-gray-500">
    <span>{new Date(createdAt).toLocaleString()}</span>
    {submitterName && (
      <div className="flex items-center gap-1">
        <User className="w-3 h-3" />
        <span>{submitterName}</span>
      </div>
    )}
  </div>
);

const VoteCount = ({ voteCount }: {
  voteCount: number;
}) => (
  voteCount > 0 ? (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <ArrowUp className="w-4 h-4" />
      <span>{voteCount} {voteCount === 1 ? 'vote' : 'votes'}</span>
    </div>
  ) : null
);

const ActionButtons = ({
  question,
  onStatusUpdate,
}: {
  question: Question;
  onStatusUpdate: (questionId: string, status: Question['status']) => void;
}) => {
  return (
    <div className="flex gap-2 flex-wrap mt-4">
      {question.status === 'submitted' && (
        <>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onStatusUpdate(question.id, 'approved')}
            className="text-green-600"
          >
            <CheckCircle className="w-4 h-4 mr-1" />Approve
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onStatusUpdate(question.id, 'ignore')}
            className="text-red-600"
          >
            <XCircle className="w-4 h-4 mr-1" />Ignore
          </Button>
        </>
      )}
      {question.status === 'approved' && (
        <Button 
          size="sm" 
          onClick={() => onStatusUpdate(question.id, 'asked')}
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
            onClick={() => onStatusUpdate(question.id, 'approved')}
            className="text-green-600"
          >
            <CheckCircle className="w-4 h-4 mr-1" />Back to Approved
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onStatusUpdate(question.id, 'ignore')}
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
          onClick={() => onStatusUpdate(question.id, 'submitted')}
          className="text-yellow-600"
        >
          <Clock className="w-4 h-4 mr-1" />Back to Submitted
        </Button>
      )}
    </div>
  );
};

const QuestionCard = ({
  question, 
  onStatusUpdate, 
  showActions = false 
}: QuestionCardProps) => {
  const statusBadge = (
    <Badge className={`${getStatusColor(question.status)} flex items-center gap-1`}>
      {getStatusIcon(question.status)}
      <span className="capitalize">{question.status}</span>
    </Badge>
  );

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
};

export { QuestionCard };
export default QuestionCard;
