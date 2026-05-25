// Helpers de precificação dinâmica baseada no perfil do usuário

export type TipoCliente = "varejo" | "assinante" | "b2b";
export type StatusAprovacao = "pendente" | "aprovado" | "rejeitado";

export type ProfilePreco = {
  tipo_cliente: TipoCliente;
  nivel_b2b: number | null;
  status_aprovacao: StatusAprovacao | null;
};

export type PrecosItem = {
  preco_varejo: number;
  preco_assinatura: number | null;
  preco_b2b_1: number | null;
  preco_b2b_2: number | null;
  preco_b2b_3: number | null;
};

export type PrecoCalculado = {
  valor: number;
  origem: TipoCliente;
  label: string;
  badge: string | null;
  // referência para mostrar economia
  precoVarejoReferencia: number;
  economiaPercentual: number | null;
};

/**
 * Retorna o preço correto para o perfil informado.
 * Regra: B2B aprovado (1>2>3) < Assinante < Varejo.
 * Cai sempre para varejo se não houver preço da faixa cadastrado.
 */
export function getPrecoForProfile(
  item: PrecosItem,
  profile: ProfilePreco | null,
): PrecoCalculado {
  const varejo = Number(item.preco_varejo);

  // B2B só vale se aprovado e nível 1/2/3 definido
  if (
    profile?.tipo_cliente === "b2b" &&
    profile.status_aprovacao === "aprovado" &&
    profile.nivel_b2b
  ) {
    const campo = (`preco_b2b_${profile.nivel_b2b}`) as keyof PrecosItem;
    const valor = item[campo];
    if (valor != null) {
      const v = Number(valor);
      return {
        valor: v,
        origem: "b2b",
        label: `Seu preço B2B Nível ${profile.nivel_b2b}`,
        badge: `B2B ${profile.nivel_b2b}`,
        precoVarejoReferencia: varejo,
        economiaPercentual: pctEconomia(varejo, v),
      };
    }
  }

  if (profile?.tipo_cliente === "assinante" && item.preco_assinatura != null) {
    const v = Number(item.preco_assinatura);
    return {
      valor: v,
      origem: "assinante",
      label: "Seu preço Assinante",
      badge: "Assinante",
      precoVarejoReferencia: varejo,
      economiaPercentual: pctEconomia(varejo, v),
    };
  }

  return {
    valor: varejo,
    origem: "varejo",
    label: "Preço",
    badge: null,
    precoVarejoReferencia: varejo,
    economiaPercentual: null,
  };
}

function pctEconomia(de: number, para: number): number | null {
  if (de <= 0 || para >= de) return null;
  return Math.round(((de - para) / de) * 100);
}
