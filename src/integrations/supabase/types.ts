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
      configuracoes_gerais: {
        Row: {
          chave: string
          descricao: string | null
          id: string
          updated_at: string | null
          valor: string | null
        }
        Insert: {
          chave: string
          descricao?: string | null
          id?: string
          updated_at?: string | null
          valor?: string | null
        }
        Update: {
          chave?: string
          descricao?: string | null
          id?: string
          updated_at?: string | null
          valor?: string | null
        }
        Relationships: []
      }
      kits: {
        Row: {
          ativo: boolean | null
          created_at: string | null
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
      produtos: {
        Row: {
          ativo: boolean | null
          categoria_id: string | null
          composicao: string | null
          created_at: string | null
          descricao: string | null
          descricao_curta: string | null
          destaque: boolean | null
          disponivel_assinatura: boolean | null
          disponivel_b2b: boolean | null
          disponivel_varejo: boolean | null
          durabilidade_media: string | null
          estoque: number | null
          id: string
          imagens: string[] | null
          intensidade: number | null
          lancamento: boolean | null
          mais_vendido: boolean | null
          modo_de_uso: string | null
          nome: string
          notas_olfativas: string[] | null
          preco_assinatura: number | null
          preco_b2b_1: number | null
          preco_b2b_2: number | null
          preco_b2b_3: number | null
          preco_varejo: number
          sensacao_transmitida: string | null
          slug: string
          updated_at: string | null
          volume: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_id?: string | null
          composicao?: string | null
          created_at?: string | null
          descricao?: string | null
          descricao_curta?: string | null
          destaque?: boolean | null
          disponivel_assinatura?: boolean | null
          disponivel_b2b?: boolean | null
          disponivel_varejo?: boolean | null
          durabilidade_media?: string | null
          estoque?: number | null
          id?: string
          imagens?: string[] | null
          intensidade?: number | null
          lancamento?: boolean | null
          mais_vendido?: boolean | null
          modo_de_uso?: string | null
          nome: string
          notas_olfativas?: string[] | null
          preco_assinatura?: number | null
          preco_b2b_1?: number | null
          preco_b2b_2?: number | null
          preco_b2b_3?: number | null
          preco_varejo: number
          sensacao_transmitida?: string | null
          slug: string
          updated_at?: string | null
          volume?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string | null
          composicao?: string | null
          created_at?: string | null
          descricao?: string | null
          descricao_curta?: string | null
          destaque?: boolean | null
          disponivel_assinatura?: boolean | null
          disponivel_b2b?: boolean | null
          disponivel_varejo?: boolean | null
          durabilidade_media?: string | null
          estoque?: number | null
          id?: string
          imagens?: string[] | null
          intensidade?: number | null
          lancamento?: boolean | null
          mais_vendido?: boolean | null
          modo_de_uso?: string | null
          nome?: string
          notas_olfativas?: string[] | null
          preco_assinatura?: number | null
          preco_b2b_1?: number | null
          preco_b2b_2?: number | null
          preco_b2b_3?: number | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
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
      status_aprovacao: ["pendente", "aprovado", "rejeitado"],
      tipo_cliente: ["varejo", "assinante", "b2b"],
    },
  },
} as const
