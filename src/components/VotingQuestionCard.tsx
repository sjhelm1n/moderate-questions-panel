import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, User, Clock } from 'lucide-react';
import { Question, useSupabase } from '@/hooks/useSupabase';

interface VotingQuestionCardProps {
  question: Question;
  sessionId: string;
}

const VotingQuestionCard: React.FC<VotingQuestionCardProps> = ({ question, sessionId }) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [currentVoteCount, setCurrentVoteCount] = useState(question.vote_count);
  const { voteOnQuestion, fetchQuestions, subscribeToVotes, unsubscribeFromVotes } = useSupabase();

  // Generate or get voter ID
  const getVoterId = () => {
    const existingVoterId = localStorage.getItem(`voter_${sessionId}`);
    if (existingVoterId) return existingVoterId;
    
    const newVoterId = `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(`voter_${sessionId}`, newVoterId);
    return newVoterId;
  };

  // Check if user has already voted on this question
  useEffect(() => {
    const checkVoteStatus = () => {
      const voterId = getVoterId();
      const voteKey = `voted_${sessionId}_${question.id}_${voterId}`;
      const hasUserVoted = localStorage.getItem(voteKey) === 'true';
      setHasVoted(hasUserVoted);
    };

    checkVoteStatus();
  }, [question.id, sessionId]);

  // Update vote count when question prop changes
  useEffect(() => {
    setCurrentVoteCount(question.vote_count);
  }, [question.vote_count]);

  // Set up real-time subscription for votes
  useEffect(() => {
    console.log('Setting up real-time subscription for session:', sessionId);
    const channel = subscribeToVotes(sessionId);
    
    return () => {
      console.log('Cleaning up real-time subscription');
      unsubscribeFromVotes();
    };
  }, [sessionId, subscribeToVotes, unsubscribeFromVotes]);

  const handleVote = async () => {
    if (hasVoted || isVoting) return;
    
    console.log('Vote button clicked for question:', question.id);
    setIsVoting(true);
    const voterId = getVoterId();
    
    try {
      const success = await voteOnQuestion(question.id, sessionId, voterId);
      
      if (success) {
        console.log('Vote successful, updating UI');
        setHasVoted(true);
        setCurrentVoteCount(prev => prev + 1);
        
        // Store vote in localStorage to prevent duplicate votes
        const voteKey = `voted_${sessionId}_${question.id}_${voterId}`;
        localStorage.setItem(voteKey, 'true');
        
        // Refresh questions to get updated vote count from server
        setTimeout(() => {
          console.log('Refreshing questions after vote...');
          fetchQuestions(sessionId);
        }, 500);
      } else {
        console.log('Vote failed');
        // Show user feedback that vote failed
        alert('Failed to save your vote. Please try again.');
      }
    } catch (error) {
      console.error('Error during voting:', error);
      alert('Failed to save your vote. Please try again.');
    }
    
    setIsVoting(false);
  };

  return (
    <Card className="transition-shadow hover:shadow-md mx-2 sm:mx-0">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <Badge className={question.status === 'asked' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
              {question.status === 'asked' ? 'Asked' : 'Approved'}
            </Badge>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(question.created_at).toLocaleString()}</span>
              </div>
              {question.submitter_name && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{question.submitter_name}</span>
                </div>
              )}
            </div>
          </div>
          <div className="w-full">
            {console.log('Question object in VotingQuestionCard:', question)}
            <p className={`text-gray-900 text-base sm:text-lg leading-relaxed font-medium bg-gray-50 p-3 sm:p-4 rounded-lg border-l-4 ${question.status === 'asked' ? 'border-blue-500' : 'border-green-500'}`}>
              {question.text || question.content || 'No question text available'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleVote}
                disabled={hasVoted || isVoting}
                variant={hasVoted ? "default" : "outline"}
                size="sm"
                className={`h-9 sm:h-8 px-3 sm:px-4 text-sm ${hasVoted ? "bg-blue-600 text-white" : "hover:bg-blue-50 border-blue-300 text-blue-600"}`}
              >
                <ArrowUp className="w-4 h-4 mr-1" />
                {isVoting ? 'Voting...' : hasVoted ? 'Voted' : 'Upvote'}
              </Button>
              <span className="text-sm font-medium text-gray-600">
                {currentVoteCount} {currentVoteCount === 1 ? 'vote' : 'votes'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

export { VotingQuestionCard };
export default VotingQuestionCard;