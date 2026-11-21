import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { LogIn, AlertCircle } from 'lucide-react';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { getErrorMessage } from '@/lib/errors';

interface ModalAuthFormProps {
  onSuccess: () => void;
}

function ModalAuthForm({ onSuccess }: ModalAuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.user) {
        onSuccess();
      }
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Moderator accounts are invitation-only. Sign in with the credentials provided by the project operator.
      </p>
      <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            <LogIn className="w-4 h-4 mr-2" />
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
          <div className="text-center">
            <Button
              type="button"
              variant="link"
              className="text-sm text-gray-600 hover:text-gray-800"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot your password?
            </Button>
          </div>
      </form>
    </div>
  );
}

export default ModalAuthForm;
