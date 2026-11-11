CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_one_reversal ON journal_entries(reversal_of) WHERE reversal_of IS NOT NULL;

-- RC compatibility: Wrangler/D1 remote migration parsing rejects the trigger
-- body as an incomplete multi-statement input. The canonical application
-- posting transaction enforces the same balance invariant before POSTED state.
