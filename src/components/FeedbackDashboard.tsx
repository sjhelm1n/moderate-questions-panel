import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Calendar, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFeedback } from '@/hooks/useFeedback';
import { useSessions } from '@/hooks/useSessions';
import { serializeCsvRow } from '@/lib/csv';
import type { SessionFeedback } from '@/types/domain';
import FeedbackAnalytics from './FeedbackAnalytics';
import FeedbackFilters from './FeedbackFilters';

interface FeedbackDashboardProps {
  sessionId?: string; // Optional: if provided, show feedback only for this session
}

const FeedbackDashboard: React.FC<FeedbackDashboardProps> = ({ sessionId }) => {
  const { user } = useAuth();
  const feedbackQuery = useFeedback(user?.id, sessionId);
  const sessionsQuery = useSessions(user?.id, true);
  const feedback: SessionFeedback[] = feedbackQuery.data ?? [];
  const sessions = sessionId ? [] : sessionsQuery.sessions;
  
  // Filter states
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');

  // Apply filters (when sessionId is provided, session filter is not needed)
  const filteredFeedback = feedback.filter(f => {
    const feedbackDate = new Date(f.created_at).toISOString().split('T')[0];
    const inDateRange = feedbackDate >= dateRange.start && feedbackDate <= dateRange.end;
    
    const matchesRating = ratingFilter === 'all' || 
      (ratingFilter === '4-5' && f.rating >= 4) ||
      (ratingFilter === '1-3' && f.rating <= 3) ||
      (ratingFilter !== '4-5' && ratingFilter !== '1-3' && f.rating === parseInt(ratingFilter));
    
    // Only apply session filter if not filtering by specific session
    const matchesSession = sessionId || sessionFilter === 'all' || f.session_id === sessionFilter;
    
    return inDateRange && matchesRating && matchesSession;
  });

  const exportFeedback = () => {
    if (filteredFeedback.length === 0) return;
    
    const csvHeader = serializeCsvRow(['Session', 'Rating', 'Comment', 'Date']);
    const csvContent = filteredFeedback
      .map(f => {
        return serializeCsvRow([
          f.session_name || 'Unknown Session',
          f.rating,
          f.comment || '',
          new Date(f.created_at).toLocaleString(),
        ]);
      })
      .join('\n');

    const blob = new Blob([`${csvHeader}\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `session-feedback-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

  if (feedbackQuery.isLoading || (!sessionId && sessionsQuery.loading)) {
    return <div className="flex justify-center p-8">Loading feedback data...</div>;
  }

  if (feedbackQuery.error || (!sessionId && sessionsQuery.error)) {
    return <div className="p-8 text-center text-red-700">Feedback data could not be loaded.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {sessionId ? 'Session Feedback' : 'Session Feedback Dashboard'}
          </h2>
          <p className="text-gray-600">
            {sessionId 
              ? 'Feedback for this session' 
              : 'Analyze participant feedback and session performance'
            }
          </p>
        </div>
      </div>

      <FeedbackAnalytics feedback={filteredFeedback} />

      {/* Only show filters if not filtering by specific session or if there are multiple sessions */}
      {!sessionId && (
        <FeedbackFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          ratingFilter={ratingFilter}
          onRatingFilterChange={setRatingFilter}
          sessionFilter={sessionFilter}
          onSessionFilterChange={setSessionFilter}
          sessions={sessions}
          onExport={exportFeedback}
          totalResults={filteredFeedback.length}
        />
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Feedback List ({filteredFeedback.length})</h3>
        {filteredFeedback.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No feedback found for the selected filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredFeedback.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {renderStars(f.rating)}
                      <Badge variant="outline">{f.rating}/5</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {f.session_name || 'Unknown Session'}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(f.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {f.comment && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{f.comment}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default FeedbackDashboard;
