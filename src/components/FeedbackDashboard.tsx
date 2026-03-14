import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Calendar, MessageSquare } from 'lucide-react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';
import FeedbackAnalytics from './FeedbackAnalytics';
import FeedbackFilters from './FeedbackFilters';

interface FeedbackData {
  id: string;
  session_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  session_name?: string;
}

interface FeedbackDashboardProps {
  sessionId?: string; // Optional: if provided, show feedback only for this session
}

export const FeedbackDashboard: React.FC<FeedbackDashboardProps> = ({ sessionId }) => {
  const { user } = useAuth();
  const { fetchSessionFeedback, fetchSessions } = useSupabase();
  const [feedback, setFeedback] = useState<FeedbackData[]>([]);
  const [sessions, setSessions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');

  const loadData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // If sessionId is provided, fetch feedback only for that session
      // Otherwise, fetch all feedback for the moderator
      const [feedbackData, sessionsData] = await Promise.all([
        fetchSessionFeedback(user.id, sessionId),
        sessionId ? [] : fetchSessions(user.id, true) // Only fetch sessions list if not filtering by specific session
      ]);
      
      setFeedback(feedbackData || []);
      setSessions(sessionsData || []);
    } catch (error) {
      console.error('Error loading feedback data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, sessionId, fetchSessionFeedback, fetchSessions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    
    const csvHeader = 'Session,Rating,Comment,Date\n';
    const csvContent = filteredFeedback
      .map(f => {
        const sessionName = (f.session_name || 'Unknown Session').replace(/"/g, '""');
        const comment = (f.comment || '').replace(/"/g, '""');
        const date = new Date(f.created_at).toLocaleString();
        return `"${sessionName}",${f.rating},"${comment}","${date}"`;
      })
      .join('\n');

    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `session-feedback-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  if (loading) {
    return <div className="flex justify-center p-8">Loading feedback data...</div>;
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

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Feedback List ({filteredFeedback.length})</TabsTrigger>
          <TabsTrigger value="trends">Trends & Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Trend analysis and advanced analytics features will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackDashboard;
