import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const SignOutButton: React.FC = () => {
  const { signOut, loading } = useAuth();
  
  const handleSignOut = async () => {
    console.log('SignOutButton: Sign out button clicked');
    try {
      await signOut();
      console.log('SignOutButton: Sign out completed');
    } catch (error) {
      console.error('SignOutButton: Sign out error:', error);
    }
  };

  return (
    <Button 
      onClick={handleSignOut}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
      disabled={loading}
    >
      <LogOut className="w-4 h-4" />
      {loading ? 'Signing Out...' : 'Sign Out'}
    </Button>
  );
};

export default SignOutButton;