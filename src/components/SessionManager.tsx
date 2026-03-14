import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Copy, ExternalLink } from 'lucide-react';
import { useSupabase, Session } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';

interface SessionManagerProps {
  currentSession?: string;
}

// Memoized session item component
const SessionItem = React.memo<{
  session: Session;
  onSelect: (id: string) => void;
  onClose: (id: string) => Promise<void>;
  onCopyLink: (id: string) => void;
  user: User | null;
  showClosed: boolean;
  statusClasses: (status: string) => string;
}>(({ session, onSelect, onClose, onCopyLink, user, showClosed, statusClasses }) => (
  <div className="flex items-start justify-between border rounded-lg p-4">
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <h3 className="font-semibold text-lg">{session.name}</h3>
        <Badge className={statusClasses(session.status)}>{session.status}</Badge>
      </div>
      {session.description && (
        <p className="text-sm text-gray-600">{session.description}</p>
      )}
      <div className="text-xs text-gray-500">
        Created: {new Date(session.created_at).toLocaleString()} &nbsp;•&nbsp; ID: {session.id}
      </div>
    </div>

    <div className="flex gap-2">
      <Button variant="outline" onClick={() => onSelect(session.id)}>
        <ExternalLink className="w-4 h-4 mr-2" />
        Join Session
      </Button>

      {session.status === 'active' && (
        <Button
          variant="destructive"
          onClick={async () => {
            if (confirm('Close this session?')) {
              await onClose(session.id);
            }
          }}
        >
          Close Session
        </Button>
      )}

      <Button
        variant="outline"
        onClick={() => onCopyLink(session.id)}
      >
        <Copy className="w-4 h-4 mr-2" />
        Copy Link
      </Button>
    </div>
  </div>
));

// Memoized create session form
const CreateSessionForm = React.memo<{
  sessionName: string;
  sessionDescription: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}>(({ sessionName, sessionDescription, onNameChange, onDescriptionChange, onSubmit, onCancel }) => (
  <Card>
    <CardHeader>
      <CardTitle>Create New Session</CardTitle>
    </CardHeader>
    <CardContent>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          placeholder="Session Name"
          value={sessionName}
          onChange={(e) => onNameChange(e.target.value)}
          required
        />
        <Textarea
          placeholder="Session Description (optional)"
          value={sessionDescription}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
        <div className="flex gap-2">
          <Button type="submit">Create Session</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
));

export const SessionManager: React.FC<SessionManagerProps> = React.memo(({ currentSession }) => {
  const { user, isModerator } = useAuth();
  const { sessions, createSession, fetchSessions, closeSession } = useSupabase();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const loadedViewsRef = useRef({ active: false, closed: false });
  const navigate = useNavigate();

  useEffect(() => {
    loadedViewsRef.current = { active: false, closed: false };
  }, [user?.id]);

  // Memoized status classes function
  const statusClasses = useCallback((s: string) =>
    s === 'active'
      ? 'bg-green-100 text-green-800'
      : s === 'paused'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-800',
    []
  );

  // Memoized session URL generator
  const generateSessionUrl = useCallback((id: string) =>
    `${window.location.origin}/session/${id}`,
    []
  );

  // Memoized copy link handler
  const handleCopyLink = useCallback((id: string) => {
    navigator.clipboard.writeText(generateSessionUrl(id));
  }, [generateSessionUrl]);

  // Memoized session selection handler
  const onSessionSelect = useCallback((id: string) => {
    navigate(`/session/${id}`);
  }, [navigate]);

  // Memoized close session handler
  const handleCloseSession = useCallback(async (id: string) => {
    await closeSession(id);
    // Refresh the current view after closing
    if (!showClosed && user) {
      fetchSessions(user.id, false);
    }
  }, [closeSession, showClosed, user, fetchSessions]);

  // Optimized fetch sessions effect
  useEffect(() => {
    const run = async () => {
      if (!user || !isModerator) return;
      const targetView = showClosed ? 'closed' : 'active';
      const hasLoadedTargetView = loadedViewsRef.current[targetView];

      if (!hasLoadedTargetView) {
        setLoading(true);
      }

      try {
        await fetchSessions(user.id, showClosed);
        loadedViewsRef.current[targetView] = true;
      } finally {
        if (!hasLoadedTargetView) {
          setLoading(false);
        }
      }
    };
    run();
  }, [user, isModerator, showClosed, fetchSessions]);

  // Memoized create session handler
  const handleCreateSession = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) return;

    const newSession = await createSession(sessionName, sessionDescription);
    if (newSession) {
      setSessionName('');
      setSessionDescription('');
      setShowCreateForm(false);
      onSessionSelect(newSession.id);
    }
  }, [sessionName, sessionDescription, createSession, onSessionSelect]);

  // Memoized toggle handlers
  const handleToggleActive = useCallback(() => setShowClosed(false), []);
  const handleToggleClosed = useCallback(() => setShowClosed(true), []);
  const handleShowCreateForm = useCallback(() => setShowCreateForm(true), []);
  const handleHideCreateForm = useCallback(() => setShowCreateForm(false), []);

  // Memoized session list
  const sessionList = useMemo(() => 
    sessions.map((session: Session) => (
      <SessionItem
        key={session.id}
        session={session}
        onSelect={onSessionSelect}
        onClose={handleCloseSession}
        onCopyLink={handleCopyLink}
        user={user}
        showClosed={showClosed}
        statusClasses={statusClasses}
      />
    )),
    [sessions, onSessionSelect, handleCloseSession, handleCopyLink, user, showClosed, statusClasses]
  );

  return (
    <div className="space-y-6">
      {/* Single card with built-in Active/Closed toggle */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{showClosed ? 'Closed Sessions' : 'Active Sessions'}</CardTitle>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={showClosed ? 'outline' : 'default'}
              onClick={handleToggleActive}
            >
              Active
            </Button>
            <Button
              size="sm"
              variant={showClosed ? 'default' : 'outline'}
              onClick={handleToggleClosed}
            >
              Closed
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-sm text-gray-500">Loading sessions…</div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-gray-500">
              {showClosed ? 'No closed sessions found.' : 'No active sessions yet.'}
            </p>
          ) : (
            sessionList
          )}
        </CardContent>
      </Card>

      {/* New Session button (moderators only) */}
      {isModerator && (
        <div className="flex justify-center">
          <Button onClick={handleShowCreateForm} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Session
          </Button>
        </div>
      )}

      {/* Create Session form */}
      {showCreateForm && (
        <CreateSessionForm
          sessionName={sessionName}
          sessionDescription={sessionDescription}
          onNameChange={setSessionName}
          onDescriptionChange={setSessionDescription}
          onSubmit={handleCreateSession}
          onCancel={handleHideCreateForm}
        />
      )}

      {/* Support Future Development */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Support Future Development
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Help us continue improving this platform and adding new features for the community.
            </p>
            <div className="flex justify-center">
              <stripe-buy-button
                buy-button-id="buy_btn_1SBnGIEE3XDX6a548AaaUrNR"
                publishable-key="pk_live_51R0uxnEE3XDX6a54MihVZYUeFmYlaBWKhC1wGGWWWSg7baxkN5BMrdfCTX8UjONsrXbbsdNnDD8LxZo9U0xheQfo00eVM9g6AX"
              >
              </stripe-buy-button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default SessionManager;
