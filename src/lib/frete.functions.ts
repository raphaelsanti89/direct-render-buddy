import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";


const SUPERFRETE_BASE = "https://api.superfrete.com";
const USER_AGENT = "Gama Sensacoes (contato@gamasensacoes.com.br)";

const ItemInput = z.object({
  kind: z.enum(["produto", "kit"]),
  id: z.string().uuid(),
  qty: z.number().int().positive(),
});

const CalcInput = z.object({
  cep_destino: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => s.length === 8, "CEP inválido"),
  subtotal: z.number().nonnegative().default(0),
  itens: z.array(ItemInput).optional(),
});

export type OpcaoFrete = {
  id: number;
  nome: string;
  preco: number;
  prazo_dias: number;
  empresa?: string;
};

export type CalcularFreteResult =
  | { ok: true; opcoes: OpcaoFrete[] }
  | { ok: false; erro: string };

type ProdDims = {
  peso_kg: number | null;
  altura_cm: number | null;
  largura_cm: number | null;
  comprimento_cm: number | null;
};

type PkgDefaults = {
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
};

/**
 * Para cada item do pedido, calcula peso e a "caixa" a ser usada:
 * - Peso: soma de (peso_item × qty). Item sem peso cadastrado usa fallback.
 * - Dimensões: aproximação de caixa única = maior dimensão entre os itens.
 *   Item sem dimensão usa fallback.
 * - Para kits: peso e dimensões vêm dos produtos componentes (soma de peso).
 */
function computePackage(
  itens: z.infer<typeof ItemInput>[],
  produtoDims: Map<string, ProdDims>,
  kitComponentes: Map<string, { produto_id: string; quantidade: number }[]>,
  defaults: PkgDefaults,
): { weight: number; height: number; width: number; length: number } {
  let pesoTotal = 0;
  let maxAlt = 0;
  let maxLarg = 0;
  let maxComp = 0;

  const applyProduto = (dims: ProdDims | undefined, qty: number) => {
    const peso = dims?.peso_kg != null ? Number(dims.peso_kg) : defaults.peso;
    const alt = dims?.altura_cm != null ? Number(dims.altura_cm) : defaults.altura;
    const larg = dims?.largura_cm != null ? Number(dims.largura_cm) : defaults.largura;
    const comp = dims?.comprimento_cm != null ? Number(dims.comprimento_cm) : defaults.comprimento;
    pesoTotal += peso * qty;
    if (alt > maxAlt) maxAlt = alt;
    if (larg > maxLarg) maxLarg = larg;
    if (comp > maxComp) maxComp = comp;
  };

  for (const it of itens) {
    if (it.kind === "produto") {
      applyProduto(produtoDims.get(it.id), it.qty);
    } else {
      const comps = kitComponentes.get(it.id);
      if (!comps || comps.length === 0) {
        // Kit sem componentes registrados → cai no fallback padrão para esse kit.
        pesoTotal += defaults.peso * it.qty;
        if (defaults.altura > maxAlt) maxAlt = defaults.altura;
        if (defaults.largura > maxLarg) maxLarg = defaults.largura;
        if (defaults.comprimento > maxComp) maxComp = defaults.comprimento;
      } else {
        for (const c of comps) {
          applyProduto(produtoDims.get(c.produto_id), c.quantidade * it.qty);
        }
      }
    }
  }

  // Se o pedido veio sem itens (uso legado), devolve o pacote padrão.
  if (itens.length === 0) {
    return {
      weight: defaults.peso,
      height: defaults.altura,
      width: defaults.largura,
      length: defaults.comprimento,
    };
  }

  return {
    weight: Math.max(0.05, Number(pesoTotal.toFixed(3))),
    height: Math.max(2, Number(maxAlt.toFixed(2))),
    width: Math.max(11, Number(maxLarg.toFixed(2))),
    length: Math.max(16, Number(maxComp.toFixed(2))),
  };
}

