-- Histórico curto de consumo e concessões expirantes compartilhadas entre sessões.
BEGIN;
CREATE TABLE IF NOT EXISTS study_usage (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    released boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS study_usage_account_idx ON study_usage (user_id, operation, created_at);
COMMIT;
