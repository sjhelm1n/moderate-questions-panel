-- SPDX-License-Identifier: Apache-2.0
-- Cover the composite vote foreign key for efficient integrity checks and cascades.

create index if not exists question_votes_question_session_idx
  on public.question_votes (question_id, session_id);
