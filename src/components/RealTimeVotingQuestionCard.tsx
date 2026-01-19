import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, User, Clock, TrendingUp } from 'lucide-react';
import { Question, useSupabase } from '@/hooks/useSupabase';
import { AnimatedVoteCount } from './AnimatedVoteCount';

interface RealTimeVotingQuestionCardProps {
  question: Question;
  sessionId: string;
  isVoteAnimating: boolean;
  rank?: number;
}

// Memoized voter ID generator
const useVoterId = (sessionId: string) => {
  return useMemo(() => {
    const existingVoterId = localStorage.getItem(`voter_${sessionId}`);
    if (existingVoterId) return existingVoterId;
    
    const newVoterId = `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(`voter_${sessionId}`, newVoterId);
    return newVoterId;
  }, [sessionId]);
};

// Memoized rank badge color function
const getRankBadgeColor = (rank: number) => {
  if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  if (rank <= 3) return 'bg-orange-100 text-orange-800 border-orange-300';
  if (rank <= 5) return 'bg-blue-100 text-blue-800 border-blue-300';
  return 'bg-gray-100 text-gray-800 border-gray-300';
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

const RealTimeVotingQuestionCard: React.FC<RealTimeVotingQuestionCardProps> = React.memo(({ 
  question, 
  sessionId, 
  isVoteAnimating,
  rank 
}) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showRankChange, setShowRankChange] = useState(false);
  const [count, setCount] = useState<number>(question.vote_count ?? 0);
  const { voteOnQuestion } = useSupabase();
  
  const voterId = useVoterId(sessionId);

  // Sync local count with server-provided value
  useEffect(() => { 
    setCount(question.vote_count ?? 0); 
  }, [question.vote_count]);

  // Check if user has already voted - memoized
  useEffect(() => {
    const voteKey = `voted_${sessionId}_${question.id}_${voterId}`;
    const hasUserVoted = localStorage.getItem(voteKey) === 'true';
    setHasVoted(hasUserVoted);
  }, [question.id, sessionId, voterId]);

  // Show rank change animation
  useEffect(() => {
    if (isVoteAnimating) {
      setShowRankChange(true);
      const timer = setTimeout(() => setShowRankChange(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isVoteAnimating]);

  const handleVote = useCallback(async () => {
    if (hasVoted || isVoting) return;
    
    setIsVoting(true);
    
    const res = await voteOnQuestion(question.id, sessionId, voterId);
    if (res?.ok) {
      setHasVoted(true);
      // use server count when available; otherwise optimistic +1
      setCount(res.count ?? (count + 1));
      const voteKey = `voted_${sessionId}_${question.id}_${voterId}`;
      localStorage.setItem(voteKey, 'true');
    } else {
      alert('Failed to save your vote. Please try again.');
    }
    setIsVoting(false);
  }, [hasVoted, isVoting, voteOnQuestion, question.id, sessionId, voterId, count]);

  // Memoized rank badge color
  const rankBadgeColor = useMemo(() => 
    rank ? getRankBadgeColor(rank) : '', 
    [rank]
  );

  // Memoized button classes
  const buttonClasses = useMemo(() => `
    transition-all duration-300
    ${hasVoted 
      ? "bg-blue-600 text-white hover:bg-blue-700" 
      : "hover:bg-blue-50 border-blue-300 text-blue-600 hover:border-blue-400"
    }
    ${isVoting ? 'animate-pulse' : ''}
  `, [hasVoted, isVoting]);

  // Memoized card classes
  const cardClasses = useMemo(() => `
    transition-all duration-500 hover:shadow-lg
    ${isVoteAnimating ? 'ring-2 ring-green-300 shadow-lg' : ''}
    ${showRankChange ? 'transform scale-105' : ''}
  `, [isVoteAnimating, showRankChange]);

  return (
    <Card className={cardClasses}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">
                Approved
              </Badge>
              {rank && (
                <Badge 
                  variant="outline" 
                  className={`
                    ${rankBadgeColor}
                    ${showRankChange ? 'animate-bounce' : ''}
                  `}
                >
                  <TrendingUp className="w-3 h-3 mr-1" />
                  #{rank}
                </Badge>
              )}
            </div>
            <QuestionMetadata 
              createdAt={question.created_at}
              submitterName={question.submitter_name}
            />
          </div>
          
          <div className="w-full">
            <p className="text-gray-900 text-lg leading-relaxed font-medium bg-gray-50 p-4 rounded-lg border-l-4 border-green-500">
              {question.text || question.content || 'No question text available'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleVote}
                disabled={hasVoted || isVoting}
                variant={hasVoted ? "default" : "outline"}
                size="sm"
                className={buttonClasses}
              >
                <ArrowUp className="w-4 h-4 mr-1" />
                {isVoting ? 'Voting...' : hasVoted ? 'Voted' : 'Upvote'}
              </Button>
              
               <AnimatedVoteCount 
                count={count} 
                isAnimating={isVoteAnimating}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export { RealTimeVotingQuestionCard };
export default RealTimeVotingQuestionCard;