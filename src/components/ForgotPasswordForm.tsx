import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { getErrorMessage } from '@/lib/errors';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a password reset link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <Mail className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Click the link in your email to reset your password. Expiration is controlled by your Supabase Auth configuration.
              </AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email address"
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              <Mail className="w-4 h-4 mr-2" />
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
