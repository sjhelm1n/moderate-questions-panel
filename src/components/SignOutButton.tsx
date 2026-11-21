import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/errors';

const SignOutButton: React.FC = () => {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  
  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Unable to sign out',
        description: getErrorMessage(error),
      });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Button 
      onClick={handleSignOut}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
      disabled={signingOut}
    >
      <LogOut className="w-4 h-4" />
      {signingOut ? 'Signing Out...' : 'Sign Out'}
    </Button>
  );
};

export default SignOutButton;
