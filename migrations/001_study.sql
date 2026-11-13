-- Estrutura inicial: tabelas de persistência do Chainlit (usuários, conversas, mensagens,
-- elementos e avaliações) e as tabelas do AjudAI para o perfil do estudante e a trilha legada.
-- Pode ser executada novamente sem apagar dados (IF NOT EXISTS).
BEGIN;
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY, identifier text NOT NULL UNIQUE,
    "createdAt" text NOT NULL, metadata jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS threads (
    id uuid PRIMARY KEY, "createdAt" text, name text,
    "userId" uuid REFERENCES users(id) ON DELETE CASCADE,
    "userIdentifier" text, tags text[], metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS threads_user_idx ON threads ("userId");
CREATE TABLE IF NOT EXISTS steps (
    id uuid PRIMARY KEY, name text NOT NULL, type text NOT NULL,
    "threadId" uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE, "parentId" uuid,
    streaming boolean NOT NULL DEFAULT false, "waitForAnswer" boolean,
    "isError" boolean, metadata jsonb, tags text[], input text, output text,
    "createdAt" text, start text, "end" text, generation jsonb, "showInput" text,
    language text, "defaultOpen" boolean
);
CREATE INDEX IF NOT EXISTS steps_thread_idx ON steps ("threadId", "createdAt");
CREATE TABLE IF NOT EXISTS elements (
    id uuid PRIMARY KEY, "threadId" uuid REFERENCES threads(id) ON DELETE CASCADE,
    type text, url text, "chainlitKey" text, name text, display text, "objectKey" text,
    size text, language text, page integer, "forId" uuid, mime text, props text DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS feedbacks (
    id uuid PRIMARY KEY, "forId" uuid NOT NULL, "threadId" uuid REFERENCES threads(id) ON DELETE CASCADE,
    value integer NOT NULL, comment text
);
CREATE INDEX IF NOT EXISTS feedbacks_step_idx ON feedbacks ("forId");
CREATE TABLE IF NOT EXISTS study_profiles (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS study_trail_progress (
    thread_id uuid PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
    stage integer NOT NULL CHECK (stage >= 0)
);
COMMIT;
