import { supabase } from "@/integrations/supabase/client";

// Categoria IDs (fixos no banco)
export const CAT_IDS = {
  essencias: "81b6fbb3-044b-413a-a4d6-8b0bd1b1cc6b",
  aromatizadoresEletricos: "b543a42d-3a9c-4a22-8e26-b0313c8d5b48",
  difusorVaretas: "63ce0ad5-02fe-40c3-8cb6-646589a14461",
  homeSpray: "1018d9fa-ba56-4d81-817d-e6ac8ab43dd4",
  aguaPerfumada: "601aa2c8-d4c1-4c5c-bf74-df0058cccb0b",
  refis: "7172befa-5acc-4cca-86f2-61d682aed5f7",
} as const;

export type SugestaoProduto = {
  id: string;
  nome: string;
  slug: string;
  imagens: string[] | null;
  categoria_id: string | null;
  fragrancia: string | null;
  preco_varejo: number;
  preco_assinatura: number | null;
  preco_b2b_1: number | null;
  preco_b2b_2: number | null;
  preco_b2b_3: number | null;
};

export type CartLike = {
  id: string;
  fragrancia?: string | null;
  categoria_id?: string | null;
};

// Categorias "complementares" preferidas dado o que já está no carrinho
function preferenciaCategorias(cartCatIds: Set<string>): string[] {
  const prefs: string[] = [];
  if (cartCatIds.has(CAT_IDS.essencias)) {
    // Essência: sugerir formas de "usar" — aromatizador elétrico, difusor de varetas
    prefs.push(CAT_IDS.aromatizadoresEletricos, CAT_IDS.difusorVaretas);
  }
  if (cartCatIds.has(CAT_IDS.aguaPerfumada)) {
    prefs.push(CAT_IDS.homeSpray, CAT_IDS.refis);
  }
  if (cartCatIds.has(CAT_IDS.homeSpray)) {
    prefs.push(CAT_IDS.aguaPerfumada, CAT_IDS.refis);
  }
  if (cartCatIds.has(CAT_IDS.difusorVaretas)) {
    prefs.push(CAT_IDS.essencias, CAT_IDS.refis);
  }
  return prefs;
}

/**
 * Retorna até `limit` sugestões complementares ao carrinho atual.
 * Prioridade:
 * a) Mesma fragrância, categoria diferente (com prioridade para categorias complementares).
 * b) Fallback: Aromatizador Elétrico genérico.
 */
export async function buscarSugestoesCombo(
  itens: CartLike[],
  limit = 3,
): Promise<SugestaoProduto[]> {
  const fragrancias = Array.from(
    new Set(itens.map((i) => i.fragrancia).filter((f): f is string => !!f)),
  );
  const cartIds = new Set(itens.map((i) => i.id));
  const cartCatIds = new Set(
    itens.map((i) => i.categoria_id).filter((c): c is string => !!c),
  );

  const acumulado: SugestaoProduto[] = [];

  // (a) Mesma fragrância, categoria diferente
  if (fragrancias.length > 0) {
    const { data } = await supabase
      .from("produtos")
      .select(
        "id,nome,slug,imagens,categoria_id,fragrancia,preco_varejo,preco_assinatura,preco_b2b_1,preco_b2b_2,preco_b2b_3",
      )
      .in("fragrancia", fragrancias)
      .eq("ativo", true);

    const candidatos = ((data as SugestaoProduto[]) ?? []).filter(
      (p) =>
        !cartIds.has(p.id) &&
        p.categoria_id &&
        !cartCatIds.has(p.categoria_id),
    );

    const prefs = preferenciaCategorias(cartCatIds);
    candidatos.sort((a, b) => {
      const ai = a.categoria_id ? prefs.indexOf(a.categoria_id) : -1;
      const bi = b.categoria_id ? prefs.indexOf(b.categoria_id) : -1;
      const av = ai === -1 ? 999 : ai;
      const bv = bi === -1 ? 999 : bi;
      return av - bv;
    });

    // dedupe por (fragrancia+categoria) para não repetir a mesma sugestão
    const seen = new Set<string>();
    for (const c of candidatos) {
      const k = `${c.fragrancia}-${c.categoria_id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      acumulado.push(c);
      if (acumulado.length >= limit) return acumulado;
    }
  }

  // (b) Fallback: aromatizador elétrico genérico
  if (acumulado.length < limit && !cartCatIds.has(CAT_IDS.aromatizadoresEletricos)) {
    const { data } = await supabase
      .from("produtos")
      .select(
        "id,nome,slug,imagens,categoria_id,fragrancia,preco_varejo,preco_assinatura,preco_b2b_1,preco_b2b_2,preco_b2b_3",
      )
      .eq("categoria_id", CAT_IDS.aromatizadoresEletricos)
      .eq("ativo", true)
      .limit(3);
    for (const p of (data as SugestaoProduto[]) ?? []) {
      if (cartIds.has(p.id)) continue;
      if (acumulado.find((x) => x.id === p.id)) continue;
      acumulado.push(p);
      if (acumulado.length >= limit) break;
    }
  }

  return acumulado;
}
