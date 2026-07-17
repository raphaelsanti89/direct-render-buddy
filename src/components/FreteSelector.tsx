import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { calcularFrete, type OpcaoFrete } from "@/lib/frete.functions";
import { brl } from "@/lib/slug";

export type FreteSelection = {
  cep: string;
  opcao: OpcaoFrete | null;
  custo: number;
  gratis: boolean;
  opcoes: OpcaoFrete[] | null;
  erro: string | null;
};

export type FreteItem = { kind: "produto" | "kit"; id: string; qty: number };

type Props = {
  subtotal: number;
  /** Itens do pedido; usados para calcular peso/dimensões reais. */
  itens?: FreteItem[];
  /** Se subtotal >= este valor, frete = 0 (mostrado como "Grátis"). Default 150. */
  freteGratisMin?: number;
  /** Notifica o pai sempre que muda CEP / opção / custo. */
  onChange?: (sel: FreteSelection) => void;
  /** Texto de ajuda inicial. */
  placeholder?: string;
};

/**
 * Componente compartilhado de cálculo de frete via SuperFrete.
 * Reusa a server function `calcularFrete` (mesma lógica do checkout do site).
 */
export function FreteSelector({
  subtotal,
  itens,
  freteGratisMin = 150,
  onChange,
  placeholder = "Informe o CEP e clique em Calcular para ver as opções de envio.",
}: Props) {
  const [cep, setCep] = useState("");
  const [opcoes, setOpcoes] = useState<OpcaoFrete[] | null>(null);
  const [selId, setSelId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const calc = useServerFn(calcularFrete);

  const gratis = subtotal >= freteGratisMin;
  const opcao = opcoes?.find((o) => o.id === selId) ?? null;
  const custo = opcao && !gratis ? opcao.preco : 0;

  // Reset ao mudar CEP
  useEffect(() => {
    setOpcoes(null);
    setSelId(null);
    setErro(null);
  }, [cep]);

  useEffect(() => {
    onChange?.({ cep, opcao, custo, gratis, opcoes, erro });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep, selId, opcoes, gratis]);

  async function calcular() {
    const cepDigits = cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) {
      setErro("Informe um CEP válido (8 dígitos).");
      return;
    }
    setLoading(true);
    setErro(null);
    setOpcoes(null);
    setSelId(null);
    try {
      const res = await calc({ data: { cep_destino: cepDigits, subtotal } });
      if (res.ok) {
        setOpcoes(res.opcoes);
        setSelId(res.opcoes[0]?.id ?? null);
      } else {
        setErro(res.erro);
      }
    } catch {
      setErro("Não foi possível calcular.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className="form-input flex-1"
          value={cep}
          onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
          placeholder="00000000"
          inputMode="numeric"
          maxLength={9}
        />
        <button
          type="button"
          onClick={calcular}
          disabled={loading || cep.replace(/\D/g, "").length !== 8}
          className="border border-border px-3 text-[11px] uppercase tracking-[0.18em] hover:bg-surface disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : null}
          {loading ? "Calculando" : "Calcular"}
        </button>
      </div>

      {opcoes && opcoes.length > 0 && (
        <div className="mt-3 space-y-2">
          {opcoes.map((o) => (
            <label
              key={o.id}
              className={`flex items-center justify-between gap-3 border p-3 cursor-pointer transition-colors ${
                selId === o.id ? "border-gold bg-gold/5" : "border-border hover:bg-surface"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="frete-opcao"
                  checked={selId === o.id}
                  onChange={() => setSelId(o.id)}
                  className="accent-gold"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{o.nome}</p>
                  <p className="text-[11px] text-muted-foreground">~{o.prazo_dias} dias úteis</p>
                </div>
              </div>
              <p className="font-mono text-sm text-foreground">
                {gratis ? <span className="text-green-600">Grátis</span> : brl(o.preco)}
              </p>
            </label>
          ))}
          {gratis && (
            <p className="text-[11px] text-green-700 dark:text-green-400">
              ✓ Frete grátis a partir de {brl(freteGratisMin)} — escolha a modalidade para saber o prazo.
            </p>
          )}
        </div>
      )}

      {erro && (
        <p className="mt-2 text-[11px] px-3 py-2 bg-gold/10 text-foreground/80 border border-gold/30 leading-relaxed">
          {erro} Você pode informar o valor do frete manualmente abaixo.
        </p>
      )}

      {!opcoes && !erro && !loading && (
        <p className="mt-2 text-[11px] text-muted-foreground">{placeholder}</p>
      )}
    </div>
  );
}
