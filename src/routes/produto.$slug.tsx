import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/slug";
import { ArrowLeft, MessageCircle } from "lucide-react";

type Prod = {
  id: string;
  nome: string;
  slug: string;
  descricao_curta: string | null;
  descricao: string | null;
  preco_varejo: number;
  preco_assinatura: number | null;
  imagens: string[] | null;
  volume: string | null;
  intensidade: number | null;
  sensacao_transmitida: string | null;
  durabilidade_media: string | null;
  notas_olfativas: string[] | null;
  composicao: string | null;
  modo_de_uso: string | null;
};

export const Route = createFileRoute("/produto/$slug")({
  head: () => ({
    meta: [
      { title: "Produto — Gama Sensações" },
      { name: "description", content: "Aromas premium Gama Sensações" },
    ],
  }),
  component: ProdutoPage,
});

function ProdutoPage() {
  const { slug } = Route.useParams();
  const [p, setP] = useState<Prod | null | undefined>(undefined);
  const [active, setActive] = useState(0);

  useEffect(() => {
    supabase
      .from("produtos")
      .select("*")
      .eq("slug", slug)
      .eq("ativo", true)
      .maybeSingle()
      .then(({ data }) => setP((data as Prod) ?? null));
  }, [slug]);

  if (p === undefined) return <div className="pt-40 pb-24 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (p === null) {
    return (
      <div className="pt-40 pb-24 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold mb-3">404</p>
        <h1 className="font-display text-4xl text-foreground mb-6">Produto não encontrado</h1>
        <Link to="/produtos" className="text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-gold">
          ← Ver todos os produtos
        </Link>
      </div>
    );
  }

  const phone = "5500000000000";
  const waMsg = encodeURIComponent(`Olá, tenho interesse no produto: ${p.nome}`);
  const waLink = `https://wa.me/${phone}?text=${waMsg}`;

  return (
    <div className="min-h-screen bg-background pt-28 pb-24">
      <div className="container-editorial">
        <Link to="/produtos" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-foreground/60 hover:text-gold mb-8">
          <ArrowLeft size={12} /> Catálogo
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <div className="aspect-[4/5] bg-surface overflow-hidden mb-3">
              {p.imagens?.[active] ? (
                <img src={p.imagens[active]} alt={p.nome} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  sem imagem
                </div>
              )}
            </div>
            {(p.imagens?.length ?? 0) > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {p.imagens!.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setActive(i)}
                    className={`aspect-square bg-surface overflow-hidden border ${i === active ? "border-foreground" : "border-transparent"}`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="font-display text-5xl text-foreground">{p.nome}</h1>
            {p.descricao_curta && <p className="mt-4 text-lg text-muted-foreground">{p.descricao_curta}</p>}

            <div className="mt-8 pb-8 border-b border-border">
              <p className="font-display text-4xl text-foreground">{brl(p.preco_varejo)}</p>
              {p.preco_assinatura && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Assinatura: <span className="text-gold font-medium">{brl(p.preco_assinatura)}</span>
                </p>
              )}
            </div>

            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center justify-center gap-3 w-full bg-foreground text-background py-4 text-xs uppercase tracking-[0.2em] hover:bg-gold transition-colors"
            >
              <MessageCircle size={16} /> Comprar pelo WhatsApp
            </a>

            {p.descricao && (
              <div className="mt-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold mb-3">— sobre</p>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{p.descricao}</p>
              </div>
            )}

            <div className="mt-10 grid grid-cols-2 gap-px bg-border">
              <Spec label="Volume" value={p.volume} />
              <Spec label="Durabilidade" value={p.durabilidade_media} />
              <Spec label="Sensação" value={p.sensacao_transmitida} />
              <Spec label="Intensidade" value={p.intensidade ? `${p.intensidade}/5` : null} />
            </div>

            {p.notas_olfativas?.length ? (
              <div className="mt-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold mb-3">— notas olfativas</p>
                <div className="flex flex-wrap gap-2">
                  {p.notas_olfativas.map((n) => (
                    <span key={n} className="border border-border px-3 py-1 text-xs text-foreground/80">{n}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {p.modo_de_uso && (
              <div className="mt-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold mb-3">— modo de uso</p>
                <p className="text-sm text-foreground/80 whitespace-pre-line">{p.modo_de_uso}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-background p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-foreground">{value ?? "—"}</p>
    </div>
  );
}
