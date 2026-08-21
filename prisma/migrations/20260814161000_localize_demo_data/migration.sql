-- Localiza somente os registros de demonstração conhecidos. Dados cadastrados
-- pelo cliente não são alterados.
UPDATE "TeamMember"
SET "name" = 'Marcos Oliveira', "email" = 'vendas@concessionaria.local'
WHERE "email" IN ('derek@autosuite.local', 'john@autosuite.local');

UPDATE "Lead"
SET "name" = 'Mariana Souza', "email" = 'mariana@example.com', "phone" = '+55 11 98888-1001', "priority" = 'High'
WHERE "email" = 'maya@example.com';

UPDATE "Lead"
SET "name" = 'Carlos Mendes', "email" = 'carlos@example.com', "phone" = '+55 11 98888-1002', "priority" = 'Normal'
WHERE "email" = 'david@example.com';

UPDATE "Lead"
SET "name" = 'Ana Ferreira', "email" = 'ana@example.com', "phone" = '+55 11 98888-1003', "priority" = 'High'
WHERE "email" = 'sarah@example.com';

UPDATE "Customer"
SET "name" = 'Rafael Lima', "email" = 'rafael.lima@example.com', "phone" = '+55 11 97777-2002', "address" = 'Campinas, SP'
WHERE "email" = 'tunde.bakare@example.com';

UPDATE "Customer"
SET "name" = 'Juliana Costa', "email" = 'juliana.costa@example.com', "phone" = '+55 11 97777-2001', "address" = 'São Paulo, SP', "referralCode" = 'JULIANA10'
WHERE "email" = 'amaka.eze@example.com';
