-- Flash cards por caderno e materiais enviados pelo estudante.
-- Migração aditiva: apenas cria tabelas e pode ser executada mais de uma vez.
BEGIN;
CREATE TABLE IF NOT EXISTS study_card_decks (
    thread_id uuid PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data jsonb NOT NULL DEFAULT '{}',
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_card_decks_user_idx ON study_card_decks (user_id);

-- O PDF original não é guardado: só os metadados aqui e o texto em trechos no índice local.
CREATE TABLE IF NOT EXISTS study_materials (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    pages integer NOT NULL DEFAULT 0,
    chunks integer NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
    error text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_materials_user_idx ON study_materials (user_id, created_at);
COMMIT;
