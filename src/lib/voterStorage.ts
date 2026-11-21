// SPDX-License-Identifier: Apache-2.0

const VOTER_PREFIX = "moderate-questions:voter:v1";
const VOTED_PREFIX = "moderate-questions:voted:v1";
const VOTER_ID_PATTERN = /^voter_[A-Za-z0-9_-]{16,120}$/;

export function getOrCreateVoterId(sessionId: string): string {
  const key = `${VOTER_PREFIX}:${sessionId}`;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored && VOTER_ID_PATTERN.test(stored)) return stored;
  } catch {
    // Storage can be unavailable in privacy modes; a temporary ID still allows voting.
  }

  const voterId = `voter_${crypto.randomUUID().replace(/-/g, "_")}`;
  try {
    window.localStorage.setItem(key, voterId);
  } catch {
    // Best-effort duplicate prevention only.
  }
  return voterId;
}

export function hasStoredVote(sessionId: string, questionId: string, voterId: string): boolean {
  try {
    return window.localStorage.getItem(`${VOTED_PREFIX}:${sessionId}:${questionId}:${voterId}`) === "1";
  } catch {
    return false;
  }
}

export function storeVote(sessionId: string, questionId: string, voterId: string): void {
  try {
    window.localStorage.setItem(`${VOTED_PREFIX}:${sessionId}:${questionId}:${voterId}`, "1");
  } catch {
    // The database uniqueness constraint remains authoritative for this voter identifier.
  }
}
