-- Coluna esperada pela camada SQLAlchemy do Chainlit 2.12.0 nos passos.
-- Sem "autoCollapse", o passo "on_message" não é gravado e a resposta enviada
-- pelo chat fica com "parentId" sem correspondência, deixando de aparecer na
-- retomada da conversa. A migração é aditiva e pode ser executada mais de uma vez.
-- A tabela elements não foi alterada: anexos não são persistidos nesta versão.
BEGIN;
ALTER TABLE steps ADD COLUMN IF NOT EXISTS "autoCollapse" boolean;

-- Recupera mensagens gravadas antes desta correção: o pai que não chegou a ser
-- persistido é removido da referência, e a mensagem volta ao nível da conversa.
UPDATE steps AS child SET "parentId" = NULL
WHERE child."parentId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM steps AS parent WHERE parent.id = child."parentId");
COMMIT;
