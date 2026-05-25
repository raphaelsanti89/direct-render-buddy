import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/slug";
import { getPrecoForProfile } from "@/lib/preco";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

type Kit = {
  id: string;
  nome: string;
  slug: string;
  descricao_curta: string | null;
  preco_varejo: number;
  preco_original: number;
  preco_assinatura: number | null;
  preco_b2b_1: number | null;
  preco_b2b_2: number | null;
  preco_b2b_3: number | null;
  percentual_economia: number | null;
  imagens: string[] | null;
};

export const Route = createFileRoute("/kits")({
  head: () => ({
    meta: [
      { title: "Kits — Gama Sensações" },
      { name: "description", content: "Kits sensoriais cuidadosamente curados — economia e descoberta em uma só caixa." },
      { property: "og:title", content: "Kits — Gama Sensações" },
      { property: "og:description", content: "Kits sensoriais cuidadosamente curados." },
    ],
  }),
  component: KitsPage,
});

function KitsPage() {
  const { profile } = useCurrentProfile();
  const [items, setItems] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("kits")
      .select("*")
      .eq("ativo", true)
      .order("destaque", { ascending: false })
      .then(({ data }) => { setItems((data as Kit[]) ?? []); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <div className="container-editorial">
        <div className="max-w-2xl mb-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-4">— coleções curadas</p>
          <h1 className="font-display text-5xl md:text-6xl text-foreground">Kits sensoriais</h1>
          <p className="mt-6 text-muted-foreground">
            Combinações pensadas para criar atmosferas — em casa, no escritório ou para presentear.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Em breve, novos kits.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {items.map((k) => {
              const preco = getPrecoForProfile(k, profile);
              return (
                <Link key={k.id} to="/kit/$slug" params={{ slug: k.slug }} className="bg-background group flex flex-col">
                  <div className="aspect-[4/5] bg-surface overflow-hidden relative">
                    {k.imagens?.[0] ? (
                      <img src={k.imagens[0]} alt={k.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        sem imagem
                      </div>
                    )}
                    {preco.badge ? (
                      <span className="absolute top-4 right-4 bg-gold text-foreground font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1">
                        {preco.badge}
                      </span>
                    ) : k.percentual_economia ? (
                      <span className="absolute top-4 right-4 bg-gold text-foreground font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1">
                        -{k.percentual_economia}%
                      </span>
                    ) : null}
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-2xl text-foreground group-hover:text-gold transition-colors">{k.nome}</h3>
                    {k.descricao_curta && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{k.descricao_curta}</p>}
                    <div className="mt-4 flex items-baseline gap-3">
                      <span className="font-display text-lg text-foreground">{brl(preco.valor)}</span>
                      {preco.origem !== "varejo" ? (
                        <span className="text-xs text-muted-foreground line-through">{brl(preco.precoVarejoReferencia)}</span>
                      ) : k.preco_original > k.preco_varejo ? (
                        <span className="text-xs text-muted-foreground line-through">{brl(k.preco_original)}</span>
                      ) : null}
                    </div>
                    {preco.economiaPercentual && (
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gold">
                        economia de {preco.economiaPercentual}%
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
