// SPDX-License-Identifier: Apache-2.0
import { useCallback, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, ExternalLink, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useSessions } from "@/hooks/useSessions";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import type { Session } from "@/types/domain";

function statusClasses(status: Session["status"]): string {
  if (status === "active") return "bg-green-100 text-green-800";
  if (status === "paused") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
}

function SessionItem({
  session,
  onOpen,
  onClose,
  onCopy,
  ending,
}: {
  session: Session;
  onOpen: (sessionId: string) => void;
  onClose: (sessionId: string) => void;
  onCopy: (sessionId: string) => void;
  ending: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{session.name}</h3>
          <Badge className={statusClasses(session.status)}>{session.status}</Badge>
        </div>
        {session.description ? <p className="text-sm text-gray-600">{session.description}</p> : null}
        <p className="text-xs text-gray-500">
          Created {new Date(session.created_at).toLocaleString()}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => onOpen(session.id)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open
        </Button>
        {session.status === "active" ? (
          <Button variant="destructive" disabled={ending} onClick={() => onClose(session.id)}>
            Close session
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => onCopy(session.id)}>
          <Copy className="mr-2 h-4 w-4" />
          Copy link
        </Button>
      </div>
    </div>
  );
}

export default function SessionManager() {
  const { user, isModerator } = useAuth();
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEnded, setShowEnded] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { sessions, loading, error, createSession, creating, endSession, ending } = useSessions(
    user?.id,
    showEnded,
  );
  const openSession = useCallback((sessionId: string) => {
    navigate(`/session/${sessionId}`);
  }, [navigate]);

  const copyLink = useCallback(async (sessionId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/session/${sessionId}`);
      toast({ title: "Session link copied" });
    } catch (copyError) {
      toast({
        variant: "destructive",
        title: "Unable to copy link",
        description: getErrorMessage(copyError),
      });
    }
  }, []);

  const closeSession = useCallback(async (sessionId: string) => {
    if (!window.confirm("Close this session? Participants will be sent to the feedback form.")) return;
    try {
      await endSession(sessionId);
      toast({ title: "Session closed" });
    } catch (closeError) {
      toast({
        variant: "destructive",
        title: "Unable to close session",
        description: getErrorMessage(closeError),
      });
    }
  }, [endSession]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      const session = await createSession({ name, description });
      setName("");
      setDescription("");
      setShowCreateForm(false);
      openSession(session.id);
    } catch (createError) {
      toast({
        variant: "destructive",
        title: "Unable to create session",
        description: getErrorMessage(createError),
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{showEnded ? "Closed sessions" : "Active sessions"}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={showEnded ? "outline" : "default"} onClick={() => setShowEnded(false)}>
              Active
            </Button>
            <Button size="sm" variant={showEnded ? "default" : "outline"} onClick={() => setShowEnded(true)}>
              Closed
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p className="text-sm text-gray-500">Loading sessions…</p> : null}
          {error ? <p className="text-sm text-red-700">{getErrorMessage(error)}</p> : null}
          {!loading && !error && sessions.length === 0 ? (
            <p className="text-sm text-gray-500">
              {showEnded ? "No closed sessions found." : "No active sessions yet."}
            </p>
          ) : null}
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              onOpen={openSession}
              onClose={closeSession}
              onCopy={copyLink}
              ending={ending}
            />
          ))}
        </CardContent>
      </Card>

      {isModerator ? (
        <div className="flex justify-center">
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New session
          </Button>
        </div>
      ) : null}

      {showCreateForm ? (
        <Card>
          <CardHeader><CardTitle>Create a session</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Session name" required />
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder="Description (optional)" />
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>{creating ? "Creating…" : "Create session"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

    </div>
  );
}
