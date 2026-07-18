import { useEffect, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { buscarSugestoesCombo, type CartLike, type SugestaoProduto } from "@/lib/sugestoes";
import { brl } from "@/lib/slug";

type Props = {
  itens: CartLike[];
  /** Handler chamado ao clicar em "Adicionar". */
  onAdd: (p: SugestaoProduto) => void;
  /** Retorna o preço a exibir para o perfil corrente. */
  precoDe: (p: SugestaoProduto) => number;
  limit?: number;
  className?: string;
};

export function SugestoesCombina({ itens, onAdd, precoDe, limit = 3, className }: Props) {
  const [sugestoes, setSugestoes] = useState<SugestaoProduto[]>([]);
  const [loading, setLoading] = useState(false);

  // chave estável para evitar refetch em cada re-render
  const key = itens
    .map((i) => `${i.id}:${i.fragrancia ?? ""}:${i.categoria_id ?? ""}`)
    .sort()
    .join("|");

  useEffect(() => {
    let cancelled = false;
    if (itens.length === 0) {
      setSugestoes([]);
      return;
    }
    setLoading(true);
    buscarSugestoesCombo(itens, limit)
      .then((r) => {
        if (!cancelled) setSugestoes(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, limit]);

  if (itens.length === 0) return null;
  if (!loading && sugestoes.length === 0) return null;

  return (
    <div className={`border border-gold/30 bg-gold/5 p-5 ${className ?? ""}`}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} className="text-gold" />
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-gold">
          Combina com o que você está levando
        </p>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground">Buscando sugestões…</p>
      ) : (
        <div className="grid sm:grid-cols-3 gap-3">
          {sugestoes.map((s) => {
            const img = s.imagens?.[0];
            const preco = precoDe(s);
            return (
              <div key={s.id} className="bg-background border border-border p-3 flex gap-3">
                <div className="w-16 h-16 shrink-0 bg-surface overflow-hidden">
                  {img ? (
                    <img src={img} alt={s.nome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                      sem foto
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <p className="text-xs text-foreground line-clamp-2 leading-snug">{s.nome}</p>
                  <p className="text-xs text-muted-foreground mt-1">{brl(preco)}</p>
                  <button
                    type="button"
                    onClick={() => onAdd(s)}
                    className="mt-auto self-start inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-gold hover:text-foreground border border-gold/50 hover:border-foreground px-2 py-1"
                  >
                    <Plus size={10} /> Adicionar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
