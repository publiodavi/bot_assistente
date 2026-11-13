-- Índice para o teto diário global de uso (contagem por operação nas últimas 24 h).
-- Migração aditiva: pode ser executada mais de uma vez.
CREATE INDEX IF NOT EXISTS study_usage_operation_idx ON study_usage (operation, created_at);