export const calcularFrete = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CalcInput.parse(data))
  .handler(async ({ data }): Promise<CalcularFreteResult> => {
    const token = process.env.SUPERFRETE_TOKEN;
    if (!token) return { ok: false, erro: "SuperFrete não configurado." };

    // Use admin client (server-only) to avoid RLS blocking non-public config rows.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const chaves = [
      "cep_origem",
      "pacote_peso_kg",
      "pacote_altura_cm",
      "pacote_largura_cm",
      "pacote_comprimento_cm",
    ];
    const { data: cfgRows, error: cfgErr } = await supabaseAdmin
      .from("configuracoes_gerais")
      .select("chave,valor")
      .in("chave", chaves);
    if (cfgErr) {
      console.error("[calcularFrete] cfg read fail", cfgErr);
      return { ok: false, erro: "Falha ao ler configurações." };
    }

    const cfg = Object.fromEntries((cfgRows ?? []).map((r) => [r.chave, r.valor ?? ""]));
    const cepOrigem = (cfg.cep_origem ?? "").replace(/\D/g, "");
    if (cepOrigem.length !== 8) {
      console.error("[calcularFrete] cep_origem ausente/inválido", {
        rowsCount: cfgRows?.length ?? 0,
        raw: cfg.cep_origem,
      });
      return { ok: false, erro: "CEP de origem não configurado." };
    }

    const num = (v: string, d: number) => {
      const n = Number(String(v).replace(",", "."));
      return Number.isFinite(n) && n > 0 ? n : d;
    };

    const defaults: PkgDefaults = {
      peso: num(cfg.pacote_peso_kg, 0.3),
      altura: num(cfg.pacote_altura_cm, 10),
      largura: num(cfg.pacote_largura_cm, 15),
      comprimento: num(cfg.pacote_comprimento_cm, 20),
    };

    const itens = data.itens ?? [];

    // Carrega dimensões reais de produtos e composição de kits envolvidos.
    const produtoDims = new Map<string, ProdDims>();
    const kitComponentes = new Map<string, { produto_id: string; quantidade: number }[]>();

    const produtoIds = new Set<string>();
    const kitIds = new Set<string>();
    for (const it of itens) {
      if (it.kind === "produto") produtoIds.add(it.id);
      else kitIds.add(it.id);
    }

    if (kitIds.size > 0) {
      const { data: kcRows, error: kcErr } = await supabaseAdmin
        .from("kit_componentes")
        .select("kit_id, produto_id, quantidade")
        .in("kit_id", Array.from(kitIds));
      if (kcErr) console.error("[calcularFrete] kit_componentes read fail", kcErr);
      for (const r of kcRows ?? []) {
        const arr = kitComponentes.get(r.kit_id) ?? [];
        arr.push({ produto_id: r.produto_id, quantidade: Number(r.quantidade) });
        kitComponentes.set(r.kit_id, arr);
        produtoIds.add(r.produto_id);
      }
    }

    if (produtoIds.size > 0) {
      const { data: pRows, error: pErr } = await supabaseAdmin
        .from("produtos")
        .select("id, peso_kg, altura_cm, largura_cm, comprimento_cm")
        .in("id", Array.from(produtoIds));
      if (pErr) console.error("[calcularFrete] produtos dims read fail", pErr);
      for (const r of pRows ?? []) {
        produtoDims.set(r.id, {
          peso_kg: r.peso_kg,
          altura_cm: r.altura_cm,
          largura_cm: r.largura_cm,
          comprimento_cm: r.comprimento_cm,
        });
      }
    }

    const pkg = computePackage(itens, produtoDims, kitComponentes, defaults);

    const payload = {
      from: { postal_code: cepOrigem },
      to: { postal_code: data.cep_destino },
      services: "1,2,17", // PAC, SEDEX, Mini Envios
      options: {
        own_hand: false,
        receipt: false,
        insurance_value: data.subtotal,
        use_insurance_value: data.subtotal > 0,
      },
      package: pkg,
    };

    try {
      const resp = await fetch(`${SUPERFRETE_BASE}/api/v0/calculator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        console.error("[superfrete]", resp.status, txt);
        return { ok: false, erro: `SuperFrete: ${resp.status}` };
      }

      const raw = (await resp.json()) as unknown;
      const arr = Array.isArray(raw) ? raw : [];
      const opcoes: OpcaoFrete[] = [];
      for (const item of arr) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        if (o.error) continue;
        const preco = Number(o.price);
        const prazo = Number(o.delivery_time);
        if (!Number.isFinite(preco) || !Number.isFinite(prazo)) continue;
        opcoes.push({
          id: Number(o.id) || 0,
          nome: String(o.name ?? "Envio"),
          preco,
          prazo_dias: prazo,
          empresa:
            o.company && typeof o.company === "object"
              ? String((o.company as Record<string, unknown>).name ?? "")
              : undefined,
        });
      }

      if (opcoes.length === 0) return { ok: false, erro: "Nenhuma opção de frete disponível." };
      return { ok: true, opcoes };
    } catch (e) {
      console.error("[superfrete] fetch fail", e);
      return { ok: false, erro: "Falha ao consultar SuperFrete." };
    }
  });
