import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar, Filter, Download } from 'lucide-react';

interface FeedbackFiltersProps {
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  ratingFilter: string;
  onRatingFilterChange: (rating: string) => void;
  sessionFilter: string;
  onSessionFilterChange: (session: string) => void;
  sessions: Array<{ id: string; name: string }>;
  onExport: () => void;
  totalResults: number;
}

const FeedbackFilters: React.FC<FeedbackFiltersProps> = ({
  dateRange,
  onDateRangeChange,
  ratingFilter,
  onRatingFilterChange,
  sessionFilter,
  onSessionFilterChange,
  sessions,
  onExport,
  totalResults
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Export
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onExport}
            disabled={totalResults === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export ({totalResults})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date" className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Start Date
            </Label>
            <Input
              id="start-date"
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Rating</Label>
            <Select value={ratingFilter} onValueChange={onRatingFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="All ratings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
                <SelectItem value="4-5">4-5 Stars</SelectItem>
                <SelectItem value="1-3">1-3 Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Session</Label>
            <Select value={sessionFilter} onValueChange={onSessionFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="All sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessions.map(session => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackFilters;
