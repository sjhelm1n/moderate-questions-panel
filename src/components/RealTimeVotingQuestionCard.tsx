// SPDX-License-Identifier: Apache-2.0
import { useMemo, useState } from "react";
import { ArrowUp, Clock, TrendingUp, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { getOrCreateVoterId, hasStoredVote, storeVote } from "@/lib/voterStorage";
import { castVote } from "@/services/supabase/questionService";
import type { Question } from "@/types/domain";

function rankClasses(rank: number): string {
  if (rank === 1) return "border-yellow-300 bg-yellow-100 text-yellow-800";
  if (rank <= 3) return "border-orange-300 bg-orange-100 text-orange-800";
  return "border-blue-300 bg-blue-100 text-blue-800";
}

export function RealTimeVotingQuestionCard({
  question,
  sessionId,
  rank,
}: {
  question: Question;
  sessionId: string;
  rank: number;
}) {
  const voterId = useMemo(() => getOrCreateVoterId(sessionId), [sessionId]);
  const [hasVoted, setHasVoted] = useState(() =>
    hasStoredVote(sessionId, question.id, voterId),
  );
  const [isVoting, setIsVoting] = useState(false);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);
  const count = optimisticCount ?? question.vote_count;

  const vote = async () => {
    if (hasVoted || isVoting) return;
    setIsVoting(true);
    try {
      const serverCount = await castVote({
        questionId: question.id,
        sessionId,
        voterId,
      });
      storeVote(sessionId, question.id, voterId);
      setHasVoted(true);
      setOptimisticCount(serverCount);
    } catch (voteError) {
      toast({
        variant: "destructive",
        title: "Vote not saved",
        description: getErrorMessage(voteError, "Please try again."),
      });
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800">Approved</Badge>
            <Badge variant="outline" className={rankClasses(rank)}>
              <TrendingUp className="mr-1 h-3 w-3" />#{rank}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(question.created_at).toLocaleString()}</span>
            {question.submitter_name ? <span className="flex items-center gap-1"><User className="h-3 w-3" />{question.submitter_name}</span> : null}
          </div>
        </div>

        <p className="rounded-lg border-l-4 border-green-500 bg-gray-50 p-4 text-lg font-medium leading-relaxed text-gray-900">
          {question.text}
        </p>

        <div className="flex items-center gap-3">
          <Button onClick={vote} disabled={hasVoted || isVoting} variant={hasVoted ? "default" : "outline"} size="sm">
            <ArrowUp className="mr-1 h-4 w-4" />
            {isVoting ? "Voting…" : hasVoted ? "Voted" : "Upvote"}
          </Button>
          <span className="text-sm font-medium text-gray-600">{count} {count === 1 ? "vote" : "votes"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
