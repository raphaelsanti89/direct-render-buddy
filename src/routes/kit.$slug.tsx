import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/slug";
import { ArrowLeft, ShoppingBag, Minus, Plus } from "lucide-react";
import { getPrecoForProfile } from "@/lib/preco";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

type Kit = {
  id: string;
  nome: string;
  slug: string;
  descricao_curta: string | null;
  descricao: string | null;
  preco_varejo: number;
  preco_original: number;
  preco_assinatura: number | null;
  preco_b2b_1: number | null;
  preco_b2b_2: number | null;
  preco_b2b_3: number | null;
  percentual_economia: number | null;
  imagens: string[] | null;
};

const SITE_URL = "https://gamasensacoes.com.br";

export const Route = createFileRoute("/kit/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("kits")
      .select("nome, descricao_curta, descricao, imagens, slug")
      .eq("slug", params.slug)
      .eq("ativo", true)
      .maybeSingle();
    return { meta: data };
  },
  head: ({ loaderData, params }) => {
    const k = loaderData?.meta as
      | { nome: string; descricao_curta: string | null; descricao: string | null; imagens: string[] | null }
      | null
      | undefined;
    const title = k ? `${k.nome} | Kits Gama Sensações` : "Kit — Gama Sensações";
    const description =
      k?.descricao_curta ||
      (k?.descricao ? k.descricao.slice(0, 160) : "Kits sensoriais Gama Sensações — combinações exclusivas a preço especial.");
    const image = k?.imagens?.[0] || `${SITE_URL}/og-default.jpg`;
    const url = `${SITE_URL}/kit/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: KitPage,
});

function KitPage() {
  const { slug } = Route.useParams();
  const { profile } = useCurrentProfile();
  const { add } = useCart();
  const navigate = useNavigate();
  const [k, setK] = useState<Kit | null | undefined>(undefined);
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    supabase.from("kits").select("*").eq("slug", slug).eq("ativo", true).maybeSingle()
      .then(({ data }) => setK((data as Kit) ?? null));
  }, [slug]);

  if (k === undefined) return <div className="pt-40 pb-24 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (k === null) {
    return (
      <div className="pt-40 pb-24 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">404</p>
        <h1 className="font-display text-4xl text-foreground mb-6">Kit não encontrado</h1>
        <Link to="/kits" className="text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-gold">
          ← Ver todos os kits
        </Link>
      </div>
    );
  }

  const preco = getPrecoForProfile(k, profile);

  function handleAdd(goToCart: boolean) {
    add(
      {
        kind: "kit",
        id: k!.id,
        slug: k!.slug,
        nome: k!.nome,
        imagem: k!.imagens?.[0] ?? null,
        precos: {
          preco_varejo: k!.preco_varejo,
          preco_assinatura: k!.preco_assinatura,
          preco_b2b_1: k!.preco_b2b_1,
          preco_b2b_2: k!.preco_b2b_2,
          preco_b2b_3: k!.preco_b2b_3,
        },
      },
      qty,
    );
    toast.success(`Kit adicionado ao carrinho (${qty}x).`);
    if (goToCart) navigate({ to: "/carrinho" });
  }


  return (
    <div className="min-h-screen bg-background pt-28 pb-24">
      <div className="container-editorial">
        <Link to="/kits" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-gold mb-8">
          <ArrowLeft size={12} /> Kits
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <div className="aspect-[4/5] bg-surface overflow-hidden mb-3 relative">
              {k.imagens?.[active] ? (
                <img src={k.imagens[active]} alt={k.nome} className="w-full h-full object-cover" />
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
            {(k.imagens?.length ?? 0) > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {k.imagens!.map((src, i) => (
                  <button key={src} onClick={() => setActive(i)} className={`aspect-square bg-surface overflow-hidden border ${i === active ? "border-foreground" : "border-transparent"}`}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">— kit sensorial</p>
            <h1 className="font-display text-5xl text-foreground">{k.nome}</h1>
            {k.descricao_curta && <p className="mt-4 text-lg text-muted-foreground">{k.descricao_curta}</p>}

            <div className="mt-8 pb-8 border-b border-border">
              {preco.badge && (
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gold mb-2">
                  {preco.label}
                </p>
              )}
              <div className="flex items-baseline gap-4">
                <p className="font-display text-4xl text-foreground">{brl(preco.valor)}</p>
                {preco.origem !== "varejo" ? (
                  <p className="text-lg text-muted-foreground line-through">{brl(preco.precoVarejoReferencia)}</p>
                ) : k.preco_original > k.preco_varejo ? (
                  <p className="text-lg text-muted-foreground line-through">{brl(k.preco_original)}</p>
                ) : null}
              </div>
              {preco.economiaPercentual && (
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-gold">
                  Economia de {preco.economiaPercentual}% sobre o varejo
                </p>
              )}
              {!profile && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Empresa?{" "}
                  <Link to="/cadastro-b2b" className="text-gold hover:underline">
                    Solicite acesso B2B
                  </Link>
                  {" "}ou{" "}
                  <Link to="/cadastro-assinatura" className="text-gold hover:underline">
                    vire assinante
                  </Link>
                  .
                </p>
              )}
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center border border-border">
                <button type="button" aria-label="Diminuir" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-3 hover:bg-surface">
                  <Minus size={14} />
                </button>
                <span className="w-10 text-center font-mono text-sm">{qty}</span>
                <button type="button" aria-label="Aumentar" onClick={() => setQty((q) => q + 1)} className="px-3 py-3 hover:bg-surface">
                  <Plus size={14} />
                </button>
              </div>
              <button type="button" onClick={() => handleAdd(false)} className="flex-1 border border-foreground text-foreground py-4 text-xs uppercase tracking-[0.2em] hover:bg-foreground hover:text-background transition-colors">
                Adicionar
              </button>
            </div>
            <button type="button" onClick={() => handleAdd(true)} className="mt-3 inline-flex items-center justify-center gap-3 w-full bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em] hover:bg-gold transition-colors">
              <ShoppingBag size={16} /> Comprar agora
            </button>


            {k.descricao && (
              <div className="mt-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold mb-3">— o que contém</p>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{k.descricao}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
