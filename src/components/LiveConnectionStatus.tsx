import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LiveConnectionStatusProps {
  sessionId: string;
}

export const LiveConnectionStatus: React.FC<LiveConnectionStatusProps> = ({ sessionId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    // Track connection status
    const channel = supabase
      .channel(`connection_status_${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setParticipantCount(Object.keys(state).length);
        setIsConnected(true);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setParticipantCount(prev => prev + newPresences.length);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setParticipantCount(prev => Math.max(0, prev - leftPresences.length));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Track this user's presence
          await channel.track({
            user_id: `anonymous_${Date.now()}`,
            online_at: new Date().toISOString(),
          });
        } else {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [sessionId]);

  return (
    <div className="flex items-center gap-3">
      <Badge 
        variant="outline" 
        className={`
          flex items-center gap-2 px-3 py-1
          ${isConnected 
            ? 'bg-green-50 text-green-700 border-green-200' 
            : 'bg-red-50 text-red-700 border-red-200'
          }
        `}
      >
        {isConnected ? (
          <>
            <Activity className="w-3 h-3 animate-pulse" />
            <span>Live</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span>Disconnected</span>
          </>
        )}
      </Badge>
      
      {participantCount > 0 && (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {participantCount} active
        </Badge>
      )}
    </div>
  );
};