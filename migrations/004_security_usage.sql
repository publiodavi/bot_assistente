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

-- A autorização da aplicação é complementada por invariantes atômicas no banco.
-- Nunca transfere uma conversa já atribuída nem move objetos entre conversas.
CREATE OR REPLACE FUNCTION study_protect_ownership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'threads' THEN
        IF OLD."userId" IS NOT NULL AND OLD."userId" IS DISTINCT FROM NEW."userId" THEN
            RAISE EXCEPTION 'Conversa indisponível' USING ERRCODE = '42501';
        END IF;
    ELSE
        IF OLD."threadId" IS DISTINCT FROM NEW."threadId" THEN
            RAISE EXCEPTION 'Objeto indisponível' USING ERRCODE = '42501';
        END IF;
        IF TG_TABLE_NAME = 'feedbacks' THEN
            IF OLD."forId" IS DISTINCT FROM NEW."forId" THEN
                RAISE EXCEPTION 'Avaliação indisponível' USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER study_threads_owner BEFORE UPDATE ON threads
    FOR EACH ROW EXECUTE FUNCTION study_protect_ownership();
CREATE OR REPLACE TRIGGER study_steps_owner BEFORE UPDATE ON steps
    FOR EACH ROW EXECUTE FUNCTION study_protect_ownership();
CREATE OR REPLACE TRIGGER study_elements_owner BEFORE UPDATE ON elements
    FOR EACH ROW EXECUTE FUNCTION study_protect_ownership();
CREATE OR REPLACE TRIGGER study_feedback_owner BEFORE UPDATE ON feedbacks
    FOR EACH ROW EXECUTE FUNCTION study_protect_ownership();
COMMIT;
