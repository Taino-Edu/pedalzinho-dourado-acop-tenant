# Revisão operacional — financiamento, CRM, equipe e estoque

## Veredito

Os quatro fluxos estavam fragmentados: o simulador não explicava que estoque e modelos populares eram alternativas; o CRM misturava idiomas; a equipe não podia ser cadastrada; e o estoque não registrava onde o veículo estava. As correções abaixo foram implementadas e verificadas no navegador local.

## Etapas revisadas

1. **Painel inicial — atenção necessária antes da correção**
   - Evidência: `01-dashboard-before.png`.
   - O painel apontava para módulos existentes, mas não explicava os fluxos operacionais em sequência.

2. **Financiamento — corrigido**
   - Antes: `02-financing-before.png`.
   - Depois: `06-financing-after.png`.
   - A escolha agora é uma etapa explícita: A) veículo do estoque ou B) modelo popular de referência.
   - O modelo clicado recebe estado selecionado, mensagem de confirmação e atualiza preço/FIPE sem exigir outra seleção.

3. **CRM/Leads — corrigido**
   - Antes: `03-crm-before.png`.
   - Depois: `09-crm-after.png` e `10-crm-assignment-after.png`.
   - Funil, lista, etapas, origem, prioridade, responsável, histórico e documentos foram traduzidos.
   - O botão “Novo lead” agora abre um formulário real, permite vincular um veículo cadastrado e escolher o vendedor responsável.
   - Preço e quilometragem do veículo vinculado aparecem em real e quilômetros; dados de demonstração foram localizados para o Brasil.

4. **Funcionários e comissões — corrigido**
   - Antes: `04-team-before.png`.
   - Depois: `07-team-after.png`.
   - A tela agora cadastra e edita funcionários, função, status e percentual de comissão.
   - Exibe leads em atendimento, vendas atribuídas e comissão estimada: valor do veículo vendido × percentual do vendedor.

5. **Pátio, garagem e estoque — corrigido**
   - Antes: `05-inventory-before.png`.
   - Depois: `08-inventory-after.png`.
   - Cada veículo possui localização física: pátio, garagem, showroom, oficina ou terceiros.
   - Há resumo por local, filtro, indicador na lista, edição individual e movimentação em lote.

## Acessibilidade e limites

- As alternativas do financiamento têm rótulos A/B, estado textual e `aria-pressed` nos modelos populares.
- Os formulários possuem labels e navegação por teclado através do modal existente.
- A revisão visual não substitui auditoria completa com leitor de tela.
- Comissão é previsão operacional; estornos, bônus, margem e folha ainda não formam um módulo contábil.

## Validação

- Migração PostgreSQL aplicada localmente.
- Prisma validado.
- APIs de equipe e veículos verificadas.
- 40 testes automatizados aprovados.
- Console do CRM sem erros.
- Agenda, clientes, relatórios, equipe, estoque e financiamento verificados no navegador sem erros de console.
