import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const SessionSecurityGuide: React.FC = () => {
  const securitySQL = `-- Session Security Setup - Run in Supabase SQL Editor

-- 1. Enable RLS on sessions table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 2. Only moderators can create sessions
CREATE POLICY "Users can create their own sessions"
  ON public.sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (moderator_id = auth.uid());

-- 3. Only moderators can update their own sessions
CREATE POLICY "Users can update their own sessions"
  ON public.sessions
  FOR UPDATE
  TO authenticated
  USING (moderator_id = auth.uid())
  WITH CHECK (moderator_id = auth.uid());

-- 4. Anyone can read active sessions (for participants)
CREATE POLICY "Anyone can read active sessions"
  ON public.sessions
  FOR SELECT
  TO anon, authenticated
  USING (status != 'ended');

-- 5. Only moderators can read their ended sessions
CREATE POLICY "Moderators can read their ended sessions"
  ON public.sessions
  FOR SELECT
  TO authenticated
  USING (moderator_id = auth.uid() AND status = 'ended');

-- 6. Verify setup
SELECT 'Sessions table security configured' as status;`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('SQL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Session Security Fix Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong>Security Issue:</strong> Users can currently close sessions they don't own. 
            The sessions table needs Row Level Security (RLS) policies.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Security Fix SQL:</h3>
            <Button
              onClick={() => copyToClipboard(securitySQL)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy SQL
            </Button>
          </div>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-xs font-mono whitespace-pre">{securitySQL}</pre>
          </div>
        </div>

        <Alert className="border-green-200 bg-green-50">
          <AlertDescription>
            <strong>What this fixes:</strong> Prevents users from closing sessions they don't own 
            by implementing proper Row Level Security policies on the sessions table.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};