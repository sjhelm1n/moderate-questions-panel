import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, TrendingUp, MessageSquare } from 'lucide-react';
import type { SessionFeedback } from '@/types/domain';

interface FeedbackAnalyticsProps {
  feedback: SessionFeedback[];
}

const FeedbackAnalytics: React.FC<FeedbackAnalyticsProps> = ({ feedback }) => {
  const totalFeedback = feedback.length;
  const averageRating = totalFeedback > 0 
    ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback 
    : 0;
  
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: feedback.filter(f => f.rating === rating).length,
    percentage: totalFeedback > 0 ? (feedback.filter(f => f.rating === rating).length / totalFeedback) * 100 : 0
  }));

  const commentsCount = feedback.filter(f => f.comment && f.comment.trim()).length;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 text-center">
          <MessageSquare className="w-6 h-6 mx-auto mb-2 text-blue-600" />
          <div className="text-2xl font-bold">{totalFeedback}</div>
          <div className="text-sm text-gray-600">Total Feedback</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            {renderStars(Math.round(averageRating))}
          </div>
          <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
          <div className="text-sm text-gray-600">Average Rating</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
          <div className="text-2xl font-bold">
            {ratingDistribution.filter(r => r.rating >= 4).reduce((sum, r) => sum + r.count, 0)}
          </div>
          <div className="text-sm text-gray-600">4-5 Star Reviews</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-center">
          <MessageSquare className="w-6 h-6 mx-auto mb-2 text-purple-600" />
          <div className="text-2xl font-bold">{commentsCount}</div>
          <div className="text-sm text-gray-600">With Comments</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackAnalytics;
