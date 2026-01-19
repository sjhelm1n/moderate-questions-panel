import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface QuestionSubmissionFormProps {
  sessionId: string;
  sessionStatus?: string;
}
export const QuestionSubmissionForm: React.FC<QuestionSubmissionFormProps> = ({ sessionId, sessionStatus }) => {
  const [question, setQuestion] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't allow submission for closed sessions
  if (sessionStatus === 'ended' || sessionStatus === 'closed') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Session Closed</h3>
          <p className="text-red-700">
            This session has ended and is no longer accepting questions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      // Direct submission to Supabase without authentication
      const { data, error: submitError } = await supabase
        .from('questions')
        .insert([{ 
          session_id: sessionId, 
          content: question.trim(), 
          submitter_name: submitterName.trim() || 'Anonymous',
          status: 'submitted',
          vote_count: 0
        }])
        .select()
        .single();
      
      if (submitError) {
        console.error('Submission error:', submitError);
        setError('Failed to submit question. Please try again.');
      } else {
        console.log('Question submitted:', data);
        setQuestion('');
        setSubmitterName('');
        setIsSubmitted(true);
        
        setTimeout(() => {
          setIsSubmitted(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Error submitting question:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">Question Submitted!</h3>
          <p className="text-green-700">
            Thank you for your question. It has been sent to the moderator for review.
          </p>
          <Button 
            onClick={() => setIsSubmitted(false)} 
            variant="outline" 
            className="mt-4 border-green-300 text-green-700 hover:bg-green-100"
          >
            Submit Another Question
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-2 sm:mx-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          Submit Your Question
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="submitterName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name (Optional)
            </label>
            <Input
              id="submitterName"
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              placeholder="Enter your name"
              maxLength={100}
              className="text-base" // Prevent zoom on iOS
            />
          </div>
          
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              Your Question *
            </label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask the panelists?"
              required
              className="min-h-[100px] sm:min-h-[120px] text-base resize-none" // Prevent zoom, disable resize
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {question.length}/500 characters
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-md">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={isSubmitting || !question.trim()}
            className="w-full h-12 text-base font-medium" // Larger touch target
          >
            {isSubmitting ? 'Submitting...' : 'Submit Question'}
          </Button>
        </form>

        <div className="mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">Guidelines:</h4>
          <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
            <li>• Keep questions clear and concise</li>
            <li>• Be respectful and professional</li>
            <li>• Avoid duplicate questions</li>
            <li>• Questions will be reviewed first</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuestionSubmissionForm;