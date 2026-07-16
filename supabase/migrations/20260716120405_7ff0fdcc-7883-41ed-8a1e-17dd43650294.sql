
INSERT INTO public.configuracoes_gerais (chave, valor, descricao) VALUES
  ('cep_origem', '', 'CEP de origem dos envios (8 dígitos, só números). Obrigatório para cálculo de frete via SuperFrete.'),
  ('pacote_peso_kg', '0.3', 'Peso padrão do pacote em kg usado no cálculo de frete quando o produto não tem peso próprio.'),
  ('pacote_altura_cm', '10', 'Altura padrão do pacote em cm (mínimo SuperFrete: 2).'),
  ('pacote_largura_cm', '15', 'Largura padrão do pacote em cm (mínimo SuperFrete: 11).'),
  ('pacote_comprimento_cm', '20', 'Comprimento padrão do pacote em cm (mínimo SuperFrete: 16).')
ON CONFLICT (chave) DO NOTHING;
