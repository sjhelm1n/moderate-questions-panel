import React from 'react';

/**
 * Deprecated: VotingDebugPanel
 * This component has been intentionally removed per request to eliminate
 * SQL insertion and the voting debug UI. It remains as a no-op placeholder
 * to avoid import/build errors. Safe to delete once all imports are removed.
 */

interface VotingDebugPanelProps {
  sessionId: string;
}

const VotingDebugPanel: React.FC<VotingDebugPanelProps> = () => {
  // No UI, no Supabase calls.
  return null;
};

export default VotingDebugPanel;
