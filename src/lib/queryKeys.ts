// SPDX-License-Identifier: Apache-2.0

export const queryKeys = {
  session: (sessionId: string) => ["session", sessionId] as const,
  sessions: (moderatorId: string, includeEnded: boolean) =>
    ["sessions", moderatorId, includeEnded] as const,
  questions: (sessionId: string, viewerId: string) =>
    ["questions", sessionId, viewerId] as const,
  feedback: (moderatorId: string, sessionId?: string) =>
    ["feedback", moderatorId, sessionId ?? "all"] as const,
};
