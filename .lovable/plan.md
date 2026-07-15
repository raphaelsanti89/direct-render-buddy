## Fase C — Gestão financeira/estratégica no admin

Antes de escrever código, quero alinhar o escopo. É bastante coisa — 6 partes, 4 páginas novas, várias tabelas novas no banco e mudanças na Visão Geral. Abaixo o plano detalhado.

---

### 1. Banco de dados (uma migration só)

**Colunas novas em `produtos`:**
- `custo` (numeric, default 0) — usada em margem, valor de estoque e sugestão de reposição
- `fornecedor_id` (uuid, FK → `fornecedores.id`, nullable)

**Novas tabelas** (todas com RLS: SELECT/INSERT/UPDATE/DELETE só para admin via `has_role`, GRANT authenticated + service_role):

- `fornecedores` — `nome`, `linha`, `pedido_minimo`, `custo_medio`, `preco_medio`, timestamps
- `custos_fixos` — `item`, `categoria`, `valor_mensal`
- `referencia_decisao` — singleton (uma linha) com `texto`
- `referencia_custos_abertura` — `item`, `valor`, `observacao`, `tag` (bom|neutro|atencao)
- `referencia_custos_manutencao` — mesma estrutura
- `referencia_capital_timeline` — `periodo`, `descricao`, `valor`, `ordem`
- `referencia_checklist` — `item`, `status` (pendente|concluido), `ordem` — pré-populado com os 7 itens listados

**Chaves em `configuracoes_gerais`:**
- `margem_piso` (default `"50"`)
- `margem_meta` (default `"55"`)
- `meses_reserva` (default `"3"`)
- `dias_uteis_mes` (default `"26"`)

**Funções SECURITY DEFINER (admin-only):**
- `admin_estoque_posicao()` → lista produtos com nome, atual, mínimo, ideal, custo, valor_investido, status
- `admin_estoque_resumo()` → `{valor_total, comprar_agora, comprar_em_breve}`
- `admin_metricas_vendas_30d()` → `{ticket_medio, margem_real, receita_total, num_pedidos}` (margem = (receita − custo dos itens vendidos) / receita, usando snapshot de preço no pedido × custo atual do produto)
- `admin_vendas_mes_por_perfil()` → agregado do mês corrente agrupado por `perfil_cliente`
- `admin_reposicao_fornecedor(p_fornecedor_id)` → custo necessário para repor produtos em alerta desse fornecedor

### 2. Páginas novas

**`/admin/estoque`** — 3 cards de topo + tabela ordenada (críticos primeiro), pills coloridas de status.

**`/admin/custo-fixo`** — CRUD inline da tabela de custos fixos, inputs para meses de reserva/dias úteis (persistem em `configuracoes_gerais`), painel de resultados calculados em tempo real (reserva de giro, ponto de equilíbrio, meta/dia útil, vendas/dia) usando `admin_metricas_vendas_30d`. Abaixo, quebra "vendas do mês vs meta" por perfil (varejo, B2B 1/2/3, assinante) via `admin_vendas_mes_por_perfil`.

**`/admin/fornecedores`** — CRUD (criar/editar/excluir), margem calculada com badge colorido usando `margem_piso`/`margem_meta` das configurações. Campo `fornecedor_id` adicionado ao form de produto em `admin.produtos.tsx`. Cada card de fornecedor mostra "faltam R$ X para o pedido mínimo" via `admin_reposicao_fornecedor`.

**`/admin/referencia`** — Bloco editável de decisão SLU, 3 tabelas editáveis (abertura, manutenção, timeline capital), checklist com toggle pendente/concluído.

### 3. Alterações em telas existentes

**`admin.produtos.tsx`:**
- Adicionar campo `custo` e select `fornecedor_id` no formulário
- Coluna/linha de margem colorida (vermelho/âmbar/verde) usando piso/meta de configurações

**`admin.configuracoes.tsx`:**
- Nova seção "Metas de margem" com `margem_piso` e `margem_meta`
- (Meses de reserva / dias úteis ficam em /admin/custo-fixo mesmo, mas gravam nas configurações)

**`admin.index.tsx` (Visão Geral):**
- Novos cards: Custo fixo mensal, Ponto de equilíbrio, Reserva de giro, Meta por dia útil
- Card "Vendas do mês vs meta" com barra de progresso + mini-lista da quebra por perfil
- Card de fornecedores (total pedidos mínimos + lista margens, destaque para abaixo do piso)
- Card estoque "X produtos precisando de atenção" com link para /admin/estoque

**`components/admin/AdminShell.tsx`:** adicionar links de navegação para Estoque, Custo Fixo, Fornecedores, Referência (ícones lucide: Warehouse, Calculator, Truck, BookOpen).

### 4. Definições que estou assumindo (avise se quiser diferente)

- **Margem real (últimos 30 dias):** `sum(item.subtotal − item.quantidade × produto.custo_atual) / sum(item.subtotal)`, ignorando pedidos cancelados. Se um produto não tiver custo cadastrado, considero custo 0 (margem = 100% para aquele item).
- **Sugestão de reposição por fornecedor:** para cada produto do fornecedor com estoque ≤ ideal, `(estoque_ideal − estoque_atual) × custo`. Diferença até `pedido_minimo` do fornecedor = "faltam R$ X".
- **Quebra por perfil no mês:** `perfil_cliente` do pedido (varejo, b2b_1, b2b_2, b2b_3, assinante), somando `total` de pedidos não cancelados do mês corrente.
- **Referência SLU:** pré-populo o texto fixo da decisão + as 7 pendências. Custos de abertura/manutenção/timeline entram vazios (o usuário preenche pela tela).
- **Cor de margem em produto:** aplico como badge/pill ao lado do preço na listagem (não muda o card inteiro).

### 5. Ordem de execução

1. Migration (schema + funções + seed do checklist)
2. Depois da aprovação: types regenerados
3. Páginas novas + shell + configurações + produtos + dashboard, em paralelo

Se aprovar o plano (ou pedir ajustes nos itens da seção 4), sigo direto para a migration.
