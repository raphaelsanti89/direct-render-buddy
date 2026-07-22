export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number | null
          slug: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
          slug: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          slug?: string
        }
        Relationships: []
      }
      clientes_crm: {
        Row: {
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes_gerais: {
        Row: {
          chave: string
          descricao: string | null
          id: string
          publico: boolean
          updated_at: string | null
          valor: string | null
        }
        Insert: {
          chave: string
          descricao?: string | null
          id?: string
          publico?: boolean
          updated_at?: string | null
          valor?: string | null
        }
        Update: {
          chave?: string
          descricao?: string | null
          id?: string
          publico?: boolean
          updated_at?: string | null
          valor?: string | null
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          categoria: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          id: string
          observacoes: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      custos_fixos: {
        Row: {
          categoria: string | null
          created_at: string
          id: string
          item: string
          ordem: number
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: string
          item: string
          ordem?: number
          updated_at?: string
          valor_mensal?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: string
          item?: string
          ordem?: number
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      custos_variaveis: {
        Row: {
          created_at: string
          id: string
          item: string
          ordem: number
          percentual: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item: string
          ordem?: number
          percentual?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item?: string
          ordem?: number
          percentual?: number
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          created_at: string
          custo_medio: number
          id: string
          linha: string | null
          nome: string
          observacoes: string | null
          pedido_minimo: number
          preco_medio: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_medio?: number
          id?: string
          linha?: string | null
          nome: string
          observacoes?: string | null
          pedido_minimo?: number
          preco_medio?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_medio?: number
          id?: string
          linha?: string | null
          nome?: string
          observacoes?: string | null
          pedido_minimo?: number
          preco_medio?: number
          updated_at?: string
        }
        Relationships: []
      }
      kit_componentes: {
        Row: {
          created_at: string
          id: string
          kit_id: string
          produto_id: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kit_id: string
          produto_id: string
          quantidade?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kit_id?: string
          produto_id?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kit_componentes_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_componentes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          custo_embalagem: number
          desconto_kit_pct: number
          descricao: string | null
          descricao_curta: string | null
          destaque: boolean | null
          disponivel_assinatura: boolean | null
          disponivel_b2b: boolean | null
          id: string
          imagens: string[] | null
          nome: string
          percentual_economia: number | null
          preco_assinatura: number | null
          preco_b2b_1: number | null
          preco_b2b_2: number | null
          preco_b2b_3: number | null
          preco_original: number
          preco_varejo: number
          slug: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          custo_embalagem?: number
          desconto_kit_pct?: number
          descricao?: string | null
          descricao_curta?: string | null
          destaque?: boolean | null
          disponivel_assinatura?: boolean | null
          disponivel_b2b?: boolean | null
          id?: string
          imagens?: string[] | null
          nome: string
          percentual_economia?: number | null
          preco_assinatura?: number | null
          preco_b2b_1?: number | null
          preco_b2b_2?: number | null
          preco_b2b_3?: number | null
          preco_original: number
          preco_varejo: number
          slug: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          custo_embalagem?: number
          desconto_kit_pct?: number
          descricao?: string | null
          descricao_curta?: string | null
          destaque?: boolean | null
          disponivel_assinatura?: boolean | null
          disponivel_b2b?: boolean | null
          id?: string
          imagens?: string[] | null
          nome?: string
          percentual_economia?: number | null
          preco_assinatura?: number | null
          preco_b2b_1?: number | null
          preco_b2b_2?: number | null
          preco_b2b_3?: number | null
          preco_original?: number
          preco_varejo?: number
          slug?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          interesse: string | null
          nome: string | null
          origem: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          interesse?: string | null
          nome?: string | null
          origem?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          interesse?: string | null
          nome?: string | null
          origem?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      pedido_itens: {
        Row: {
          categoria_snapshot: string | null
          created_at: string
          id: string
          imagem_snapshot: string | null
          kind: Database["public"]["Enums"]["pedido_item_kind"]
          marca_snapshot: string | null
          nome_produto: string
          pedido_id: string
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          subtotal: number
        }
        Insert: {
          categoria_snapshot?: string | null
          created_at?: string
          id?: string
          imagem_snapshot?: string | null
          kind?: Database["public"]["Enums"]["pedido_item_kind"]
          marca_snapshot?: string | null
          nome_produto: string
          pedido_id: string
          preco_unitario: number
          produto_id?: string | null
          quantidade: number
          subtotal: number
        }
        Update: {
          categoria_snapshot?: string | null
          created_at?: string
          id?: string
          imagem_snapshot?: string | null
          kind?: Database["public"]["Enums"]["pedido_item_kind"]
          marca_snapshot?: string | null
          nome_produto?: string
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_notas: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          pedido_id: string
          texto: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          pedido_id: string
          texto: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          pedido_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_notas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_notas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_status_historico: {
        Row: {
          created_at: string
          id: string
          pedido_id: string
          status: Database["public"]["Enums"]["pedido_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          pedido_id: string
          status: Database["public"]["Enums"]["pedido_status"]
        }
        Update: {
          created_at?: string
          id?: string
          pedido_id?: string
          status?: Database["public"]["Enums"]["pedido_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pedido_status_historico_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          canal_contato: Database["public"]["Enums"]["pedido_canal"]
          cliente_id: string | null
          codigo_rastreamento: string | null
          codigo_rastreio: string
          created_at: string
          desconto: number
          email: string | null
          endereco: string | null
          estoque_movimentado: boolean
          forma_entrega: string | null
          forma_pagamento: string | null
          id: string
          nome_cliente: string
          numero_pedido: string
          observacoes: string | null
          origem_pedido: string
          perfil_cliente: string
          responsavel_atendimento: string | null
          status: Database["public"]["Enums"]["pedido_status"]
          status_pagamento: string
          subtotal: number
          tags: string[]
          telefone: string
          total: number
          updated_at: string
        }
        Insert: {
          canal_contato?: Database["public"]["Enums"]["pedido_canal"]
          cliente_id?: string | null
          codigo_rastreamento?: string | null
          codigo_rastreio?: string
          created_at?: string
          desconto?: number
          email?: string | null
          endereco?: string | null
          estoque_movimentado?: boolean
          forma_entrega?: string | null
          forma_pagamento?: string | null
          id?: string
          nome_cliente: string
          numero_pedido: string
          observacoes?: string | null
          origem_pedido?: string
          perfil_cliente?: string
          responsavel_atendimento?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          status_pagamento?: string
          subtotal?: number
          tags?: string[]
          telefone: string
          total?: number
          updated_at?: string
        }
        Update: {
          canal_contato?: Database["public"]["Enums"]["pedido_canal"]
          cliente_id?: string | null
          codigo_rastreamento?: string | null
          codigo_rastreio?: string
          created_at?: string
          desconto?: number
          email?: string | null
          endereco?: string | null
          estoque_movimentado?: boolean
          forma_entrega?: string | null
          forma_pagamento?: string | null
          id?: string
          nome_cliente?: string
          numero_pedido?: string
          observacoes?: string | null
          origem_pedido?: string
          perfil_cliente?: string
          responsavel_atendimento?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          status_pagamento?: string
          subtotal?: number
          tags?: string[]
          telefone?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_responsavel_atendimento_fkey"
            columns: ["responsavel_atendimento"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          altura_cm: number | null
          ativo: boolean | null
          categoria_id: string | null
          composicao: string | null
          comprimento_cm: number | null
          created_at: string | null
          descricao: string | null
          descricao_curta: string | null
          destaque: boolean | null
          disponivel_assinatura: boolean | null
          disponivel_b2b: boolean | null
          disponivel_varejo: boolean | null
          durabilidade_media: string | null
          estoque: number | null
          estoque_atual: number
          estoque_ideal: number
          estoque_minimo: number
          fornecedor_id: string | null
          fragrancia: string | null
          id: string
          imagens: string[] | null
          intensidade: number | null
          lancamento: boolean | null
          largura_cm: number | null
          linha: string | null
          mais_vendido: boolean | null
          margem_varejo_pct: number | null
          modo_de_uso: string | null
          nome: string
          notas_olfativas: string[] | null
          peso_kg: number | null
          preco_assinatura: number | null
          preco_b2b_1: number | null
          preco_b2b_2: number | null
          preco_b2b_3: number | null
          preco_custo: number | null
          preco_varejo: number
          sensacao_transmitida: string | null
          slug: string
          updated_at: string | null
          volume: string | null
        }
        Insert: {
          altura_cm?: number | null
          ativo?: boolean | null
          categoria_id?: string | null
          composicao?: string | null
          comprimento_cm?: number | null
          created_at?: string | null
          descricao?: string | null
          descricao_curta?: string | null
          destaque?: boolean | null
          disponivel_assinatura?: boolean | null
          disponivel_b2b?: boolean | null
          disponivel_varejo?: boolean | null
          durabilidade_media?: string | null
          estoque?: number | null
          estoque_atual?: number
          estoque_ideal?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          fragrancia?: string | null
          id?: string
          imagens?: string[] | null
          intensidade?: number | null
          lancamento?: boolean | null
          largura_cm?: number | null
          linha?: string | null
          mais_vendido?: boolean | null
          margem_varejo_pct?: number | null
          modo_de_uso?: string | null
          nome: string
          notas_olfativas?: string[] | null
          peso_kg?: number | null
          preco_assinatura?: number | null
          preco_b2b_1?: number | null
          preco_b2b_2?: number | null
          preco_b2b_3?: number | null
          preco_custo?: number | null
          preco_varejo: number
          sensacao_transmitida?: string | null
          slug: string
          updated_at?: string | null
          volume?: string | null
        }
        Update: {
          altura_cm?: number | null
          ativo?: boolean | null
          categoria_id?: string | null
          composicao?: string | null
          comprimento_cm?: number | null
          created_at?: string | null
          descricao?: string | null
          descricao_curta?: string | null
          destaque?: boolean | null
          disponivel_assinatura?: boolean | null
          disponivel_b2b?: boolean | null
          disponivel_varejo?: boolean | null
          durabilidade_media?: string | null
          estoque?: number | null
          estoque_atual?: number
          estoque_ideal?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          fragrancia?: string | null
          id?: string
          imagens?: string[] | null
          intensidade?: number | null
          lancamento?: boolean | null
          largura_cm?: number | null
          linha?: string | null
          mais_vendido?: boolean | null
          margem_varejo_pct?: number | null
          modo_de_uso?: string | null
          nome?: string
          notas_olfativas?: string[] | null
          peso_kg?: number | null
          preco_assinatura?: number | null
          preco_b2b_1?: number | null
          preco_b2b_2?: number | null
          preco_b2b_3?: number | null
          preco_custo?: number | null
          preco_varejo?: number
          sensacao_transmitida?: string | null
          slug?: string
          updated_at?: string | null
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cnpj: string | null
          created_at: string | null
          email: string | null
          empresa_nome: string | null
          id: string
          nivel_b2b: number | null
          nome: string | null
          observacoes_admin: string | null
          status_aprovacao:
            | Database["public"]["Enums"]["status_aprovacao"]
            | null
          tipo_cliente: Database["public"]["Enums"]["tipo_cliente"]
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          empresa_nome?: string | null
          id: string
          nivel_b2b?: number | null
          nome?: string | null
          observacoes_admin?: string | null
          status_aprovacao?:
            | Database["public"]["Enums"]["status_aprovacao"]
            | null
          tipo_cliente?: Database["public"]["Enums"]["tipo_cliente"]
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          empresa_nome?: string | null
          id?: string
          nivel_b2b?: number | null
          nome?: string | null
          observacoes_admin?: string | null
          status_aprovacao?:
            | Database["public"]["Enums"]["status_aprovacao"]
            | null
          tipo_cliente?: Database["public"]["Enums"]["tipo_cliente"]
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      referencia_capital_timeline: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          periodo: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          periodo: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          periodo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      referencia_checklist: {
        Row: {
          created_at: string
          id: string
          item: string
          ordem: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item: string
          ordem?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item?: string
          ordem?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      referencia_custos_abertura: {
        Row: {
          created_at: string
          id: string
          item: string
          observacao: string | null
          ordem: number
          tag: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          item: string
          observacao?: string | null
          ordem?: number
          tag?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          item?: string
          observacao?: string | null
          ordem?: number
          tag?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      referencia_custos_manutencao: {
        Row: {
          created_at: string
          id: string
          item: string
          observacao: string | null
          ordem: number
          tag: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          item: string
          observacao?: string | null
          ordem?: number
          tag?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          item?: string
          observacao?: string | null
          ordem?: number
          tag?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      referencia_decisao: {
        Row: {
          id: string
          texto: string
          updated_at: string
        }
        Insert: {
          id?: string
          texto: string
          updated_at?: string
        }
        Update: {
          id?: string
          texto?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_count_estoque_baixo: { Args: never; Returns: number }
      admin_count_kits: { Args: never; Returns: number }
      admin_count_produtos: { Args: never; Returns: number }
      admin_estoque_posicao: {
        Args: never
        Returns: {
          estoque_atual: number
          estoque_ideal: number
          estoque_minimo: number
          fornecedor_id: string
          fornecedor_nome: string
          id: string
          nome: string
          preco_custo: number
          status: string
          valor_investido: number
        }[]
      }
      admin_estoque_resumo: { Args: never; Returns: Json }
      admin_get_kit_componentes: {
        Args: { p_kit_id: string }
        Returns: {
          produto_id: string
          quantidade: number
        }[]
      }
      admin_list_clientes: {
        Args: never
        Returns: {
          cnpj: string
          created_at: string
          email: string
          empresa_nome: string
          id: string
          is_guest: boolean
          nivel_b2b: number
          nome: string
          observacoes_admin: string
          status_aprovacao: string
          tipo_cliente: string
          total_gasto: number
          total_pedidos: number
          whatsapp: string
        }[]
      }
      admin_list_kits: {
        Args: never
        Returns: {
          ativo: boolean | null
          created_at: string | null
          custo_embalagem: number
          desconto_kit_pct: number
          descricao: string | null
          descricao_curta: string | null
          destaque: boolean | null
          disponivel_assinatura: boolean | null
          disponivel_b2b: boolean | null
          id: string
          imagens: string[] | null
          nome: string
          percentual_economia: number | null
          preco_assinatura: number | null
          preco_b2b_1: number | null
          preco_b2b_2: number | null
          preco_b2b_3: number | null
          preco_original: number
          preco_varejo: number
          slug: string
        }[]
        SetofOptions: {
          from: "*"
          to: "kits"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_produtos: {
        Args: never
        Returns: {
          altura_cm: number | null
          ativo: boolean | null
          categoria_id: string | null
          composicao: string | null
          comprimento_cm: number | null
          created_at: string | null
          descricao: string | null
          descricao_curta: string | null
          destaque: boolean | null
          disponivel_assinatura: boolean | null
          disponivel_b2b: boolean | null
          disponivel_varejo: boolean | null
          durabilidade_media: string | null
          estoque: number | null
          estoque_atual: number
          estoque_ideal: number
          estoque_minimo: number
          fornecedor_id: string | null
          fragrancia: string | null
          id: string
          imagens: string[] | null
          intensidade: number | null
          lancamento: boolean | null
          largura_cm: number | null
          linha: string | null
          mais_vendido: boolean | null
          margem_varejo_pct: number | null
          modo_de_uso: string | null
          nome: string
          notas_olfativas: string[] | null
          peso_kg: number | null
          preco_assinatura: number | null
          preco_b2b_1: number | null
          preco_b2b_2: number | null
          preco_b2b_3: number | null
          preco_custo: number | null
          preco_varejo: number
          sensacao_transmitida: string | null
          slug: string
          updated_at: string | null
          volume: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "produtos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_lucratividade_produtos: {
        Args: { dias_periodo?: number }
        Returns: {
          custo: number
          lucro: number
          margem_pct: number
          nome: string
          produto_id: string
          qtd_vendida: number
          receita: number
        }[]
      }
      admin_metricas_vendas_30d: { Args: never; Returns: Json }
      admin_metricas_vendas_periodo: {
        Args: { p_fim: string; p_inicio: string }
        Returns: Json
      }
      admin_pedido_editar_itens: {
        Args: { p_payload: Json; p_pedido_id: string }
        Returns: Json
      }
      admin_pedido_excluir: {
        Args: { p_pedido_id: string }
        Returns: undefined
      }
      admin_produtos_mais_vendidos: {
        Args: { dias_periodo?: number }
        Returns: {
          estoque_atual: number
          estoque_ideal_atual: number
          estoque_minimo_atual: number
          media_diaria: number
          nome: string
          produto_id: string
          qtd_vendida: number
        }[]
      }
      admin_produtos_velocidade: {
        Args: never
        Returns: {
          campeao: boolean
          media_diaria: number
          produto_id: string
          qtd_30d: number
          sugestao_minimo: number
        }[]
      }
      admin_reposicao_fornecedor: {
        Args: { p_fornecedor_id: string }
        Returns: number
      }
      admin_vendas_mes_por_perfil: {
        Args: never
        Returns: {
          num_pedidos: number
          perfil: string
          receita: number
        }[]
      }
      ajustar_estoque_item: {
        Args: { _delta_qtd: number; _kind: string; _produto_id: string }
        Returns: undefined
      }
      criar_pedido_publico: { Args: { payload: Json }; Returns: Json }
      get_kit_composicao_publica: {
        Args: { p_kit_id: string }
        Returns: {
          produto_id: string
          produto_imagens: string[]
          produto_nome: string
          produto_slug: string
          quantidade: number
        }[]
      }
      get_pedido_publico: {
        Args: { p_codigo: string; p_identificador?: string }
        Returns: Json
      }
      get_pedidos_por_telefone: { Args: { p_telefone: string }; Returns: Json }
      get_produtos_mais_vendidos_publico: {
        Args: { p_limit?: number }
        Returns: {
          categoria_nome: string
          id: string
          imagens: string[]
          nome: string
          preco_varejo: number
          qtd_vendida: number
          slug: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      movimentar_estoque_pedido: {
        Args: { _pedido_id: string; _sinal: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      pedido_canal: "whatsapp" | "instagram" | "site" | "direto" | "revendedor"
      pedido_item_kind: "produto" | "kit"
      pedido_status:
        | "novo"
        | "em_atendimento"
        | "confirmado"
        | "em_separacao"
        | "enviado"
        | "entregue"
        | "cancelado"
      status_aprovacao: "pendente" | "aprovado" | "rejeitado"
      tipo_cliente: "varejo" | "assinante" | "b2b"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "customer"],
      pedido_canal: ["whatsapp", "instagram", "site", "direto", "revendedor"],
      pedido_item_kind: ["produto", "kit"],
      pedido_status: [
        "novo",
        "em_atendimento",
        "confirmado",
        "em_separacao",
        "enviado",
        "entregue",
        "cancelado",
      ],
      status_aprovacao: ["pendente", "aprovado", "rejeitado"],
      tipo_cliente: ["varejo", "assinante", "b2b"],
    },
  },
} as const
