import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const DatabaseSetupGuide: React.FC = () => {
  const setupSQL = `-- Step 1: Create question_votes table
CREATE TABLE IF NOT EXISTS public.question_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  voter_id text NOT NULL,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(question_id, voter_id)
);

-- Step 2: Create session_feedback table
CREATE TABLE IF NOT EXISTS public.session_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 3: Enable RLS on question_votes
ALTER TABLE public.question_votes ENABLE ROW LEVEL SECURITY;

-- Step 4: Enable RLS on session_feedback
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies for question_votes
CREATE POLICY "Anyone can vote on questions"
  ON public.question_votes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read votes"
  ON public.question_votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Step 6: Create policies for session_feedback
CREATE POLICY "Anyone can submit feedback"
  ON public.session_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read feedback"
  ON public.session_feedback
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Step 7: Update questions table policies for voting
CREATE POLICY "Anyone can update vote counts"
  ON public.questions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Step 8: Verify setup
SELECT 'question_votes and session_feedback tables created' as status
WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'question_votes'
) AND EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'session_feedback'
)`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('SQL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Setup Guide for Voting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <strong>Issue Detected:</strong> The system requires the <code>question_votes</code> and 
              <code>session_feedback</code> tables to properly track votes and session feedback. 
              These tables may not exist in your Supabase database.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Fix Instructions:</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">1. Open your Supabase Dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">2. Go to SQL Editor</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">3. Copy and run the SQL below</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">4. Refresh this page and test voting</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Setup SQL:</h3>
              <Button
                onClick={() => copyToClipboard(setupSQL)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy SQL
              </Button>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre">{setupSQL}</pre>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription>
              <strong>What this does:</strong> Creates the <code>question_votes</code> and 
              <code>session_feedback</code> tables with proper relationships and security policies, 
              enabling the voting system to track individual votes and prevent duplicate voting, 
              while also allowing users to submit session feedback.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Fallback System:</h3>
            <p className="text-sm text-gray-600">
              If the <code>question_votes</code> table doesn't exist, the system will automatically fall back 
              to a simplified voting approach that directly updates vote counts. However, this won't prevent 
              duplicate voting from the same user.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseSetupGuide;