import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Server, Shield, Zap, Globe, AlertCircle } from 'lucide-react';

export const BackendRecommendations: React.FC = () => {
  const testSql = `
-- Test anonymous question submission
-- Run this in Supabase SQL Editor to verify setup

-- 1. First, check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('sessions', 'questions', 'user_profiles');

-- 2. Check existing policies on questions table
SELECT 
  polname as policy_name,
  polcmd as command,
  roles.rolname as role
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_roles roles ON pol.polroles @> ARRAY[roles.oid]
WHERE cls.relname = 'questions';

-- 3. Test anonymous insert (using anon role)
-- This simulates what happens when using the public API key
SET ROLE anon;
INSERT INTO public.questions (
  session_id,
  content,
  submitter_name,
  status,
  vote_count
) VALUES (
  'YOUR_SESSION_ID_HERE', -- Replace with actual session ID
  'Test question from anonymous user',
  'Anonymous Tester',
  'submitted',
  0
) RETURNING *;
RESET ROLE;

-- 4. Test voting functionality
-- Create question_votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.question_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  voter_id text NOT NULL,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(question_id, voter_id)
);

-- Enable RLS on question_votes
ALTER TABLE public.question_votes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to vote
CREATE POLICY "Anyone can vote on questions"
  ON public.question_votes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow reading votes for vote checking
CREATE POLICY "Anyone can read votes"
  ON public.question_votes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. If the insert fails, create/update the policy:
DROP POLICY IF EXISTS "Anyone can submit questions" ON public.questions;
CREATE POLICY "Anyone can submit questions"
  ON public.questions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anonymous users to read approved questions for voting
DROP POLICY IF EXISTS "Anyone can read approved questions" ON public.questions;
CREATE POLICY "Anyone can read approved questions"
  ON public.questions
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved' OR status = 'asked');

-- Allow anonymous users to update vote counts
DROP POLICY IF EXISTS "Anyone can update vote counts" ON public.questions;
CREATE POLICY "Anyone can update vote counts"
  ON public.questions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Backend Architecture Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Current Setup:</strong> This app uses Supabase for backend services. 
              The RLS policies have been configured to allow anonymous question submission.
            </AlertDescription>
          </Alert>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security Best Practices
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <div>
                  <strong>Row Level Security (RLS):</strong> Enabled on all tables with appropriate policies
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <div>
                  <strong>Anonymous Access:</strong> Questions table allows INSERT from anon role for participant submissions
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <div>
                  <strong>Authentication:</strong> Only required for moderators, not participants
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <div>
                  <strong>Data Isolation:</strong> Moderators can only manage their own sessions
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Performance Optimizations
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <div>
                  <strong>Real-time Updates:</strong> Using Supabase channels for live question updates
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <div>
                  <strong>Polling Fallback:</strong> 3-second interval polling ensures updates even if WebSocket fails
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <div>
                  <strong>Optimistic Updates:</strong> UI updates immediately on user actions
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Deployment Considerations
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">→</span>
                <div>
                  <strong>Environment Variables:</strong> Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">→</span>
                <div>
                  <strong>CORS Configuration:</strong> Supabase handles CORS automatically for registered domains
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-0.5">→</span>
                <div>
                  <strong>SSL/TLS:</strong> All Supabase connections use HTTPS by default
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Test SQL for Anonymous Submission:</h3>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre">{testSql}</pre>
            </div>
          </div>

          <Alert className="mt-4">
            <AlertDescription>
              <strong>Troubleshooting:</strong> If anonymous users cannot submit questions, run the test SQL above 
              in your Supabase SQL Editor to verify the RLS policies are correctly configured.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackendRecommendations;
