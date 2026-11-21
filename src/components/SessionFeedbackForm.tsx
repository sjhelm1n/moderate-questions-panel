import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Star, Send } from 'lucide-react';
import { useSubmitFeedback } from '@/hooks/useFeedback';
import { getErrorMessage } from '@/lib/errors';

interface SessionFeedbackFormProps {
  sessionId: string;
  sessionName: string;
}

export const SessionFeedbackForm: React.FC<SessionFeedbackFormProps> = ({ 
  sessionId, 
  sessionName 
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitFeedback = useSubmitFeedback(sessionId);

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

  const handleStarHover = (starRating: number) => {
    setHoveredRating(starRating);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await submitFeedback.mutateAsync({ rating, comment: comment || undefined });
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const message = getErrorMessage(error);
      setError(
        message.includes('already been submitted')
          ? 'Feedback has already been submitted from this browser.'
          : message.includes('Rate limit exceeded')
            ? 'The feedback form is busy. Please wait a minute and try again.'
            : 'Feedback could not be submitted. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 px-2 sm:p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Thank You!</h1>
              <p className="text-gray-600 mb-4">
                Your feedback for "{sessionName}" has been submitted successfully.
              </p>
              <p className="text-sm text-gray-500">
                Your input helps us improve future sessions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-2 sm:p-4">
      <div className="max-w-2xl mx-auto pt-8 sm:pt-12">
        <Card className="bg-white shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
              Session Feedback
            </CardTitle>
            <p className="text-gray-600">"{sessionName}" has ended</p>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  How would you rate this session?
                </h3>
                <div className="flex justify-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="p-1 transition-transform hover:scale-110"
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => handleStarHover(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      aria-label={`Rate ${star} out of 5`}
                      aria-pressed={rating === star}
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (hoveredRating || rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  {rating === 0 && 'Please select a rating'}
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </p>
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments (Optional)
                </label>
                <Textarea
                  id="comment"
                  placeholder="What could have been better? Any suggestions for improvement?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  className="w-full resize-none text-base"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {comment.length}/2000 characters
                </p>
              </div>

              <Button
                type="submit"
                disabled={rating === 0 || isSubmitting}
                className="w-full h-12 text-base font-medium"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
