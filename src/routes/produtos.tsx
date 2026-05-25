import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/slug";

type Cat = { id: string; nome: string; slug: string };
type Prod = {
  id: string;
  nome: string;
  slug: string;
  descricao_curta: string | null;
  preco_varejo: number;
  imagens: string[] | null;
  categoria_id: string | null;
  destaque: boolean | null;
  lancamento: boolean | null;
};

type Search = { categoria?: string };

export const Route = createFileRoute("/produtos")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    categoria: typeof s.categoria === "string" ? s.categoria : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Produtos — Gama Sensações" },
      { name: "description", content: "Aromas premium para casa e ambientes corporativos." },
      { property: "og:title", content: "Produtos — Gama Sensações" },
      { property: "og:description", content: "Aromas premium para casa e ambientes corporativos." },
    ],
  }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const { categoria } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [items, setItems] = useState<Prod[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: cs } = await supabase.from("categorias").select("id,nome,slug").eq("ativo", true).order("ordem");
      setCats((cs as Cat[]) ?? []);

      let q = supabase.from("produtos").select("*").eq("ativo", true).order("destaque", { ascending: false });
      if (categoria) {
        const cat = (cs as Cat[] | null)?.find((c) => c.slug === categoria);
        if (cat) q = q.eq("categoria_id", cat.id);
      }
      const { data } = await q;
      setItems((data as Prod[]) ?? []);
      setLoading(false);
    })();
  }, [categoria]);

  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <div className="container-editorial">
        <div className="max-w-2xl mb-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-4">— catálogo</p>
          <h1 className="font-display text-5xl md:text-6xl text-foreground">Produtos</h1>
        </div>

        {cats.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-12 pb-6 border-b border-border">
            <button
              onClick={() => navigate({ search: {} })}
              className={`px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${
                !categoria ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Todos
            </button>
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate({ search: { categoria: c.slug } })}
                className={`px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${
                  categoria === c.slug ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Em breve, novos produtos {categoria ? "nesta categoria" : ""}.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {items.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ p }: { p: Prod }) {
  const img = p.imagens?.[0];
  return (
    <Link to="/produto/$slug" params={{ slug: p.slug }} className="bg-background group flex flex-col">
      <div className="aspect-[4/5] bg-surface overflow-hidden relative">
        {img ? (
          <img src={img} alt={p.nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            sem imagem
          </div>
        )}
        {p.lancamento && (
          <span className="absolute top-4 left-4 bg-foreground text-background font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1">
            Lançamento
          </span>
        )}
      </div>
      <div className="p-6">
        <h3 className="font-display text-2xl text-foreground group-hover:text-gold transition-colors">{p.nome}</h3>
        {p.descricao_curta && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.descricao_curta}</p>}
        <p className="mt-4 font-display text-lg text-foreground">{brl(p.preco_varejo)}</p>
      </div>
    </Link>
  );
}
