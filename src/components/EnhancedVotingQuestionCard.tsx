import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, User, Clock, TrendingUp, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Question } from '@/hooks/useSupabase';
import { AnimatedVoteCount } from './AnimatedVoteCount';

interface EnhancedVotingQuestionCardProps {
  question: Question;
  sessionId: string;
  isVoteAnimating: boolean;
  rank?: number;
  onVote: (questionId: string) => Promise<boolean>;
  hasUserVoted: (questionId: string) => boolean;
  voteState?: {
    optimisticCount: number;
    serverCount: number;
    isVoting: boolean;
    hasVoted: boolean;
    error?: string;
  };
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  queueLength: number;
}

// Memoized connection status indicator
const ConnectionIndicator = React.memo<{
  status: 'connecting' | 'connected' | 'disconnected';
  queueLength: number;
}>(({ status, queueLength }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-500',
          tooltip: 'Connected - votes sync in real-time'
        };
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-yellow-500 animate-spin',
          tooltip: 'Connecting...'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-500',
          tooltip: 'Disconnected - votes queued for sync'
        };
    }
  };

  const { icon: Icon, color, tooltip } = getStatusConfig();

  return (
    <div className="flex items-center gap-1" title={tooltip}>
      <Icon className={`w-3 h-3 ${color}`} />
      {queueLength > 0 && (
        <span className="text-xs text-orange-600 font-medium">
          ({queueLength})
        </span>
      )}
    </div>
  );
});

// Memoized rank badge
const RankBadge = React.memo<{ rank: number; isAnimating: boolean }>(({ rank, isAnimating }) => {
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank <= 3) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (rank <= 5) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <Badge 
      variant="outline" 
      className={`
        ${getRankColor(rank)}
        ${isAnimating ? 'animate-pulse' : ''}
        transition-all duration-300
      `}
    >
      <TrendingUp className="w-3 h-3 mr-1" />
      #{rank}
    </Badge>
  );
});

// Memoized question metadata
const QuestionMetadata = React.memo<{
  createdAt: string;
  submitterName?: string;
}>(({ createdAt, submitterName }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-500">
    <div className="flex items-center gap-1">
      <Clock className="w-3 h-3" />
      <span>{new Date(createdAt).toLocaleString()}</span>
    </div>
    {submitterName && (
      <div className="flex items-center gap-1">
        <User className="w-3 h-3" />
        <span>{submitterName}</span>
      </div>
    )}
  </div>
));

const EnhancedVotingQuestionCard: React.FC<EnhancedVotingQuestionCardProps> = React.memo(({
  question,
  sessionId,
  isVoteAnimating,
  rank,
  onVote,
  hasUserVoted,
  voteState,
  connectionStatus,
  queueLength
}) => {
  const hasVoted = voteState?.hasVoted ?? hasUserVoted(question.id);
  const isVoting = voteState?.isVoting ?? false;
  const voteCount = voteState?.optimisticCount ?? question.vote_count;
  const hasError = !!voteState?.error;

  // Memoized button configuration
  const buttonConfig = useMemo(() => {
    if (hasError) {
      return {
        text: 'Retry',
        variant: 'destructive' as const,
        disabled: false,
        className: 'bg-red-600 hover:bg-red-700 text-white'
      };
    }
    
    if (isVoting) {
      return {
        text: 'Voting...',
        variant: 'outline' as const,
        disabled: true,
        className: 'animate-pulse border-blue-300 text-blue-600'
      };
    }
    
    if (hasVoted) {
      return {
        text: 'Voted',
        variant: 'default' as const,
        disabled: true,
        className: 'bg-blue-600 text-white'
      };
    }
    
    return {
      text: 'Upvote',
      variant: 'outline' as const,
      disabled: false,
      className: 'hover:bg-blue-50 border-blue-300 text-blue-600 hover:border-blue-400'
    };
  }, [hasError, isVoting, hasVoted]);

  // Memoized card classes
  const cardClasses = useMemo(() => `
    transition-all duration-500 hover:shadow-lg
    ${isVoteAnimating ? 'ring-2 ring-green-300 shadow-lg transform scale-[1.02]' : ''}
    ${hasError ? 'ring-2 ring-red-300' : ''}
  `, [isVoteAnimating, hasError]);

  const handleVote = async () => {
    if (hasVoted && !hasError) return;
    await onVote(question.id);
  };

  return (
    <Card className={cardClasses}>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-green-100 text-green-800">
                Approved
              </Badge>
              {rank && (
                <RankBadge rank={rank} isAnimating={isVoteAnimating} />
              )}
              <ConnectionIndicator 
                status={connectionStatus} 
                queueLength={queueLength} 
              />
            </div>
            <QuestionMetadata 
              createdAt={question.created_at}
              submitterName={question.submitter_name}
            />
          </div>
          
          <div className="w-full">
            <p className="text-gray-900 text-base sm:text-lg leading-relaxed font-medium bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 border-green-500">
              {question.text || question.content || 'No question text available'}
            </p>
          </div>

          {hasError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{voteState?.error}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                onClick={handleVote}
                disabled={buttonConfig.disabled}
                variant={buttonConfig.variant}
                size="sm"
                className={`h-9 sm:h-8 px-3 sm:px-4 text-sm transition-all duration-300 ${buttonConfig.className}`}
              >
                <ArrowUp className="w-4 h-4 mr-1" />
                {buttonConfig.text}
              </Button>
              
              <AnimatedVoteCount 
                count={voteCount} 
                isAnimating={isVoteAnimating}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export { EnhancedVotingQuestionCard };
export default EnhancedVotingQuestionCard;