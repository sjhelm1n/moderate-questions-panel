// SPDX-License-Identifier: Apache-2.0
import { useMemo } from "react";
import { MessageCircle, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionCard } from "@/components/QuestionCard";
import { RealTimeVotingQuestionCard } from "@/components/RealTimeVotingQuestionCard";
import type { Question } from "@/types/domain";

export function RealTimeQuestionList({
  questions,
  sessionId,
}: {
  questions: Question[];
  sessionId: string;
}) {
  const { approved, asked } = useMemo(() => {
    const approvedQuestions = questions
      .filter((question) => question.status === "approved")
      .sort((left, right) =>
        right.vote_count !== left.vote_count
          ? right.vote_count - left.vote_count
          : new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      );
    const askedQuestions = questions
      .filter((question) => question.status === "asked")
      .sort(
        (left, right) =>
          new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
      );
    return { approved: approvedQuestions, asked: askedQuestions };
  }, [questions]);

  if (approved.length === 0 && asked.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold">No approved questions yet</h3>
          <p className="text-gray-600">Submitted questions appear after moderator approval.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {approved.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Live voting ({approved.length})
              <span className="flex items-center gap-1 text-sm font-normal text-gray-500">
                <Users className="h-4 w-4" /> Vote for your favorites
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {approved.map((question, index) => (
              <RealTimeVotingQuestionCard
                key={question.id}
                question={question}
                sessionId={sessionId}
                rank={index + 1}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {asked.length > 0 ? (
        <Card>
          <CardHeader><CardTitle>Recently asked ({asked.length})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {asked.map((question) => <QuestionCard key={question.id} question={question} />)}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
