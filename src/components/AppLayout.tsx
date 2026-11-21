import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageCircle, Shield, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import SignOutButton from './SignOutButton';
import ModalAuthForm from './ModalAuthForm';
import SessionManager from './SessionManager';

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-600">{description}</p>
    </CardContent>
  </Card>
);

const Navigation = ({
  user,
  isModerator,
  onShowAuth,
}: {
  user: User | null;
  isModerator: boolean;
  onShowAuth: () => void;
}) => (
  <nav className="bg-white shadow-sm border-b">
    <div className="container mx-auto px-4 py-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <MessageCircle className="w-8 h-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">Q&A Panel</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-gray-600">
                {user.email}
              </span>
              {isModerator && (
                <Badge className="bg-blue-100 text-blue-800">Moderator</Badge>
              )}
              <SignOutButton />
            </>
          ) : (
            <Button onClick={onShowAuth} size="sm">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </div>
    </div>
  </nav>
);

const HeroSection = () => (
  <div className="text-center mb-12">
    <h1 className="text-4xl font-bold text-gray-900 mb-4">
      Interactive Q&A Panel System
    </h1>
    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
      Create and manage live Q&A sessions for panels, conferences, and events. 
      Audience members can submit questions anonymously without signing in.
    </p>
  </div>
);

const FeaturesGrid = () => (
  <div className="grid md:grid-cols-3 gap-6 mb-12">
    <FeatureCard
      icon={<Users className="w-5 h-5 text-blue-600" />}
      title="Anonymous Participation"
      description="Audience members can submit questions without creating an account. Share a simple link and start collecting questions immediately."
    />
    <FeatureCard
      icon={<Shield className="w-5 h-5 text-green-600" />}
      title="Moderation Controls"
      description="Moderators can review, approve, and prioritize questions in real-time. Mark questions as answered to keep the session organized."
    />
    <FeatureCard
      icon={<MessageCircle className="w-5 h-5 text-purple-600" />}
      title="Real-time Updates"
      description="Questions appear instantly for moderators. Approved questions are visible to the audience in real-time without page refresh."
    />
  </div>
);

const GetStartedSection = ({
  user,
  onShowAuth,
}: {
  user: User | null;
  onShowAuth: () => void;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Get Started</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-gray-600">
        Sign in as a moderator to create and manage Q&A sessions, or join an existing session as a participant.
      </p>
      
      {!user && (
        <Button onClick={onShowAuth}>
          <LogIn className="w-4 h-4 mr-2" />
          Sign In
        </Button>
      )}
    </CardContent>
  </Card>
);

const AuthModal = ({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      className="bg-white rounded-lg max-w-md w-full relative max-h-[90vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-dialog-title"
    >
      {/* X Close Button */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-1 shadow-sm"
        aria-label="Close dialog"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      {/* Auth Form Container */}
      <div className="p-6 pt-12">
        <div className="text-center mb-6">
          <h2 id="auth-dialog-title" className="text-2xl font-bold text-gray-900">Panel Discussion Platform</h2>
          <p className="text-gray-600 mt-2">Sign in with your invited moderator account</p>
        </div>
        <ModalAuthForm onSuccess={onSuccess} />
      </div>
      
      <div className="px-6 pb-6">
        <Button
          onClick={onCancel}
          variant="ghost"
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    </div>
  </div>
);

const AppLayout = () => {
  const { user, isModerator, loading, error } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const handleShowAuth = () => setShowAuth(true);
  const handleHideAuth = () => setShowAuth(false);
  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation 
        user={user}
        isModerator={isModerator}
        onShowAuth={handleShowAuth}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{error}</span>
          </div>
        )}
        <HeroSection />
        <FeaturesGrid />

        {/* Moderator Section */}
        {user && isModerator ? (
          <SessionManager />
        ) : (
          <GetStartedSection 
            user={user}
            onShowAuth={handleShowAuth}
          />
        )}
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal
          onSuccess={handleHideAuth}
          onCancel={handleHideAuth}
        />
      )}
    </div>
  );
};

export default AppLayout;
