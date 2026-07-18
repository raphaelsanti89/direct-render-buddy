import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/slug";
import { getPrecoForProfile } from "@/lib/preco";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";

type Cat = { id: string; nome: string; slug: string };
type Prod = {
  id: string;
  nome: string;
  slug: string;
  descricao_curta: string | null;
  descricao: string | null;
  sensacao_transmitida: string | null;
  preco_varejo: number;
  preco_assinatura: number | null;
  preco_b2b_1: number | null;
  preco_b2b_2: number | null;
  preco_b2b_3: number | null;
  imagens: string[] | null;
  categoria_id: string | null;
  destaque: boolean | null;
  lancamento: boolean | null;
  fornecedor: { nome: string | null } | null;
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
      { property: "og:url", content: "https://gamasensacoes.com.br/produtos" },
    ],
    links: [{ rel: "canonical", href: "https://gamasensacoes.com.br/produtos" }],
  }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const { categoria } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { profile } = useCurrentProfile();
  const [items, setItems] = useState<Prod[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: cs } = await supabase.from("categorias").select("id,nome,slug").eq("ativo", true).order("ordem");
      setCats((cs as Cat[]) ?? []);

      let query = supabase
        .from("produtos")
        .select("*, fornecedor:fornecedores(nome)")
        .eq("ativo", true)
        .order("destaque", { ascending: false });
      if (categoria) {
        const cat = (cs as Cat[] | null)?.find((c) => c.slug === categoria);
        if (cat) query = query.eq("categoria_id", cat.id);
      }
      const { data } = await query;
      setItems((data as unknown as Prod[]) ?? []);
      setLoading(false);
    })();
  }, [categoria]);

  const catById = new Map(cats.map((c) => [c.id, c.nome.toLowerCase()]));
  const term = q.trim().toLowerCase();
  const visibleItems = term
    ? items.filter((p) => {
        const catNome = p.categoria_id ? catById.get(p.categoria_id) ?? "" : "";
        return [
          p.nome,
          p.descricao_curta ?? "",
          p.descricao ?? "",
          p.sensacao_transmitida ?? "",
          p.fornecedor?.nome ?? "",
          catNome,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
    : items;

  return (
    <div className="min-h-screen bg-background pt-32 pb-24">
      <div className="container-editorial">
        <div className="max-w-2xl mb-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-4">— catálogo</p>
          <h1 className="font-display text-5xl md:text-6xl text-foreground">Produtos</h1>
        </div>

        <PriceBanner profile={profile} />

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
            {items.map((p) => <ProductCard key={p.id} p={p} profile={profile} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ p, profile }: { p: Prod; profile: ReturnType<typeof useCurrentProfile>["profile"] }) {
  const img = p.imagens?.[0];
  const preco = getPrecoForProfile(p, profile);
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
        {preco.badge && (
          <span className="absolute top-4 right-4 bg-gold text-foreground font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1">
            {preco.badge}
          </span>
        )}
      </div>
      <div className="p-6">
        <h3 className="font-display text-2xl text-foreground group-hover:text-gold transition-colors">{p.nome}</h3>
        {p.descricao_curta && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.descricao_curta}</p>}
        <div className="mt-4 flex items-baseline gap-3">
          <span className="font-display text-lg text-foreground">{brl(preco.valor)}</span>
          {preco.origem !== "varejo" && (
            <span className="text-xs text-muted-foreground line-through">{brl(preco.precoVarejoReferencia)}</span>
          )}
        </div>
        {preco.economiaPercentual && (
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-gold">
            economia de {preco.economiaPercentual}%
          </p>
        )}
      </div>
    </Link>
  );
}

function PriceBanner({ profile }: { profile: ReturnType<typeof useCurrentProfile>["profile"] }) {
  if (!profile) {
    return (
      <div className="mb-10 px-5 py-4 border border-border bg-surface text-sm text-foreground/75 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          É empresa ou quer condições especiais?
        </span>
        <Link to="/cadastro-b2b" className="text-gold uppercase tracking-[0.18em] text-xs hover:underline">
          Cadastro B2B
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link to="/cadastro-assinatura" className="text-gold uppercase tracking-[0.18em] text-xs hover:underline">
          Virar Assinante
        </Link>
      </div>
    );
  }
  if (profile.tipo_cliente === "b2b" && profile.status_aprovacao === "pendente") {
    return (
      <div className="mb-10 px-5 py-4 border border-gold/40 bg-gold/5 text-sm text-foreground/80">
        Sua solicitação B2B está <strong>em análise</strong>. Enquanto isso, você vê preços de varejo.
      </div>
    );
  }
  if (profile.tipo_cliente === "b2b" && profile.status_aprovacao === "rejeitado") {
    return (
      <div className="mb-10 px-5 py-4 border border-border bg-surface text-sm text-foreground/75">
        Sua solicitação B2B anterior não foi aprovada. Entre em contato pelo WhatsApp para reabrir o processo.
      </div>
    );
  }
  if (profile.tipo_cliente === "b2b" && profile.status_aprovacao === "aprovado") {
    return (
      <div className="mb-10 px-5 py-4 border border-gold/50 bg-gold/10 text-sm text-foreground">
        Você está vendo os <strong>preços B2B Nível {profile.nivel_b2b}</strong>.
      </div>
    );
  }
  if (profile.tipo_cliente === "assinante") {
    return (
      <div className="mb-10 px-5 py-4 border border-gold/50 bg-gold/10 text-sm text-foreground">
        Você está vendo os <strong>preços de Assinante</strong>.
      </div>
    );
  }
  return null;
}
