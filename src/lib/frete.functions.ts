import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";


const SUPERFRETE_BASE = "https://api.superfrete.com";
const USER_AGENT = "Gama Sensacoes (contato@gamasensacoes.com.br)";

const CalcInput = z.object({
  cep_destino: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => s.length === 8, "CEP inválido"),
  subtotal: z.number().nonnegative().default(0),
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
      package: {
        weight: num(cfg.pacote_peso_kg, 0.3),
        height: num(cfg.pacote_altura_cm, 10),
        width: num(cfg.pacote_largura_cm, 15),
        length: num(cfg.pacote_comprimento_cm, 20),
      },
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
