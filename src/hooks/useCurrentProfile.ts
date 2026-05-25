import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ProfilePreco } from "@/lib/preco";

export type CurrentProfile = ProfilePreco & {
  id: string;
  nome: string | null;
  email: string | null;
  empresa_nome: string | null;
  cnpj: string | null;
  whatsapp: string | null;
};

type State = {
  loading: boolean;
  profile: CurrentProfile | null;
};

/**
 * Hook reativo do perfil do usuário logado.
 * Retorna { loading, profile }. Null = anônimo.
 */
export function useCurrentProfile(): State {
  const [state, setState] = useState<State>({ loading: true, profile: null });

  useEffect(() => {
    let mounted = true;

    async function load(userId: string | null) {
      if (!userId) {
        if (mounted) setState({ loading: false, profile: null });
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,nome,email,tipo_cliente,nivel_b2b,status_aprovacao,empresa_nome,cnpj,whatsapp",
        )
        .eq("id", userId)
        .maybeSingle();
      if (error) console.error("[profile] load error:", error);
      if (!mounted) return;
      setState({
        loading: false,
        profile: (data as CurrentProfile | null) ?? null,
      });
    }

    supabase.auth.getSession().then(({ data }) => {
      load(data.session?.user.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      load(session?.user.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
